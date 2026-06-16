"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "~/lib/auth-client";
import { Sidebar } from "./components/sidebar";
import { MessageView } from "./components/message-view";
import { Composer } from "./components/composer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string | null;
  toolCallId: string | null;
  createdAt: string;
}

export interface ToolCall {
  id: string;
  toolCallId: string;
  toolName: string;
  status: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
}

async function trpcQuery(path: string, input: Record<string, unknown>) {
  const params = new URLSearchParams({ input: JSON.stringify(input) });
  const res = await fetch(`${API_URL}/trpc/${path}?${params}`, { credentials: "include" });
  const data = await res.json();
  return data.result?.data;
}

async function trpcMutate(path: string, input: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/trpc/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await res.json();
  return data.result?.data;
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<string>("");

  const userId = session?.user?.id;

  // Load threads
  useEffect(() => {
    if (!userId) return;
    trpcQuery("thread.list", { userId }).then(setThreads);
  }, [userId]);

  // Load messages + tool calls when thread changes
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      setToolCalls([]);
      return;
    }
    trpcQuery("thread.messages", { threadId: activeThreadId }).then(setMessages);
    trpcQuery("thread.toolCalls", { threadId: activeThreadId }).then(setToolCalls);
  }, [activeThreadId]);

  async function handleNewThread() {
    if (!userId) return;
    const thread = await trpcMutate("thread.create", { userId });
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([]);
    setToolCalls([]);
  }

  async function handleSend(content: string) {
    if (!activeThreadId || !content.trim()) return;

    // Optimistic user message
    const optimistic: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      toolCallId: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setLoading(true);
    setAgentStatus("Thinking...");

    const result = await trpcMutate("agent.send", { threadId: activeThreadId, content });

    if (result?.type === "tool_calls") {
      setAgentStatus("Waiting for approval...");
      // Refresh messages and tool calls
      const [msgs, tcs] = await Promise.all([
        trpcQuery("thread.messages", { threadId: activeThreadId }),
        trpcQuery("thread.toolCalls", { threadId: activeThreadId }),
      ]);
      setMessages(msgs);
      setToolCalls(tcs);
    } else if (result?.type === "message") {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: result.content, toolCallId: null, createdAt: new Date().toISOString() },
      ]);
    }

    setLoading(false);
    setAgentStatus("");

    // Refresh thread list (title might have updated)
    if (userId) {
      trpcQuery("thread.list", { userId }).then(setThreads);
    }
  }

  async function handleApprove(toolCallId: string) {
    setLoading(true);
    setAgentStatus("Executing tool...");

    const result = await trpcMutate("agent.approveToolCall", { toolCallId });

    // Refresh
    if (activeThreadId) {
      const [msgs, tcs] = await Promise.all([
        trpcQuery("thread.messages", { threadId: activeThreadId }),
        trpcQuery("thread.toolCalls", { threadId: activeThreadId }),
      ]);
      setMessages(msgs);
      setToolCalls(tcs);
    }

    if (result?.type === "message" && result.content) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: result.content, toolCallId: null, createdAt: new Date().toISOString() },
      ]);
    }

    setLoading(false);
    setAgentStatus("");
  }

  async function handleReject(toolCallId: string) {
    await trpcMutate("agent.rejectToolCall", { toolCallId });
    if (activeThreadId) {
      const tcs = await trpcQuery("thread.toolCalls", { threadId: activeThreadId });
      setToolCalls(tcs);
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Cruxsee</h1>
          <p className="text-muted-foreground">Sign in to access the workspace.</p>
          <a href="/" className="text-sm underline">Go to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
        onNewThread={handleNewThread}
      />
      <div className="flex-1 flex flex-col">
        {activeThreadId ? (
          <>
            <MessageView
              messages={messages}
              toolCalls={toolCalls}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={loading}
              agentStatus={agentStatus}
            />
            <Composer onSend={handleSend} disabled={loading} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-lg">Start a new conversation</p>
              <button
                onClick={handleNewThread}
                className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-md text-sm"
              >
                New Thread
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
