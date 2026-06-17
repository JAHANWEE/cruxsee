import { z } from "zod";
import { sendMessage, approveToolCall, rejectToolCall } from "@repo/services/agent";
import { rateLimitedProcedure, protectedProcedure, router } from "../../trpc";
import { db, eq } from "@repo/database";
import { threadsTable, toolCallsTable } from "@repo/database/schema";

export const agentRouter = router({
  send: rateLimitedProcedure
    .input(z.object({
      threadId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify thread ownership
      const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, input.threadId));
      if (!thread || thread.userId !== ctx.user.id) throw new Error("Unauthorized");
      return sendMessage(input.threadId, input.content);
    }),

  approveToolCall: rateLimitedProcedure
    .input(z.object({ toolCallId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return approveToolCall(input.toolCallId, ctx.user.id);
    }),

  rejectToolCall: protectedProcedure
    .input(z.object({ toolCallId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [toolCall] = await db.select().from(toolCallsTable).where(eq(toolCallsTable.id, input.toolCallId));
      if (!toolCall) throw new Error("Tool call not found");
      
      const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, toolCall.threadId));
      if (!thread || thread.userId !== ctx.user.id) throw new Error("Unauthorized");

      await rejectToolCall(input.toolCallId);
      return { success: true };
    }),
});
