import OpenAI from "openai";
import { db } from "@repo/database";
import { messagesTable, toolCallsTable, threadsTable } from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { toolDefinitions, executeTool } from "./tools";

// ─── Clients ─────────────────────────────────────────────────────────────

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing",
  baseURL: "https://api.groq.com/openai/v1",
});

const gpt = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing",
});

// ─── Router Prompt (Groq — ultra-fast classification) ────────────────────

const ROUTER_PROMPT = `You are a message classifier. Read the FULL conversation and classify the user's LAST message.
Output EXACTLY one JSON object: {"intent":"LABEL","sufficient":true/false}
Labels:
- GREETING: "hi", "hey", "hello", "thanks", "ok", "yes", "no" (single word pleasantries)
- ABOUT: questions about the AI itself, capabilities, help
- SEND_EMAIL: user wants to send/draft/compose an email
- READ_EMAIL: user wants to read/check/fetch emails
- CALENDAR_READ: wants to check schedule/events
- CALENDAR_CREATE: wants to create/book an event
- GENERAL: anything else
"sufficient" = does the conversation contain enough info to ACT?
- For SEND_EMAIL: sufficient=true ONLY if recipient AND purpose/topic are both known from the conversation
- For CALENDAR_CREATE: sufficient=true ONLY if event title AND date/time are known
- For READ/GREETING/ABOUT/GENERAL: always sufficient=true
Output only the JSON. No explanation.`;

// ─── Fast Conversational Prompt (Groq — no GPT tokens wasted) ────────────

const CONVERSATIONAL_PROMPT = `You are Cruxsee — a blazing-fast AI operator for email and calendar.
Keep responses SHORT (1-2 sentences max). Be direct, warm, confident.
If user asks what you can do: "I can send emails, read your inbox, manage your calendar — all through chat. Just tell me what you need."
If user wants to send email but hasn't said who/what: ask BOTH recipient and purpose in one short question.
If user wants to create an event but hasn't said what/when: ask title and time in one short question.
If user says "yes"/"send it"/"do it" to confirm an action: respond with "✓ Done."
Never be verbose. Never explain how you work internally.`;

// ─── Email Writer Prompt (GPT — quality writing) ─────────────────────────

const EMAIL_WRITER_PROMPT = `You are Cruxsee — a world-class email copywriter.
Given the conversation context, draft the email NOW. Do not ask questions — you have enough info.
Rules:
- Write naturally, match the tone to the context (casual for friends, professional for work)
- Generate a clear, compelling subject line
- Body should be well-written, appropriate length (not too short, not too long)
- Output ONLY the action block, no other text before or after:
\`\`\`email-action
{"to":"email@example.com","subject":"Subject line","body":"Full email body here"}
\`\`\``;

// ─── Calendar Writer Prompt (GPT — smart scheduling) ─────────────────────

const CALENDAR_WRITER_PROMPT = `You are Cruxsee — a calendar scheduling assistant.
Given the conversation context, create the calendar event NOW. Do not ask questions — you have enough info.
Rules:
- Parse the date/time from conversation. If no time given, default to 10:00 AM, 1 hour duration.
- If no date given, assume today or next occurrence of the day mentioned.
- Use ISO 8601 format for start/end times with timezone offset.
- Output ONLY the action block, no other text before or after:
\`\`\`calendar-action
{"summary":"Event title","start":"2026-06-18T10:00:00+05:30","end":"2026-06-18T11:00:00+05:30","description":"Optional description","guests":["email@example.com"]}
\`\`\``;

// ─── Tool Execution Prompt (GPT via Corsair MCP) ─────────────────────────

