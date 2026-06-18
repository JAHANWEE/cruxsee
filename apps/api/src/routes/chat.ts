import { Router } from "express";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, convertToModelMessages, stepCountIs } from "ai";
import { createVercelAiMcpClient } from "@corsair-dev/mcp";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { logger } from "@repo/logger";
import { db } from "@repo/database";
import { messagesTable, threadsTable } from "@repo/database/schema";
import { eq } from "@repo/database";
import { cache } from "../cache";

export const chatRouter = Router();

// Fast model (Groq) — routing + short conversational replies
const fast = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

// Writer model (GPT-4.1-mini) — email drafting, tool execution
const writer = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── PROMPTS ───

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
- For CALENDAR_CREATE: sufficient=true ONLY if event title AND date/time are EXPLICITLY mentioned (e.g. "today", "tomorrow", "June 20", "at 3pm"). If no date or time is mentioned at all, sufficient=false.
- For READ/GREETING/ABOUT/GENERAL: always sufficient=true
Output only the JSON. No explanation.`;

const FAST_PROMPT = `You are Cruxsee — a blazing-fast AI operator for email and calendar.
Today's date is ${new Date().toISOString().split("T")[0]}.
Keep responses SHORT (1-2 sentences max). Be direct, warm, confident.
If user asks what you can do: "I can send emails, read your inbox, manage your calendar — all through chat. Just tell me what you need."
If user wants to send email but hasn't said who/what: ask BOTH in one short question.
If user wants to create a calendar event but hasn't said when: ask "When should I schedule it?" in one short question.
If user says "yes"/"send it"/"do it" to confirm an action: respond with "Done."`;

const WRITER_PROMPT = `You are Cruxsee — a world-class email copywriter.
Given the conversation context, draft the email NOW. Do not ask questions — you have enough info.
Rules:
- Write naturally, match the tone to the context (casual for friends, professional for work)
- Generate a clear, compelling subject line
- Body should be well-written, appropriate length (not too short, not too long)
- Output ONLY the action block, no other text before or after:

\`\`\`email-action
{"to":"email@example.com","subject":"Subject line","body":"Full email body here"}
\`\`\``;

const CALENDAR_PROMPT = () => {
  const today = new Date().toISOString().split("T")[0]; // "2026-06-18"
  return `You are Cruxsee — a calendar scheduling assistant.
Given the conversation context, create the calendar event NOW. Do not ask questions — you have enough info.
Rules:
- Today's date is ${today}. Use this as reference for "today", "tomorrow", etc.
- Parse the date/time from conversation. If no time given, default to 10:00 AM, 1 hour duration.
- If no date given, use today: ${today}.
- If user says "tomorrow", use the day after ${today}.
- Use ISO 8601 format for start/end times (e.g. ${today}T10:00:00).
- Output ONLY the action block, no other text before or after:

\`\`\`calendar-action
{"summary":"Event title","start":"${today}T10:00:00","end":"${today}T11:00:00","description":"Optional description","guests":["email@example.com"]}
\`\`\``;
};

const TOOL_PROMPT = `You are Cruxsee. Use run_script to execute operations. Be brief with results.

# READ EMAILS
run_script: const list = await corsair.gmail.api.messages.list({ maxResults: 5 }); const results = []; for (const m of (list.messages || [])) { const full = await corsair.gmail.api.messages.get({ id: m.id }); results.push({ id: full.id, snippet: full.snippet, from: (full.payload?.headers || []).find(h => h.name === "From")?.value, subject: (full.payload?.headers || []).find(h => h.name === "Subject")?.value, date: (full.payload?.headers || []).find(h => h.name === "Date")?.value }); } return results;

# CALENDAR READ
run_script: return await corsair.googlecalendar.api.events.getMany({ timeMin: new Date().toISOString(), timeMax: new Date(Date.now()+7*86400000).toISOString(), singleEvents: true, orderBy: "startTime" });

Present results as a clean list. Mark done when complete.`;

// ─── MCP Client Cache ───
const mcpClients = new Map<string, { client: Awaited<ReturnType<typeof createVercelAiMcpClient>>; ts: number }>();

async function getMcpClient(tenantId: string) {
  const existing = mcpClients.get(tenantId);
  if (existing && Date.now() - existing.ts < 300_000) return existing.client;

  // Close stale client
  if (existing) {
    await existing.client.close?.().catch(() => {});
    mcpClients.delete(tenantId);
  }

  const port = process.env.PORT || 4000;
  const client = await createVercelAiMcpClient({
    url: `http://localhost:${port}/mcp/${tenantId}`,
  });
  mcpClients.set(tenantId, { client, ts: Date.now() });
  return client;
}

