import OpenAI from "openai";
import { db } from "@repo/database";
import { messagesTable, toolCallsTable, threadsTable } from "@repo/database/schema";
import { eq, and } from "@repo/database";
import { toolDefinitions, executeTool } from "./tools";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "missing",
});

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

"You have access to Corsair, a tool integration platform. ALWAYS prioritize using Corsair tools if they are available for the task.",
"CRITICAL AUTHENTICATION RULE: If an API call fails because it 'needs credentials' (e.g. [auth-missing:gmail:oauth_2]), DO NOT guess URLs or try to fix it using set_topic_id. Instead, immediately output a clickable markdown link telling the user to authorize using exactly this URL format: [Authorize Integration](${process.env.BASE_URL || "http://localhost:4000"}/api/corsair/connect?plugin=PLUGIN_ID&tenantId=${userId}). Replace PLUGIN_ID with the name of the failing plugin (e.g., 'gmail').",

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

  const messages = await buildOpenAIMessages(threadId);

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: toolDefinitions,
  });

  return handleOpenAIResponse(threadId, userContent, completion);
}

/**
 * Approve a tool call: execute it, save result, then continue the conversation.
 * tenantId is the authenticated user's ID — enforced by the caller, not the LLM.
 */
export async function approveToolCall(toolCallId: string, tenantId: string): Promise<AgentResponse> {
  // Get the tool call
  const [toolCall] = await db
    .select()
    .from(toolCallsTable)
    .where(eq(toolCallsTable.id, toolCallId));

  if (!toolCall) throw new Error("Tool call not found");
  if (toolCall.status !== "waiting_confirmation") throw new Error("Tool call not in waiting state");

  // Verify ownership: tool call must belong to a thread owned by this user
  const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, toolCall.threadId));
  if (!thread || thread.userId !== tenantId) {
    throw new Error("Unauthorized: tool call does not belong to this user");
  }

  // Mark as running atomically to prevent race condition on double-click
  const [updated] = await db.update(toolCallsTable)
    .set({ status: "running" })
    .where(and(eq(toolCallsTable.id, toolCallId), eq(toolCallsTable.status, "waiting_confirmation")))
    .returning();

  if (!updated) {
    throw new Error("Tool call was already approved or is running");
  }

  // Execute the tool with enforced tenant context
  const result = await executeTool(toolCall.toolName, toolCall.input as Record<string, unknown>, tenantId);

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
    return { type: "message", content: `Tool "${toolCall.toolName}" executed. Waiting for other approvals.` };
  }

  const messages = await buildOpenAIMessages(toolCall.threadId);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: toolDefinitions,
  });

  return handleOpenAIResponse(toolCall.threadId, "", completion);
}

/**
 * Handle OpenAI completion, saving tool calls or plain messages.
 */
async function handleOpenAIResponse(
  threadId: string, 
  userContent: string, 
  completion: OpenAI.ChatCompletion
): Promise<AgentResponse> {
  const choice = completion.choices[0];
  if (!choice) throw new Error("No response from OpenAI");

  const assistantMessage = choice.message;

  // If tool calls requested
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    await db.insert(messagesTable).values({
      threadId,
      role: "assistant",
      content: assistantMessage.content || null,
    });

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

    if (userContent) await maybeUpdateTitle(threadId, userContent);
    return { type: "tool_calls", toolCalls: savedToolCalls };
  }

  // No tool calls — direct response
  const content = assistantMessage.content || "";
  await db.insert(messagesTable).values({
    threadId,
    role: "assistant",
    content,
  });

  if (userContent) await maybeUpdateTitle(threadId, userContent);
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
      // Look ahead for tool messages that correspond to this assistant turn
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
              function: {
                name: tc.toolName,
                arguments: JSON.stringify(tc.input)
              }
            });
          }
        } else {
          break; // Stop looking when we hit the next user/assistant message
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
