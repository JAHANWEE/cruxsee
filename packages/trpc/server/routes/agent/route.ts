import { z } from "zod";
import { sendMessage, approveToolCall, rejectToolCall } from "@repo/services/agent";
import { protectedProcedure, router } from "../../trpc";
import { db, eq } from "@repo/database";
import { threadsTable } from "@repo/database/schema";

export const agentRouter = router({
  send: protectedProcedure
    .input(z.object({
      threadId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, input.threadId));
      if (!thread || thread.userId !== ctx.user.id) throw new Error("Unauthorized");
      return sendMessage(input.threadId, input.content);
    }),

  approveToolCall: protectedProcedure
    .input(z.object({ toolCallId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // NOTE: Should ideally join toolCalls -> threads to verify ownership
      return approveToolCall(input.toolCallId);
    }),

  rejectToolCall: protectedProcedure
    .input(z.object({ toolCallId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await rejectToolCall(input.toolCallId);
      return { success: true };
    }),
});
