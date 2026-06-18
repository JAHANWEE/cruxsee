"use client";

import { useState, useEffect } from "react";
import { Send, Calendar, ExternalLink, Newspaper, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── Email Action Card (Gmail-like compose, always editable) ───

interface EmailData {
  to?: string;
  subject?: string;
  body?: string;
}

export function EmailActionCard({ data }: { data: EmailData }) {
  const [to, setTo] = useState(data.to || "");
  const [subject, setSubject] = useState(data.subject || "");
  const [body, setBody] = useState(data.body || "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    if (!to || !subject || !body) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ to, subject, body }),
      });
      const result = await res.json();
      if (result.success) {
        setSent(true);
      } else {
        setError(result.error || "Failed to send");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Email sent</p>
          <p className="text-xs text-green-600 dark:text-green-400">To: {to}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm w-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Message</span>
      </div>
      {/* To */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <span className="text-xs text-zinc-400 w-12 shrink-0">To</span>
        <input
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none text-zinc-800 dark:text-zinc-100"
          placeholder="recipient@example.com"
        />
      </div>
      {/* Subject */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <span className="text-xs text-zinc-400 w-12 shrink-0">Subject</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="flex-1 text-sm bg-transparent outline-none text-zinc-800 dark:text-zinc-100"
          placeholder="Email subject"
        />
      </div>
      {/* Body */}
      <div className="px-4 py-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="w-full text-sm bg-transparent outline-none resize-none text-zinc-800 dark:text-zinc-100 leading-relaxed"
          placeholder="Write your message..."
        />
      </div>
      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        {error && <span className="text-xs text-red-500">{error}</span>}
        <div className="flex-1" />
        <button
          onClick={handleSend}
          disabled={sending || !to || !subject || !body}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-indigo-600 transition-colors"
        >
          <Send className="w-4 h-4" />
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}

// ─── Calendar Action Card ───

interface CalendarData {
  summary?: string;
  start?: string;
  end?: string;
  description?: string;
  guests?: string[];
}

export function CalendarActionCard({ data }: { data: CalendarData }) {
  const [summary, setSummary] = useState(data.summary || "");
  const [start, setStart] = useState(data.start || "");
  const [end, setEnd] = useState(data.end || "");
  const [description, setDescription] = useState(data.description || "");
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!summary || !start || !end) return;
    setCreating(true);
    setError("");
    try {
      // Convert to UTC ISO string — Google Calendar will display in user's calendar timezone
      const startISO = new Date(start).toISOString();
      const endISO = new Date(end).toISOString();

      const res = await fetch(`${API_URL}/api/calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          summary,
          start: { dateTime: startISO },
          end: { dateTime: endISO },
          description: description || undefined,
          attendees: data.guests?.length ? data.guests.map((email) => ({ email })) : undefined,
        }),
      });
      const result = await res.json();
      if (result.id || result.htmlLink) {
        setCreated(true);
      } else {
        setError(result.error || "Failed to create event");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setCreating(false);
    }
  }

  if (created) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">✓</div>
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200">Event created</p>
          <p className="text-xs text-green-600 dark:text-green-400">{summary}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm w-full">
      <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-indigo-500" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">New Event</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Title</label>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 outline-none border border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Start</label>
            <input
              type="datetime-local"
              value={start?.replace(/[+-]\d{2}:\d{2}$/, "").slice(0, 16)}
              onChange={(e) => setStart(e.target.value)}
              className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 outline-none border border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">End</label>
            <input
              type="datetime-local"
              value={end?.replace(/[+-]\d{2}:\d{2}$/, "").slice(0, 16)}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 outline-none border border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-400 block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full text-sm bg-zinc-50 dark:bg-zinc-800 rounded-lg px-3 py-2 outline-none border border-zinc-200 dark:border-zinc-700 resize-none"
          />
        </div>
      </div>
      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        {error && <span className="text-xs text-red-500">{error}</span>}
        <div className="flex-1" />
        <button
          onClick={handleCreate}
          disabled={creating || !summary || !start || !end}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium disabled:opacity-50 hover:bg-indigo-600 transition-colors"
        >
          <Calendar className="w-4 h-4" />
          {creating ? "Creating..." : "Create Event"}
        </button>
      </div>
    </div>
  );
}

// ─── AI News Action Card ───

export function AINewsActionCard() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchNews() {
      try {
        const topRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
        const topIds = await topRes.json();
        const top10 = topIds.slice(0, 10);
        
        const stories = await Promise.all(
          top10.map((id: number) => 
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(res => res.json())
          )
        );
        
        setNews(stories || []);
      } catch (err: any) {
        setError(err.message || "Failed to fetch news");
      } finally {
        setLoading(false);
      }
    }
    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] overflow-hidden shadow-sm flex flex-col items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-zinc-500">Fetching latest AI news from HackerNews...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-lg p-4 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#18181b] overflow-hidden shadow-sm flex flex-col">
      <div className="bg-zinc-50 dark:bg-zinc-800/50 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Newspaper className="w-4 h-4 text-indigo-500" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">HackerNews Frontpage</h3>
          <p className="text-xs text-zinc-500">Top 10 stories right now</p>
        </div>
      </div>
      <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/50 max-h-[400px] overflow-y-auto scrollbar-hide">
        {news.map((item, idx) => (
          <a
            key={item.id}
            href={item.url || `https://news.ycombinator.com/item?id=${item.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <h4 className="text-sm font-medium text-zinc-800 dark:text-zinc-200 leading-snug group-hover:text-indigo-500 transition-colors">
                {idx + 1}. {item.title}
              </h4>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-zinc-500">
              <span className="text-orange-500/90">{item.score || 0} pts</span>
              <span>•</span>
              <span>{item.by}</span>
              <span>•</span>
              <span>{item.descendants || 0} comments</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Message parser (extracts action blocks from text) ───

interface MessagePart {
  type: string;
  content?: string;
  data?: any;
}

export function renderMessageParts(text: string): MessagePart[] {
  if (!text) return [];
  const blockRegex = /```(email-draft|email-action|calendar-event|calendar-action|ainews-action)\n([\s\S]*?)\n```/g;
  const parts: MessagePart[] = [];
  let lastIndex = 0;
  let match;

  while ((match = blockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    try {
      const data = JSON.parse(match[2]!);
      parts.push({ type: match[1]!, data });
    } catch {
      parts.push({ type: "text", content: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}
