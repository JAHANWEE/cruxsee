"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef, useMemo } from "react";
import { useSession, signIn } from "~/lib/auth-client";
import { Sidebar } from "../components/sidebar";
import { Composer } from "../components/composer";
import { EmailActionCard, CalendarActionCard, renderMessageParts } from "./components/action-cards";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
}

type ConnectStatus = { gmail: boolean; googlecalendar: boolean };

function ConnectModal({ status, onConnect }: { status: ConnectStatus; onConnect: (plugin: string) => void }) {
  if (status.gmail && status.googlecalendar) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-10 max-w-lg w-full mx-4 border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-2xl font-semibold tracking-tight mb-2">Connect your accounts</h2>
        <p className="text-zinc-500 text-sm mb-8 leading-relaxed">
          One-time setup. Cruxsee needs access to operate on your behalf. Your credentials are encrypted and never shared.
        </p>
        <div className="space-y-3">
          {!status.gmail && (
            <button onClick={() => onConnect("gmail")} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all active:scale-[0.98]">
              <div className="text-left">
                <div className="text-sm font-medium">Connect Gmail</div>
                <div className="text-xs text-zinc-500 mt-0.5">Read, send, and manage emails</div>
              </div>
            </button>
          )}
          {!status.googlecalendar && (
            <button onClick={() => onConnect("googlecalendar")} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-all active:scale-[0.98]">
              <div className="text-left">
                <div className="text-sm font-medium">Connect Calendar</div>
                <div className="text-xs text-zinc-500 mt-0.5">View and create events</div>
              </div>
            </button>
          )}
        </div>
        {(status.gmail || status.googlecalendar) && (
          <p className="text-xs text-zinc-500 mt-5 text-center">
            {status.gmail ? "Gmail connected" : "Calendar connected"}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { data: session, isPending } = useSession();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus>({ gmail: true, googlecalendar: true });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Ref so the transport always picks up the latest thread
  const activeThreadRef = useRef<string | null>(null);
  activeThreadRef.current = activeThread;

  // Stable transport — threadId passed via body dynamically
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_URL}/api/chat`,
        credentials: "include",
        body: () => ({ threadId: activeThreadRef.current }),
      }),
    []
  );

  const { messages, sendMessage, status: chatStatus, setMessages } = useChat({ transport });

  // Load threads + check connect status on mount
  useEffect(() => {
    if (!session?.user) return;
    fetch(`${API_URL}/api/threads`, { credentials: "include" })
      .then((r) => r.json())
      .then(setThreads)
      .catch(() => {});

    // Check onboarding
    const onboarded = localStorage.getItem("cruxsee-onboarded");
    if (onboarded) {
      setConnectStatus({ gmail: true, googlecalendar: true });
      return;
    }
    fetchConnectStatus();
  }, [session?.user]);

  function fetchConnectStatus() {
    fetch(`${API_URL}/api/corsair/status`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setConnectStatus(data);
        if (data.gmail && data.googlecalendar) localStorage.setItem("cruxsee-onboarded", "true");
      })
      .catch(() => {});
  }

  // Listen for popup close (corsair connect)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "corsair-connected") fetchConnectStatus();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Load messages when switching threads
  const justCreatedRef = useRef(false);
  useEffect(() => {
    if (!activeThread) {
      setMessages([]);
      return;
    }
    if (justCreatedRef.current) {
      justCreatedRef.current = false;
      return;
    }
    setMessages([]);
    fetch(`${API_URL}/api/threads/${activeThread}/messages`, { credentials: "include" })
      .then((r) => r.json())
      .then((msgs: any[]) => {
        if (!Array.isArray(msgs) || msgs.length === 0) return;
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            parts: [{ type: "text" as const, text: m.content }],
          }))
        );
      })
      .catch(() => setMessages([]));
  }, [activeThread]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create thread + send message
  function startNewChat(text: string, localActionContent?: string) {
    if (!text.trim() && !localActionContent) return;
    const title = text.slice(0, 50) + (text.length > 50 ? "..." : "");
    fetch(`${API_URL}/api/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: title || "New Action" }),
    })
      .then((r) => r.json())
      .then((thread) => {
        setThreads((prev) => [thread, ...prev]);
        justCreatedRef.current = true;
        activeThreadRef.current = thread.id;
        setActiveThread(thread.id);
        
        if (localActionContent) {
          setMessages([
            { id: "local-user", role: "user", parts: [{ type: "text", text }] } as any,
            { id: "local-action", role: "assistant", parts: [{ type: "text", text: localActionContent }] } as any
          ]);
        } else {
          sendMessage({ text });
        }
      });
  }

  function handleSend(content: string, action?: "email" | "calendar" | "inbox") {
    if (!content.trim() && !action) return;

    if (action === "inbox") {
      const msg = "Fetch my latest 5 emails from my inbox.";
      if (!activeThread) startNewChat(msg);
      else sendMessage({ text: msg });
      return;
    }

    if (action === "email" || action === "calendar") {
      const localActionContent = action === "email" ? "```email-action\n{}\n```" : "```calendar-action\n{}\n```";
      const userText = action === "email" ? "Craft a mail" : "Schedule an event";
      
      if (!activeThread) {
        startNewChat(userText, localActionContent);
      } else {
        setMessages(prev => [
          ...prev, 
          { id: Date.now().toString() + "1", role: "user", parts: [{ type: "text", text: userText }] } as any,
          { id: Date.now().toString() + "2", role: "assistant", parts: [{ type: "text", text: localActionContent }] } as any
        ]);
      }
      return;
    }

    if (!activeThread) {
      startNewChat(content);
      return;
    }
    sendMessage({ text: content });
  }

  function handleNewThread() {
    setActiveThread(null);
    setMessages([]);
  }

  async function handleDeleteThread(threadId: string) {
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    if (activeThread === threadId) {
      setActiveThread(null);
      setMessages([]);
    }
    fetch(`${API_URL}/api/threads/${threadId}`, { method: "DELETE", credentials: "include" }).catch(() => {});
  }

  function openConnectPopup(plugin: string) {
    window.open(
      `${API_URL}/api/corsair/connect?plugin=${plugin}`,
      "corsair-connect",
      "width=500,height=600,popup=yes"
    );
  }

  // ─── Loading / Auth gates ───
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
          <button
            onClick={() => signIn.social({ provider: "google", callbackURL: window.location.origin + "/chat" })}
            className="inline-block px-6 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Layout ───
  return (
    <div className="h-screen flex bg-background text-foreground font-sans overflow-hidden selection:bg-primary/20">
      <ConnectModal status={connectStatus} onConnect={openConnectPopup} />
      <Sidebar
        threads={threads}
        activeThreadId={activeThread}
        onSelectThread={setActiveThread}
        onNewThread={handleNewThread}
        onDeleteThread={handleDeleteThread}
      />
      <div className="flex-1 flex flex-col relative h-full w-full">
        {activeThread ? (
          <div className="flex-1 flex flex-col w-full h-full relative z-10">
            {/* Messages */}
            <section className="flex-1 overflow-y-auto px-8 pt-8 pb-40" style={{ scrollbarWidth: "none" }}>
              <div className="max-w-[680px] mx-auto flex flex-col gap-5">
                {messages.map((message) => (
                  <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                    {message.role === "user" ? (
                      <div className="flex justify-end">
                        <div className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 bg-zinc-100 dark:bg-white/10">
                          {(message.parts || [{ type: "text" as const, text: (message as any).content }]).map((part, i) => {
                            if (part.type === "text") return <p key={i} className="text-[15px] leading-relaxed whitespace-pre-wrap">{part.text}</p>;
                            return null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 max-w-[90%]">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 bg-indigo-500/10 dark:bg-indigo-400/10">
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">AI</span>
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col items-start gap-2">
                          {(message.parts || [{ type: "text" as const, text: (message as any).content }]).map((part, i) => {
                            if (part.type === "text") {
                              const blocks = renderMessageParts(part.text);
                              return blocks.map((b, bi) => {
                                if (b.type === "text" && b.content?.trim()) {
                                  return (
                                    <div key={`${i}-${bi}`} className="rounded-2xl rounded-tl-sm px-5 py-3.5 bg-white dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                                      <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{b.content.trim()}</div>
                                    </div>
                                  );
                                }
                                if (b.type === "email-draft" || b.type === "email-action") {
                                  return <div key={`${i}-${bi}`} className="w-full max-w-full"><EmailActionCard data={b.data} /></div>;
                                }
                                if (b.type === "calendar-event" || b.type === "calendar-action") {
                                  return <div key={`${i}-${bi}`} className="w-full max-w-full"><CalendarActionCard data={b.data} /></div>;
                                }
                                return null;
                              });
                            }
                            // Tool call indicators
                            if ((part as any).type?.startsWith?.("tool-")) {
                              const p = part as any;
                              return (
                                <div key={i} className="inline-flex items-center gap-1.5 text-[11px] font-medium rounded-md px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  <span>⚡</span>
                                  <span>{p.toolName || "Tool"}</span>
                                  {p.state === "result" && <span className="text-green-500">✓</span>}
                                  {p.state === "call" && <span className="animate-pulse">…</span>}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {/* Typing indicator */}
                {(chatStatus === "submitted" || chatStatus === "streaming") && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex items-center gap-1.5 py-2 animate-in fade-in duration-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </section>
            {/* Composer */}
            <div className="w-full relative z-20">
              <div className="absolute bottom-full left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              <div className="bg-background w-full pb-4 pt-2">
                <Composer onSend={handleSend} disabled={chatStatus !== "ready"} />
              </div>
            </div>
          </div>
        ) : (
          /* Home / Empty state */
          <div className="flex-1 flex items-center justify-center z-10 w-full px-4">
            <div className="text-center w-full max-w-[800px] relative -mt-20">
              <div className="relative mb-8 flex justify-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-200 via-blue-300 to-purple-400 opacity-90 shadow-[inset_-4px_-4px_10px_rgba(255,255,255,0.6),inset_4px_4px_10px_rgba(0,0,0,0.1),0_10px_20px_rgba(99,102,241,0.2)] animate-[pulse_6s_ease-in-out_infinite]" />
                <div className="w-24 h-24 rounded-full bg-indigo-400 blur-3xl opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-[32px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 mb-1">
                Good Morning, {session?.user?.name?.split(" ")[0] || "there"}
              </h2>
              <p className="text-[28px] font-medium mb-12 text-zinc-800 dark:text-zinc-100">
                How Can I <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Assist You Today?</span>
              </p>
              <div className="max-w-3xl mx-auto relative z-20">
                <Composer onSend={handleSend} disabled={chatStatus !== "ready"} isInitial={true} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
