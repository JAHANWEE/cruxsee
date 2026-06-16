import { z } from "zod";
import { sendMessage, approveToolCall, rejectToolCall } from "@repo/services/agent";
import { publicProcedure, router } from "../../trpc";

export const agentRouter = router({
  send: publicProcedure
    .input(z.object({
      threadId: z.string(),
      content: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      return sendMessage(input.threadId, input.content);
    }),

  approveToolCall: publicProcedure
    .input(z.object({ toolCallId: z.string() }))
    .mutation(async ({ input }) => {
      return approveToolCall(input.toolCallId);
    }),

  rejectToolCall: publicProcedure
    .input(z.object({ toolCallId: z.string() }))
    .mutation(async ({ input }) => {
      await rejectToolCall(input.toolCallId);
      return { success: true };
    }),
});
