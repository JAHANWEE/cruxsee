import OpenAI from "openai";
import { db } from "@repo/database";
import { messagesTable, toolCallsTable, threadsTable } from "@repo/database/schema";
import { eq } from "@repo/database";
import { toolDefinitions, executeTool } from "./tools";

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const SYSTEM_PROMPT = `You are Cruxsee, an AI operator that helps users manage their email, calendar, and workflows at high speed.

You have access to tools. When a user asks you to do something that requires a tool, call the appropriate tool function. Do NOT make up information — always use tools for actions.

Be concise, direct, and professional. You are not a chatbot — you are an operator.`;

export interface AgentResponse {
  type: "message" | "tool_calls";
  content?: string;
  toolCalls?: Array<{
    id: string;
    toolCallId: string;
    toolName: string;
    input: Record<string, unknown>;
  }>;
}

/**
 * Send a user message and get the agent's response.
 * If the agent wants to call tools, returns tool_calls with status=waiting_confirmation.
 * If no tools needed, returns the assistant message directly.
 */
export async function sendMessage(threadId: string, userContent: string): Promise<AgentResponse> {
  // Save user message
  await db.insert(messagesTable).values({
    threadId,
    role: "user",
    content: userContent,
  });

  // Load conversation history
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, threadId))
    .orderBy(messagesTable.createdAt);

  // Build messages for OpenAI
  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m): OpenAI.ChatCompletionMessageParam => {
      if (m.role === "tool") {
        return { role: "tool", content: m.content || "", tool_call_id: m.toolCallId || "" };
      }
      return { role: m.role as "user" | "assistant" | "system", content: m.content || "" };
    }),
  ];

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    tools: toolDefinitions,
  });

  const choice = completion.choices[0];
  if (!choice) throw new Error("No response from OpenAI");

  const assistantMessage = choice.message;

  // If tool calls requested
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    // Save assistant message with tool_calls metadata
    await db.insert(messagesTable).values({
      threadId,
      role: "assistant",
      content: assistantMessage.content || null,
    });

    // Save each tool call with waiting_confirmation status
    const savedToolCalls = [];
    for (const tc of assistantMessage.tool_calls) {
      if (tc.type !== "function") continue;
      const fn = tc as { id: string; type: "function"; function: { name: string; arguments: string } };
      const input = JSON.parse(fn.function.arguments);
      const [saved] = await db.insert(toolCallsTable).values({
        threadId,
        toolCallId: fn.id,
        toolName: fn.function.name,
        status: "waiting_confirmation",
        input,
      }).returning();
      if (!saved) continue;
      savedToolCalls.push({
        id: saved.id,
        toolCallId: fn.id,
        toolName: fn.function.name,
        input,
      });
    }

    // Update thread title on first message
    await maybeUpdateTitle(threadId, userContent);

    return { type: "tool_calls", toolCalls: savedToolCalls };
  }

  // No tool calls — direct response
  const content = assistantMessage.content || "";
  await db.insert(messagesTable).values({
    threadId,
    role: "assistant",
    content,
  });

  await maybeUpdateTitle(threadId, userContent);

  return { type: "message", content };
}

/**
 * Approve a tool call: execute it, save result, then continue the conversation.
 */
export async function approveToolCall(toolCallId: string): Promise<AgentResponse> {
  // Get the tool call
  const [toolCall] = await db
    .select()
    .from(toolCallsTable)
    .where(eq(toolCallsTable.id, toolCallId));

  if (!toolCall) throw new Error("Tool call not found");
  if (toolCall.status !== "waiting_confirmation") throw new Error("Tool call not in waiting state");

  // Mark as running
  await db.update(toolCallsTable).set({ status: "running" }).where(eq(toolCallsTable.id, toolCallId));

  // Execute the tool
  const result = await executeTool(toolCall.toolName, toolCall.input as Record<string, unknown>);

  // Mark as completed
  await db.update(toolCallsTable).set({
    status: "completed",
    output: JSON.parse(result),
  }).where(eq(toolCallsTable.id, toolCallId));

  // Save tool result as message
  await db.insert(messagesTable).values({
    threadId: toolCall.threadId,
    role: "tool",
    content: result,
    toolCallId: toolCall.toolCallId,
  });

  // Get all pending tool calls for this thread
  const pendingCalls = await db
    .select()
    .from(toolCallsTable)
    .where(eq(toolCallsTable.threadId, toolCall.threadId));

  const stillWaiting = pendingCalls.filter((tc) => tc.status === "waiting_confirmation");
  if (stillWaiting.length > 0) {
    // Still have pending approvals — don't call OpenAI yet
    return { type: "message", content: `Tool "${toolCall.toolName}" executed. Waiting for other approvals.` };
  }

  // All tools approved — continue conversation with OpenAI
  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, toolCall.threadId))
    .orderBy(messagesTable.createdAt);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.map((m): OpenAI.ChatCompletionMessageParam => {
      if (m.role === "tool") {
        return { role: "tool", content: m.content || "", tool_call_id: m.toolCallId || "" };
      }
      return { role: m.role as "user" | "assistant" | "system", content: m.content || "" };
    }),
  ];

  const completion = await openai.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages,
    tools: toolDefinitions,
  });

  const choice = completion.choices[0];
  const content = choice?.message.content || "Done.";

  await db.insert(messagesTable).values({
    threadId: toolCall.threadId,
    role: "assistant",
    content,
  });

  return { type: "message", content };
}

/**
 * Reject a tool call.
 */
export async function rejectToolCall(toolCallId: string): Promise<void> {
  await db.update(toolCallsTable).set({ status: "failed" }).where(eq(toolCallsTable.id, toolCallId));
}

async function maybeUpdateTitle(threadId: string, firstMessage: string) {
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, threadId));
  if (thread && thread.title === "New Thread") {
    const title = firstMessage.slice(0, 60) + (firstMessage.length > 60 ? "..." : "");
    await db.update(threadsTable).set({ title }).where(eq(threadsTable.id, threadId));
  }
}
