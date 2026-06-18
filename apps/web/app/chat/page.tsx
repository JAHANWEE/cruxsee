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
    <div className="h-screen flex bg-background text-foreground font-sans overflow-hidden selection:bg-primary/20">
      <Sidebar
        threads={threads}
        activeThreadId={activeThreadId}
        onSelectThread={setActiveThreadId}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
      />
      <div className="flex-1 flex flex-col relative h-full w-full">
        {activeThreadId ? (
          <div className="flex-1 flex flex-col w-full h-full relative z-10">
            <MessageView
              messages={messages}
              toolCalls={toolCalls}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleSend}
              loading={loading}
              agentStatus={agentStatus}
            />
            <div className="w-full relative z-20">
              {/* Optional: Add a subtle fade gradient if you want the messages to fade behind the composer */}
              <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              <div className="bg-background w-full pb-4 pt-2">
                <Composer onSend={handleSend} disabled={loading} onStop={() => setLoading(false)} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center z-10 w-full px-4">
            <div className="text-center w-full max-w-[800px] relative -mt-20">
              <div className="relative mb-8 flex justify-center">
                {/* 3D Glass Orb */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-200 via-blue-300 to-purple-400 opacity-90 shadow-[inset_-4px_-4px_10px_rgba(255,255,255,0.6),inset_4px_4px_10px_rgba(0,0,0,0.1),0_10px_20px_rgba(99,102,241,0.2)] animate-[pulse_6s_ease-in-out_infinite]" />
                {/* Subtle glow behind it */}
                <div className="w-24 h-24 rounded-full bg-indigo-400 blur-3xl opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-[32px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 mb-1">
                Good Morning, {session?.user?.name?.split(' ')[0] || "Jaani"}
              </h2>
              <p className="text-[28px] font-medium mb-12 text-zinc-800 dark:text-zinc-100">
                How Can I <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Assist You Today?</span>
              </p>
              <div className="max-w-3xl mx-auto relative z-20">
                <Composer onSend={handleSend} disabled={loading} isInitial={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
