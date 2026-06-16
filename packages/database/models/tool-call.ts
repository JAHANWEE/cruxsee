import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { threadsTable } from "./thread";

export const toolCallStatusEnum = pgEnum("tool_call_status", [
  "pending",
  "waiting_confirmation",
  "approved",
  "running",
  "completed",
  "failed",
]);

export const toolCallsTable = pgTable("tool_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull().references(() => threadsTable.id, { onDelete: "cascade" }),
  toolCallId: text("tool_call_id").notNull(),
  toolName: text("tool_name").notNull(),
  status: toolCallStatusEnum("status").notNull().default("waiting_confirmation"),
  input: jsonb("input"),
  output: jsonb("output"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SelectToolCall = typeof toolCallsTable.$inferSelect;
export type InsertToolCall = typeof toolCallsTable.$inferInsert;
