import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { threadsTable } from "./thread";

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "tool",
  "system",
]);

export const messagesTable = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content"),
  toolCallId: text("tool_call_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SelectMessage = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