// ─── Stream helper ───
async function streamToResponse(result: any, res: any, threadId?: string) {
  try {
    const response = result.toUIMessageStreamResponse();
    res.status(response.status);
    response.headers.forEach((v: string, k: string) => res.setHeader(k, v));
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
  } catch (e) {
    logger.error("[stream] error:", e);
  } finally {
    res.end();
  }

  // Persist assistant response async (don't block the stream)
  result.text
    .then(async (text: string) => {
      if (threadId && text) {
        await db.insert(messagesTable).values({
          threadId,
          role: "assistant",
          content: text,
        });
        // Invalidate messages cache for this thread
        // We don't know userId here, but delPattern works with threadId
        await cache.del(`msgs:*:${threadId}`).catch(() => {});
        await cache.delPattern(`msgs:*:${threadId}`).catch(() => {});
      }
    })
    .catch((err: any) => logger.error("[db] error persisting assistant message:", err));
}

const chatRequestSchema = z.object({
  messages: z.array(z.any()).min(1),
  threadId: z.string().uuid().optional(),
});

// ─── MAIN HANDLER ───
chatRouter.post("/", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
    return;
  }
  const { messages, threadId } = parsed.data;

  // Persist user message
  const lastMsg = messages[messages.length - 1];
  if (threadId && lastMsg?.role === "user") {
    const textPart = lastMsg.parts?.find((p: any) => p.type === "text") as any;
    const content = textPart?.text || (typeof lastMsg.content === "string" ? lastMsg.content : "");
    if (content) {
      await db
        .insert(messagesTable)
        .values({ threadId, role: "user", content })
        .catch((err: any) => logger.error("[db] error persisting user message:", err));

      // Auto-update thread title if it's still "New conversation"
      const [thread] = await db
        .select()
        .from(threadsTable)
        .where(eq(threadsTable.id, threadId));
      if (thread && (thread.title === "New conversation" || thread.title === "New Thread")) {
        const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
        await db.update(threadsTable).set({ title }).where(eq(threadsTable.id, threadId));
      }
    }
  }

  try {
    const modelMessages = await convertToModelMessages(messages as any);

    // Step 1: Route (Groq, ~200ms)
    const { text: routerResponse } = await generateText({
      model: fast.chat("llama-3.3-70b-versatile"),
      system: ROUTER_PROMPT,
      messages: modelMessages,
    });

    let intent = "GENERAL";
    let sufficient = true;
    try {
      const parsed = JSON.parse(routerResponse.trim());
      intent = parsed.intent || "GENERAL";
      sufficient = parsed.sufficient !== false;
    } catch {
      intent = "GENERAL";
    }

    logger.info("[chat] intent:", intent, "sufficient:", sufficient);

    // Step 2: Handle based on intent + sufficiency

    // Greetings, about, or insufficient info -> fast model
    if (intent === "GREETING" || intent === "ABOUT" || !sufficient) {
      const result = streamText({
        model: fast.chat("llama-3.3-70b-versatile"),
        system: FAST_PROMPT,
        messages: modelMessages,
      });
      await streamToResponse(result, res, threadId);
      return;
    }

    // Send email with sufficient info -> writer drafts
    if (intent === "SEND_EMAIL") {
      const result = streamText({
        model: writer("gpt-4.1-mini"),
        system: WRITER_PROMPT,
        messages: modelMessages,
      });
      await streamToResponse(result, res, threadId);
      return;
    }

    // Read operations -> writer + MCP tools
    if (intent === "READ_EMAIL" || intent === "CALENDAR_READ") {
      const client = await getMcpClient(session.user.id);
      const tools = await client.tools();
      const result = streamText({
        model: writer("gpt-4.1-mini"),
        system: TOOL_PROMPT,
        messages: modelMessages,
        tools,
        stopWhen: stepCountIs(10),
      });
      await streamToResponse(result, res, threadId);
      return;
    }

    // Calendar create with sufficient info -> writer drafts event
    if (intent === "CALENDAR_CREATE") {
      const result = streamText({
        model: writer("gpt-4.1-mini"),
        system: CALENDAR_PROMPT(),
        messages: modelMessages,
      });
      await streamToResponse(result, res, threadId);
      return;
    }

    // GENERAL fallback -> writer with tools
    const client = await getMcpClient(session.user.id);
    const tools = await client.tools();
    const result = streamText({
      model: writer("gpt-4.1-mini"),
      system: FAST_PROMPT + "\n\nYou also have tools: run_script for Gmail/Calendar operations.",
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(10),
    });
    await streamToResponse(result, res, threadId);
  } catch (err: any) {
    logger.error("[chat] error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Chat failed" });
  }
});
