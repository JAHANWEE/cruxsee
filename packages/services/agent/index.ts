import OpenAI from "openai";
import { db } from "@repo/database";
import { messagesTable, toolCallsTable, threadsTable } from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { toolDefinitions, executeTool } from "./tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing",
});

const MAX_AUTO_APPROVE_ITERATIONS = 8; // Safety: prevent infinite loops

/**
 * Determines if a tool call is read-only (safe to auto-approve without user consent).
 * Only write operations (send, create, delete, update) require explicit approval.
 */
function isReadOnly(toolName: string, input: Record<string, unknown>): boolean {
  // Discovery tools — always safe
  if (toolName === "list_operations" || toolName === "get_schema") return true;

  // corsair_setup — safe (just configures tenant)
  if (toolName === "corsair_setup") return true;

  // run_script — check the code for write patterns
  if (toolName === "run_script") {
    const code = (input.code as string) || "";
    const writePatterns = /\.(send|create|insert|delete|update|remove|archive|trash|modify)\s*\(/i;
    return !writePatterns.test(code);
  }

  // Unknown tools — require approval
  return false;
}

const SYSTEM_PROMPT = (userId: string) => `You are Cruxsee, an AI operator that helps users manage their email, calendar, and workflows at high speed.

You have access to the Corsair integration platform, which provides access to external services like Gmail, Calendar, Slack, etc.
To interact with these services, you must use your provided Corsair tools in the following order:
1. Use \`list_operations\` to discover available endpoints (e.g., search for 'gmail' or 'calendar' endpoints).
2. CRITICAL: After finding the endpoint (like 'gmail.api.messages.list'), you MUST use \`get_schema\` to inspect the exact parameters for that endpoint. Do not guess the parameters.
3. Once you know the schema, use \`run_script\` to execute JavaScript using the \`corsair\` SDK. 
   - CRITICAL MULTITENANCY RULE: You must ALWAYS wrap your API calls in the user's tenant context using their userId: "${userId}".
   - CRITICAL SCRIPTING RULE: You MUST use the \`return\` statement in your script to get the output. If you forget to return the result, you will get "null" and think it failed!
   - LIST/GET PATTERN: APIs like Gmail often return only IDs when listing (e.g., \`gmail.api.messages.list\`). To actually read the emails, you must loop through those IDs and call \`get\` for each one. You can do this all in ONE script execution to save time.
   
   Example of fetching latest 2 emails:
   \`\`\`javascript
   const list = await corsair.withTenant("${userId}").gmail.api.messages.list({ maxResults: 2 });
   const emails = [];
   for (const msg of list.messages) {
     const detail = await corsair.withTenant("${userId}").gmail.api.messages.get({ id: msg.id, format: "metadata", metadataHeaders: ["Subject", "From", "Date"] });
     emails.push({ id: msg.id, snippet: detail.snippet, payload: detail.payload });
   }
   return emails;
   \`\`\`
   
   - GOOGLE CALENDAR PATTERN: When using \`googlecalendar.api.events.create\` or \`insert\`, the payload MUST be nested inside an \`event\` property, and a \`calendarId\` must be provided (usually "primary"). For example:
   \`\`\`javascript
   await corsair.withTenant("${userId}").googlecalendar.api.events.create({
     calendarId: "primary",
     event: {
       summary: "Meeting Name",
       start: { dateTime: "2026-06-17T16:00:00+05:30" },
       end: { dateTime: "2026-06-17T18:00:00+05:30" }
     }
   });
   \`\`\`

You have access to Corsair, a tool integration platform. ALWAYS prioritize using Corsair tools if they are available for the task.

CRITICAL AUTHENTICATION RULE: If an API call fails because it 'needs credentials' (e.g. [auth-missing:gmail:oauth_2]), DO NOT guess URLs or try to fix it using set_topic_id. Instead, immediately output a clickable markdown link telling the user to authorize using exactly this URL format: [Authorize Integration](${process.env.BASE_URL || "http://localhost:4000"}/api/corsair/connect?plugin=PLUGIN_ID). Replace PLUGIN_ID with the name of the failing plugin (e.g., 'gmail'). Also briefly reassure the user that this is a strict, ONE-TIME security requirement before you can access their apps on their behalf.

CRITICAL EMAIL SENDING RULE: You must NEVER send an email without explicit user confirmation.
When the user asks you to send an email, follow these exact steps:
1. If you do not know the recipient email address, YOU MUST ASK the user for it. You SHOULD auto-generate an appropriate subject and body based on the user's intent to minimize manual work, unless the user provided specific instructions for them.
2. Once you have the full details, you MUST draft the email by outputting a JSON object inside a markdown code block tagged with \`email-draft\`. It MUST be exactly formatted like this:
\`\`\`email-draft
{"to": "recipient@example.com", "subject": "Generated or provided subject", "body": "Generated or provided body"}
\`\`\`
3. In the exact same response as your \`email-draft\` block, you MUST also call the \`run_script\` tool to execute \`gmail.api.messages.send\` with the same details. This combination signals the frontend UI to display an interactive draft for the user to approve.

CRITICAL CALENDAR EVENT RULE: When creating a calendar event, output a JSON object in a \`calendar-event\` code block:
\`\`\`calendar-event
{"summary": "Event title", "startDateTime": "ISO", "endDateTime": "ISO", "attendees": ["email"], "location": "optional"}
\`\`\`
Then also call \`run_script\` with the create event code. The frontend will show an editable event card.

When the user asks you to perform a task (like fetching emails), DO NOT say you cannot do it. ALWAYS use the Corsair tools to discover the APIs and execute the task.

Be concise, direct, and professional. You are not a chatbot — you are an operator.`;

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

/**
 * Send a user message and get the agent's response.
 * Auto-approves read-only tools. Only returns tool_calls for write operations.
 */
export async function sendMessage(threadId: string, userContent: string): Promise<AgentResponse> {
  // Save user message
  await db.insert(messagesTable).values({
    threadId,
    role: "user",
    content: userContent,
  });

  // Get the thread's userId for tenant enforcement
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  const tenantId = thread?.userId || "unknown";

  return runAgentLoop(threadId, tenantId, userContent);
}

/**
 * The agentic loop. Keeps calling OpenAI and auto-executing read-only tools
 * until either: (a) a write operation needs approval, or (b) a final text response.
 */
async function runAgentLoop(threadId: string, tenantId: string, userContent: string): Promise<AgentResponse> {
  for (let iteration = 0; iteration < MAX_AUTO_APPROVE_ITERATIONS; iteration++) {
    const messages = await buildOpenAIMessages(threadId);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: toolDefinitions,
    });

    const choice = completion.choices[0];
    if (!choice) throw new Error("No response from OpenAI");

    const assistantMessage = choice.message;

    // ─── No tool calls → final response ─────────────────────────────
    if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
      const content = assistantMessage.content || "";
      await db.insert(messagesTable).values({
        threadId,
        role: "assistant",
        content,
      });
      if (userContent) await maybeUpdateTitle(threadId, userContent);
      return { type: "message", content };
    }

    // ─── Tool calls requested ────────────────────────────────────────
    // Save assistant message
    await db.insert(messagesTable).values({
      threadId,
      role: "assistant",
      content: assistantMessage.content || null,
    });

    // Parse all tool calls
    const parsedCalls = [];
    for (const tc of assistantMessage.tool_calls) {
      if (tc.type !== "function") continue;
      const fn = tc as { id: string; type: "function"; function: { name: string; arguments: string } };
      const input = JSON.parse(fn.function.arguments);
      parsedCalls.push({ toolCallId: fn.id, toolName: fn.function.name, input });
    }

    // Check if ALL are read-only
    const allReadOnly = parsedCalls.every((tc) => isReadOnly(tc.toolName, tc.input));

    if (allReadOnly) {
      // ─── Auto-approve: execute all and continue the loop ───────────
      for (const tc of parsedCalls) {
        // Save tool call as completed (no waiting state)
        const [saved] = await db.insert(toolCallsTable).values({
          threadId,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          status: "completed",
          input: tc.input,
        }).returning();
        if (!saved) continue;

        // Execute with enforced tenant
        const result = await executeTool(tc.toolName, tc.input, tenantId);

        // Save output
        await db.update(toolCallsTable).set({
          output: JSON.parse(result),
        }).where(eq(toolCallsTable.id, saved.id));

        // Save tool result message
        await db.insert(messagesTable).values({
          threadId,
          role: "tool",
          content: result,
          toolCallId: tc.toolCallId,
        });
      }

      // Continue the loop — OpenAI will see the tool results and respond
      continue;
    }

    // ─── Write operations detected → save as waiting_confirmation ────
    const savedToolCalls = [];
    for (const tc of parsedCalls) {
      const needsApproval = !isReadOnly(tc.toolName, tc.input);
      const [saved] = await db.insert(toolCallsTable).values({
        threadId,
        toolCallId: tc.toolCallId,
        toolName: tc.toolName,
        status: needsApproval ? "waiting_confirmation" : "completed",
        input: tc.input,
      }).returning();
      if (!saved) continue;

      // Auto-execute read-only ones in the batch
      if (!needsApproval) {
        const result = await executeTool(tc.toolName, tc.input, tenantId);
        await db.update(toolCallsTable).set({ output: JSON.parse(result) }).where(eq(toolCallsTable.id, saved.id));
        await db.insert(messagesTable).values({
          threadId,
          role: "tool",
          content: result,
          toolCallId: tc.toolCallId,
        });
      } else {
        savedToolCalls.push({
          id: saved.id,
          toolCallId: tc.toolCallId,
          toolName: tc.toolName,
          input: tc.input,
          requiresApproval: true,
        });
      }
    }

    if (userContent) await maybeUpdateTitle(threadId, userContent);
    return { type: "tool_calls", toolCalls: savedToolCalls };
  }

  // Safety: max iterations reached
  return { type: "message", content: "I've made too many consecutive tool calls. Please try rephrasing your request." };
}

