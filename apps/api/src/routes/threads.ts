import { Router } from "express";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";
import { db, eq, and, desc } from "@repo/database";
import { threadsTable, messagesTable } from "@repo/database/schema";
import { cache } from "../cache";
import { z } from "zod";

export const threadsRouter = Router();

// GET /api/threads
threadsRouter.get("/", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const cacheKey = cache.threadsKey(session.user.id);
  const cached = await cache.get<any>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const rows = await db
    .select()
    .from(threadsTable)
    .where(eq(threadsTable.userId, session.user.id))
    .orderBy(desc(threadsTable.updatedAt));

  await cache.set(cacheKey, rows, cache.TTL.threads);
  res.json(rows);
});

const createThreadSchema = z.object({
  title: z.string().max(255).optional(),
});

// POST /api/threads — create
threadsRouter.post("/", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = createThreadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  const { title } = parsed.data;

  const [thread] = await db
    .insert(threadsTable)
    .values({
      userId: session.user.id,
      title: title || "New conversation",
    })
    .returning();

  await cache.del(cache.threadsKey(session.user.id));
  res.json(thread);
});

const updateThreadSchema = z.object({
  title: z.string().max(255).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
});

// PATCH /api/threads/:id — update
threadsRouter.patch("/:id", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = updateThreadSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }

  const updates: Record<string, any> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;

  if (Object.keys(updates).length === 0) {
    res.json({ ok: true });
    return;
  }

  const [updated] = await db
    .update(threadsTable)
    .set(updates)
    .where(and(eq(threadsTable.id, req.params.id), eq(threadsTable.userId, session.user.id)))
    .returning();

  await cache.del(cache.threadsKey(session.user.id));
  res.json(updated || { error: "Not found" });
});

// GET /api/threads/:id/messages
threadsRouter.get("/:id/messages", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Verify thread ownership
  const [thread] = await db
    .select()
    .from(threadsTable)
    .where(and(eq(threadsTable.id, req.params.id), eq(threadsTable.userId, session.user.id)));
  if (!thread) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const msgKey = cache.messagesKey(session.user.id, req.params.id);
  const cached = await cache.get<any>(msgKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.threadId, req.params.id))
    .orderBy(messagesTable.createdAt);

  await cache.set(msgKey, rows, cache.TTL.messages);
  res.json(rows);
});

// DELETE /api/threads/:id
threadsRouter.delete("/:id", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Delete messages first, then thread
  await db.delete(messagesTable).where(eq(messagesTable.threadId, req.params.id));
  await db
    .delete(threadsTable)
    .where(and(eq(threadsTable.id, req.params.id), eq(threadsTable.userId, session.user.id)));

  await cache.del(cache.threadsKey(session.user.id));
  await cache.del(cache.messagesKey(session.user.id, req.params.id));
  res.json({ ok: true });
});