const TOOL_EXECUTION_PROMPT = (userId: string) => `You are Cruxsee. Use run_script to execute operations via Corsair. Be brief with results.

CRITICAL: Always use corsair.withTenant("${userId}") for all API calls.

# READ EMAILS
run_script: const list = await corsair.withTenant("${userId}").gmail.api.messages.list({ maxResults: 5 }); const results = []; for (const m of (list.messages || [])) { const full = await corsair.withTenant("${userId}").gmail.api.messages.get({ id: m.id }); results.push({ id: full.id, snippet: full.snippet, from: (full.payload?.headers || []).find(h => h.name === "From")?.value, subject: (full.payload?.headers || []).find(h => h.name === "Subject")?.value, date: (full.payload?.headers || []).find(h => h.name === "Date")?.value }); } return results;

# CALENDAR READ
run_script: return await corsair.withTenant("${userId}").googlecalendar.api.events.getMany({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now()+7*86400000).toISOString(), singleEvents: true, orderBy: "startTime" });

Present results as a clean, readable list. Add ✓ when done.

AUTHENTICATION RULE: If an API call fails with [auth-missing:...], output: "You need to connect this service first. Click the link below:" followed by a markdown link: [Connect Gmail](${process.env.BASE_URL || "http://localhost:4000"}/api/corsair/connect?plugin=PLUGIN_ID)`;

// ─── Types ───────────────────────────────────────────────────────────────

interface RouterResult {
  intent: string;
  sufficient: boolean;
}

export interface AgentResponse {
  type: "message" | "tool_calls";
  content?: string;
  toolCalls?: Array<{
    id: string;
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
    requiresApproval: boolean;
  }>;
}

// ─── Main Entry Point ────────────────────────────────────────────────────

export async function sendMessage(threadId: string, userContent: string): Promise<AgentResponse> {
  // Save user message
  await db.insert(messagesTable).values({
    threadId,
    role: "user",
    content: userContent,
  });

  // Get thread context
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  const tenantId = thread?.userId || "unknown";

  // Load recent conversation for context
  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.threadId, threadId))
    .orderBy(messagesTable.createdAt);

  const conversationContext = history.slice(-10).map(m => ({
    role: m.role as string,
    content: m.content || "",
  }));

  // ─── Step 1: Route (Groq — fast) ────────────────────────────────────
  const route = await classifyIntent(conversationContext);

  // ─── Step 2: Dispatch based on intent ───────────────────────────────
  let response: string;

  switch (route.intent) {
    case "GREETING":
    case "ABOUT":
    case "GENERAL":
      response = await handleConversational(conversationContext);
      break;

    case "SEND_EMAIL":
      if (!route.sufficient) {
        response = await handleConversational(conversationContext);
      } else {
        response = await handleEmailWrite(conversationContext);
      }
      break;

    case "CALENDAR_CREATE":
      if (!route.sufficient) {
        response = await handleConversational(conversationContext);
      } else {
        response = await handleCalendarWrite(conversationContext);
      }
      break;

    case "READ_EMAIL":
      return await handleToolExecution(threadId, tenantId, "READ_EMAIL", userContent);

    case "CALENDAR_READ":
      return await handleToolExecution(threadId, tenantId, "CALENDAR_READ", userContent);

    default:
      response = await handleConversational(conversationContext);
  }

  // ─── Step 3: Check if response contains an action block ─────────────
  const emailAction = response.match(/```email-action\s*\n([\s\S]*?)\n```/);
  const calendarAction = response.match(/```calendar-action\s*\n([\s\S]*?)\n```/);

  if (emailAction && emailAction[1]) {
    // Save assistant message and create a tool call for email send
    await db.insert(messagesTable).values({ threadId, role: "assistant", content: response });
    const emailData = JSON.parse(emailAction[1]);
    const code = `const raw = btoa("To: ${emailData.to}\\r\\nSubject: ${emailData.subject}\\r\\nContent-Type: text/plain; charset=UTF-8\\r\\n\\r\\n${emailData.body.replace(/\n/g, "\\n").replace(/"/g, '\\"')}").replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,""); return await corsair.withTenant("${tenantId}").gmail.api.messages.send({ raw });`;

    const [saved] = await db.insert(toolCallsTable).values({
      threadId,
      toolCallId: `email_send_${Date.now()}`,
      toolName: "run_script",
      status: "waiting_confirmation",
      input: { code },
    }).returning();

    await maybeUpdateTitle(threadId, userContent);

    return {
      type: "tool_calls",
      toolCalls: saved ? [{
        id: saved.id,
        toolCallId: saved.toolCallId,
        toolName: "run_script",
        input: { code, _emailMeta: emailData },
        requiresApproval: true,
      }] : [],
    };
  }

  if (calendarAction && calendarAction[1]) {
    await db.insert(messagesTable).values({ threadId, role: "assistant", content: response });
    const eventData = JSON.parse(calendarAction[1]);
    const guests = eventData.guests?.map((e: string) => `{ email: "${e}" }`).join(", ") || "";
    const code = `return await corsair.withTenant("${tenantId}").googlecalendar.api.events.create({ calendarId: "primary", event: { summary: "${eventData.summary}", start: { dateTime: "${eventData.start}" }, end: { dateTime: "${eventData.end}" }${eventData.description ? `, description: "${eventData.description}"` : ""}${guests ? `, attendees: [${guests}]` : ""} } });`;

    const [saved] = await db.insert(toolCallsTable).values({
      threadId,
      toolCallId: `cal_create_${Date.now()}`,
      toolName: "run_script",
      status: "waiting_confirmation",
      input: { code, _calendarMeta: eventData },
    }).returning();

    await maybeUpdateTitle(threadId, userContent);

    return {
      type: "tool_calls",
      toolCalls: saved ? [{
        id: saved.id,
        toolCallId: saved.toolCallId,
        toolName: "run_script",
        input: { code, _calendarMeta: eventData },
        requiresApproval: true,
      }] : [],
    };
  }

  // Plain text response — save and return
  await db.insert(messagesTable).values({ threadId, role: "assistant", content: response });
  await maybeUpdateTitle(threadId, userContent);
  return { type: "message", content: response };
}