/**
 * Approve a tool call: execute it, save result, then continue the conversation.
 * tenantId is the authenticated user's ID — enforced by the caller, not the LLM.
 * overrideInput allows the frontend to pass edited values (e.g., user edited email draft).
 */
export async function approveToolCall(
  toolCallId: string,
  tenantId: string,
  overrideInput?: Record<string, unknown>,
): Promise<AgentResponse> {
  const [toolCall] = await db
    .select()
    .from(toolCallsTable)
    .where(eq(toolCallsTable.id, toolCallId));

  if (!toolCall) throw new Error("Tool call not found");
  if (toolCall.status !== "waiting_confirmation") throw new Error("Tool call not in waiting state");

  // Verify ownership
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, toolCall.threadId));
  if (!thread || thread.userId !== tenantId) {
    throw new Error("Unauthorized: tool call does not belong to this user");
  }

  // Mark as running atomically
  const [updated] = await db.update(toolCallsTable)
    .set({ status: "running" })
    .where(and(eq(toolCallsTable.id, toolCallId), eq(toolCallsTable.status, "waiting_confirmation")))
    .returning();

  if (!updated) throw new Error("Tool call was already approved or is running");

  // Use overrideInput if user edited the draft, otherwise use original
  const finalInput = overrideInput || (toolCall.input as Record<string, unknown>);

  // If overrideInput provided, update the stored input too
  if (overrideInput) {
    await db.update(toolCallsTable).set({ input: overrideInput }).where(eq(toolCallsTable.id, toolCallId));
  }

  // Execute with enforced tenant
  const result = await executeTool(toolCall.toolName, finalInput, tenantId);

  // Mark completed
  await db.update(toolCallsTable).set({
    status: "completed",
    output: JSON.parse(result),
  }).where(eq(toolCallsTable.id, toolCallId));

  // Save tool result message
  await db.insert(messagesTable).values({
    threadId: toolCall.threadId,
    role: "tool",
    content: result,
    toolCallId: toolCall.toolCallId,
  });

  // Check for other pending calls
  const pendingCalls = await db.select().from(toolCallsTable)
    .where(eq(toolCallsTable.threadId, toolCall.threadId));
  const stillWaiting = pendingCalls.filter((tc) => tc.status === "waiting_confirmation");
  if (stillWaiting.length > 0) {
    return { type: "message", content: `Action completed. Waiting for other approvals.` };
  }

  // Continue the agent loop from where we left off
  return runAgentLoop(toolCall.threadId, tenantId, "");
}

