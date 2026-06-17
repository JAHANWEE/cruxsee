"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn } from "~/lib/auth-client";
import { Sidebar } from "../components/sidebar";
import { MessageView } from "../components/message-view";
import { Composer } from "../components/composer";

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

async function trpcQuery(path: string, input?: Record<string, unknown>) {
  const params = input ? new URLSearchParams({ input: JSON.stringify(input) }) : new URLSearchParams();
  const res = await fetch(`${API_URL}/trpc/${path}?${params}`, { credentials: "include" });
  const data = await res.json();
  return data.result?.data;
}

async function trpcMutate(path: string, input?: Record<string, unknown>) {
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

  useEffect(() => {
    if (!userId) return;
    trpcQuery("thread.list").then(setThreads);
  }, [userId]);

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
    const thread = await trpcMutate("thread.create");
    setThreads((prev) => [thread, ...prev]);
    setActiveThreadId(thread.id);
    setMessages([]);
    setToolCalls([]);
  }

  async function handleSend(content: string) {
    if (!activeThreadId || !content.trim()) return;

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

    if (userId) {
      trpcQuery("thread.list", { userId }).then(setThreads);
    }
  }

  async function handleApprove(toolCallId: string) {
    setLoading(true);
    setAgentStatus("Executing action...");

    const result = await trpcMutate("agent.approveToolCall", { toolCallId });

    if (activeThreadId) {
      const [msgs, tcs] = await Promise.all([
        trpcQuery("thread.messages", { threadId: activeThreadId }),
        trpcQuery("thread.toolCalls", { threadId: activeThreadId }),
      ]);
      setMessages(msgs);
      setToolCalls(tcs);
    }

    // Optimistic append removed because messages are fully refreshed above.

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

  async function handleDeleteThread(threadId: string) {
    if (!userId) return;
    await trpcMutate("thread.delete", { threadId });
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setMessages([]);
      setToolCalls([]);
    }
    trpcQuery("thread.list").then(setThreads);
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-light tracking-tight">Cruxsee</h1>
          <p className="text-zinc-400">Sign in to access your workspace.</p>
          <button onClick={() => signIn.social({ provider: "google", callbackURL: window.location.origin + "/chat" })} className="inline-block px-6 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-[#09090b] text-zinc-100 font-sans selection:bg-white/20">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
      />
      <div className="flex-1 flex flex-col relative h-full">
        {/* Subtle background glow effect */}
        <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {activeThreadId ? (
          <div className="flex-1 flex flex-col w-full max-w-4xl mx-auto h-full relative z-10">
            <MessageView
              messages={messages}
              toolCalls={toolCalls}
              onApprove={handleApprove}
              onReject={handleReject}
              loading={loading}
              agentStatus={agentStatus}
            />
            <Composer onSend={handleSend} disabled={loading} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center z-10">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl ring-1 ring-white/10">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-medium tracking-tight">Ready to assist</h2>
              <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                Start a new conversation to begin managing your workflow at inhumane speed.
              </p>
              <button
                onClick={handleNewThread}
                className="mt-4 px-6 py-2.5 bg-white text-black hover:bg-zinc-200 rounded-full text-sm font-medium transition-all shadow-lg shadow-white/5 hover:scale-105 active:scale-95"
              >
                Start New Thread
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
