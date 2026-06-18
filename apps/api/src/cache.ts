/**
 * In-memory cache with TTL support.
 * Same interface as Redis-based cache from inhumane-main.
 * Swap to ioredis in production if needed — just change the backing store.
 */

interface CacheEntry {
  data: string;
  expiresAt: number;
}

const store = new Map<string, CacheEntry>();

// Periodic cleanup every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 60_000);

const TTL = { emails: 120, calendar: 60, threads: 300, messages: 300 }; // seconds

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return JSON.parse(entry.data) as T;
  },

  async set(key: string, data: unknown, ttlSec?: number): Promise<void> {
    store.set(key, {
      data: JSON.stringify(data),
      expiresAt: Date.now() + (ttlSec || 120) * 1000,
    });
  },

  async del(key: string): Promise<void> {
    store.delete(key);
  },

  async delPattern(pattern: string): Promise<void> {
    // Convert glob pattern (e.g. "emails:userId:*") to regex
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of store.keys()) {
      if (regex.test(key)) store.delete(key);
    }
  },

  // Scoped key helpers
  emailsKey: (userId: string, label: string, page?: string) => `emails:${userId}:${label}:${page || "1"}`,
  calendarKey: (userId: string, timeMin: string, timeMax: string) => `cal:${userId}:${timeMin}:${timeMax}`,
  threadsKey: (userId: string) => `threads:${userId}`,
  messagesKey: (userId: string, threadId: string) => `msgs:${userId}:${threadId}`,

  // Optimistic blocking — hide items from UI before background delete completes
  async blockId(userId: string, id: string): Promise<void> {
    const key = `blocked:${userId}`;
    const existing = store.get(key);
    const ids: string[] = existing ? JSON.parse(existing.data) : [];
    if (!ids.includes(id)) ids.push(id);
    store.set(key, { data: JSON.stringify(ids), expiresAt: Date.now() + 300_000 });
  },

  async getBlockedIds(userId: string): Promise<string[]> {
    const entry = store.get(`blocked:${userId}`);
    if (!entry || Date.now() > entry.expiresAt) return [];
    return JSON.parse(entry.data);
  },

  TTL,
};