// ─── Handlers ────────────────────────────────────────────────────────────

async function classifyIntent(conversation: { role: string; content: string }[]): Promise<RouterResult> {
  try {
    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: ROUTER_PROMPT },
        ...conversation.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      temperature: 0,
      max_tokens: 50,
    });
    const text = res.choices[0]?.message.content?.trim() || "";
    return JSON.parse(text);
  } catch {
    return { intent: "GENERAL", sufficient: true };
  }
}

async function handleConversational(conversation: { role: string; content: string }[]): Promise<string> {
  const res = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: CONVERSATIONAL_PROMPT },
      ...conversation.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 150,
  });
  return res.choices[0]?.message.content?.trim() || "How can I help?";
}

async function handleEmailWrite(conversation: { role: string; content: string }[]): Promise<string> {
  const res = await gpt.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EMAIL_WRITER_PROMPT },
      ...conversation.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  return res.choices[0]?.message.content?.trim() || "";
}

async function handleCalendarWrite(conversation: { role: string; content: string }[]): Promise<string> {
  const res = await gpt.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: CALENDAR_WRITER_PROMPT },
      ...conversation.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    ],
    temperature: 0.3,
    max_tokens: 300,
  });
  return res.choices[0]?.message.content?.trim() || "";
}

async function handleToolExecution(threadId: string, tenantId: string, intent: string, userContent: string): Promise<AgentResponse> {
  const messages = await buildOpenAIMessages(threadId, tenantId);

  const completion = await gpt.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: toolDefinitions,
  });

  const choice = completion.choices[0];
  if (!choice) throw new Error("No response from GPT");

  const assistantMessage = choice.message;

  // If tool calls — auto-execute read operations
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    await db.insert(messagesTable).values({ threadId, role: "assistant", content: assistantMessage.content || null });

    for (const tc of assistantMessage.tool_calls) {
      if (tc.type !== "function") continue;
      const fn = tc as { id: string; type: "function"; function: { name: string; arguments: string } };
      const input = JSON.parse(fn.function.arguments);

      // Auto-execute (reads are always safe)
      const [saved] = await db.insert(toolCallsTable).values({
        threadId,
        toolCallId: fn.id,
        toolName: fn.function.name,
        status: "completed",
        input,
      }).returning();
      if (!saved) continue;

      const result = await executeTool(fn.function.name, input, tenantId);
      await db.update(toolCallsTable).set({ output: JSON.parse(result) }).where(eq(toolCallsTable.id, saved.id));
      await db.insert(messagesTable).values({ threadId, role: "tool", content: result, toolCallId: fn.id });
    }

    // Get final response after tool execution
    const followUp = await buildOpenAIMessages(threadId, tenantId);
    const final = await gpt.chat.completions.create({ model: "gpt-4o-mini", messages: followUp });
    const content = final.choices[0]?.message.content || "Done.";
    await db.insert(messagesTable).values({ threadId, role: "assistant", content });
    await maybeUpdateTitle(threadId, userContent);
    return { type: "message", content };
  }

  // Plain response
  const content = assistantMessage.content || "";
  await db.insert(messagesTable).values({ threadId, role: "assistant", content });
  await maybeUpdateTitle(threadId, userContent);
  return { type: "message", content };
}

