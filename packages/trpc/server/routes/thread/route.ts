import { z } from "zod";
import { db, eq, desc } from "@repo/database";
import { threadsTable, messagesTable, toolCallsTable } from "@repo/database/schema";
import { protectedProcedure, router } from "../../trpc";

export const threadRouter = router({
  create: protectedProcedure
    .mutation(async ({ ctx }) => {
      const [thread] = await db.insert(threadsTable).values({
        userId: ctx.user.id,
      }).returning();
      return thread;
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      const threads = await db
        .select()
        .from(threadsTable)
        .where(eq(threadsTable.userId, ctx.user.id))
        .orderBy(desc(threadsTable.updatedAt));
      return threads;
    }),

  messages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Validate thread ownership
      const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, input.threadId));
      if (!thread || thread.userId !== ctx.user.id) throw new Error("Unauthorized");
      
      const messages = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.threadId, input.threadId))
        .orderBy(messagesTable.createdAt);
      return messages;
    }),

  toolCalls: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Validate thread ownership
      const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, input.threadId));
      if (!thread || thread.userId !== ctx.user.id) throw new Error("Unauthorized");

      const calls = await db
        .select()
        .from(toolCallsTable)
        .where(eq(toolCallsTable.threadId, input.threadId))
        .orderBy(toolCallsTable.createdAt);
      return calls;
    }),

  delete: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // Validate thread ownership
      const [thread] = await db.select().from(threadsTable).where(eq(threadsTable.id, input.threadId));
      if (!thread || thread.userId !== ctx.user.id) throw new Error("Unauthorized");

      await db.delete(threadsTable).where(eq(threadsTable.id, input.threadId));
      return { success: true };
    }),
});
