import { z } from "zod";
import { db, eq, desc } from "@repo/database";
import { threadsTable, messagesTable, toolCallsTable } from "@repo/database/schema";
import { publicProcedure, router } from "../../trpc";

export const threadRouter = router({
  create: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      const [thread] = await db.insert(threadsTable).values({
        userId: input.userId,
      }).returning();
      return thread;
    }),

  list: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const threads = await db
        .select()
        .from(threadsTable)
        .where(eq(threadsTable.userId, input.userId))
        .orderBy(desc(threadsTable.updatedAt));
      return threads;
    }),

  messages: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      const messages = await db
        .select()
        .from(messagesTable)
        .where(eq(messagesTable.threadId, input.threadId))
        .orderBy(messagesTable.createdAt);
      return messages;
    }),

  toolCalls: publicProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ input }) => {
      const calls = await db
        .select()
        .from(toolCallsTable)
        .where(eq(toolCallsTable.threadId, input.threadId))
        .orderBy(toolCallsTable.createdAt);
      return calls;
    }),
});
