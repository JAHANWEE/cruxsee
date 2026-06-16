import { pgTable, uuid, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { usersTable } from "./user";

export const threadsTable = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).default("New Thread"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});

export type SelectThread = typeof threadsTable.$inferSelect;
export type InsertThread = typeof threadsTable.$inferInsert;