// ─── Approve / Reject ────────────────────────────────────────────────────

export async function approveToolCall(
  toolCallId: string,
  tenantId: string,
  overrideInput?: Record<string, unknown>,
): Promise<AgentResponse> {
  const [toolCall] = await db.select().from(toolCallsTable).where(eq(toolCallsTable.id, toolCallId));
  if (!toolCall) throw new Error("Tool call not found");
  if (toolCall.status !== "waiting_confirmation") throw new Error("Tool call not in waiting state");

  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, toolCall.threadId));
  if (!thread || thread.userId !== tenantId) throw new Error("Unauthorized");

  const [updated] = await db.update(toolCallsTable)
    .set({ status: "running" })
    .where(and(eq(toolCallsTable.id, toolCallId), eq(toolCallsTable.status, "waiting_confirmation")))
    .returning();
  if (!updated) throw new Error("Tool call was already approved");

  const finalInput = overrideInput || (toolCall.input as Record<string, unknown>);
  if (overrideInput) {
    await db.update(toolCallsTable).set({ input: overrideInput }).where(eq(toolCallsTable.id, toolCallId));
  }

  const result = await executeTool(toolCall.toolName, finalInput, tenantId);

  await db.update(toolCallsTable).set({ status: "completed", output: JSON.parse(result) }).where(eq(toolCallsTable.id, toolCallId));
  await db.insert(messagesTable).values({ threadId: toolCall.threadId, role: "tool", content: result, toolCallId: toolCall.toolCallId });

  // Generate a brief confirmation via Groq (fast)
  const confirmation = result.includes("error")
    ? `Something went wrong: ${JSON.parse(result).error || "Unknown error"}`
    : "✓ Done.";

  await db.insert(messagesTable).values({ threadId: toolCall.threadId, role: "assistant", content: confirmation });
  return { type: "message", content: confirmation };
}

export async function rejectToolCall(toolCallId: string): Promise<void> {
  await db.update(toolCallsTable).set({ status: "failed" }).where(eq(toolCallsTable.id, toolCallId));
}

// ─── Helpers ─────────────────────────────────────────────────────────────

async function maybeUpdateTitle(threadId: string, firstMessage: string) {
  if (!firstMessage) return;
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  if (thread && thread.title === "New Thread") {
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : "");
    await db.update(threadsTable).set({ title }).where(eq(threadsTable.id, threadId));
  }
}

async function buildOpenAIMessages(threadId: string, userId: string): Promise<OpenAI.ChatCompletionMessageParam[]> {
  const history = await db.select().from(messagesTable)
    .where(eq(messagesTable.threadId, threadId))
    .orderBy(messagesTable.createdAt);

  const threadToolCalls = await db.select().from(toolCallsTable)
    .where(eq(toolCallsTable.threadId, threadId));

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: TOOL_EXECUTION_PROMPT(userId) },
  ];

  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (!m) continue;

    if (m.role === "tool") {
      messages.push({ role: "tool", content: m.content || "", tool_call_id: m.toolCallId || "" });
    } else if (m.role === "assistant") {
      const toolCallsForMsg = [];
      for (let j = i + 1; j < history.length; j++) {
        const next = history[j];
        if (!next) continue;
        if (next.role === "tool") {
          const tc = threadToolCalls.find(t => t.toolCallId === next.toolCallId);
          if (tc) toolCallsForMsg.push({ id: tc.toolCallId, type: "function" as const, function: { name: tc.toolName, arguments: JSON.stringify(tc.input) } });
        } else break;
      }
      const msg: any = { role: "assistant" };
      if (m.content) msg.content = m.content;
      if (toolCallsForMsg.length > 0) msg.tool_calls = toolCallsForMsg;
      if (!msg.content && !msg.tool_calls?.length) msg.content = "";
      messages.push(msg);
    } else {
      messages.push({ role: m.role as "user" | "system", content: m.content || "" });
    }
  }

  return messages;
}