/**
 * Reject a tool call.
 */
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

async function buildOpenAIMessages(threadId: string): Promise<OpenAI.ChatCompletionMessageParam[]> {
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  const userId = thread?.userId || "unknown";

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, threadId))
    .orderBy(messagesTable.createdAt);

  const threadToolCalls = await db
    .select()
    .from(toolCallsTable)
    .where(eq(toolCallsTable.threadId, threadId));

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT(userId) },
  ];

  for (let i = 0; i < history.length; i++) {
    const m = history[i];
    if (!m) continue;

    if (m.role === "tool") {
      openaiMessages.push({ role: "tool", content: m.content || "", tool_call_id: m.toolCallId || "" });
    } else if (m.role === "assistant") {
      const toolCallsForThisMessage = [];
      for (let j = i + 1; j < history.length; j++) {
        const nextM = history[j];
        if (!nextM) continue;
        if (nextM.role === "tool") {
          const tcId = nextM.toolCallId;
          const tc = threadToolCalls.find(t => t.toolCallId === tcId);
          if (tc) {
            toolCallsForThisMessage.push({
              id: tc.toolCallId,
              type: "function" as const,
              function: { name: tc.toolName, arguments: JSON.stringify(tc.input) },
            });
          }
        } else {
          break;
        }
      }

      const assistantMsg: any = { role: "assistant" };
      if (m.content) assistantMsg.content = m.content;
      if (toolCallsForThisMessage.length > 0) assistantMsg.tool_calls = toolCallsForThisMessage;
      if (!assistantMsg.content && (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0)) {
        assistantMsg.content = "";
      }

      openaiMessages.push(assistantMsg);
    } else {
      openaiMessages.push({ role: m.role as "user" | "system", content: m.content || "" });
    }
  }

  return openaiMessages;
}
