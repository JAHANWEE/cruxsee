"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, X, Code, ShieldAlert, Cpu } from "lucide-react";
import type { Message, ToolCall } from "../chat/page";

interface MessageViewProps {
  messages: Message[];
  toolCalls: ToolCall[];
  onApprove: (toolCallId: string) => void;
  onReject: (toolCallId: string) => void;
  loading: boolean;
  agentStatus: string;
}

export function MessageView({ messages, toolCalls, onApprove, onReject, loading, agentStatus }: MessageViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, loading]);

  const pendingToolCalls = toolCalls.filter((tc) => tc.status === "waiting_confirmation");
  const hasPendingTools = pendingToolCalls.length > 0;
  const activeToolCall = pendingToolCalls[0];

  const getActionDetails = (tc: ToolCall) => {
    let title = "Agent requests an action";
    let icon = <Cpu className="w-5 h-5 text-indigo-500" />;
    let color = "indigo";

    if (tc.toolName === "run_script") {
      const code = (tc.input as any).code || "";
      if (code.includes("gmail.api.messages.get")) {
        title = "Read specific emails";
        color = "blue";
      } else if (code.includes("gmail.api.messages.list")) {
        title = "Scan your inbox";
        color = "blue";
      } else if (code.includes("gmail.api.messages.send")) {
        title = "Send an email";
        color = "emerald";
      } else if (code.includes("calendar.api.events.insert")) {
        title = "Schedule a meeting";
        color = "amber";
      } else if (code.includes("calendar.api.events.list")) {
        title = "Check your calendar";
        color = "amber";
      } else {
        title = "Execute Corsair Script";
        color = "rose";
      }
    } else if (tc.toolName === "get_schema") {
      title = "Analyze API Schema";
      color = "zinc";
    }

    return { title, color, icon };
  };

  const toggleDetails = (id: string) => {
    setShowDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-32 space-y-8 scrollbar-hide relative">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {loading && agentStatus && !hasPendingTools && (
        <div className="flex items-center gap-3 px-4 py-2 opacity-70 animate-in fade-in duration-500">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase">{agentStatus}</span>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />

      {/* Modern Tool Approval Card */}
      {hasPendingTools && activeToolCall && (
        <div className="absolute bottom-6 left-0 right-0 px-4 md:px-8 z-50 flex justify-center">
          <div className="w-full max-w-2xl bg-white dark:bg-[#18181b] backdrop-blur-2xl border border-zinc-200 dark:border-white/10 rounded-2xl p-4 shadow-2xl ring-1 ring-black/5 dark:ring-white/5 animate-in slide-in-from-bottom-8 fade-in duration-300">
            
            {(() => {
              const { title, color, icon } = getActionDetails(activeToolCall);
              const isShowingDetails = showDetails[activeToolCall.id];
              
              return (
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-${color}-50 dark:bg-${color}-500/10 flex items-center justify-center flex-shrink-0 ring-1 ring-${color}-500/20`}>
                        {icon}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">{title}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Requires your approval
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onReject(activeToolCall.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors"
                        title="Reject"
                      >
                        <X className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onApprove(activeToolCall.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 text-white dark:bg-white dark:text-black font-medium text-sm rounded-full transition-all shadow-md hover:scale-[1.02] active:scale-95"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                        Approve
                      </button>
                    </div>
                  </div>
                  
                  {/* Expandable Details */}
                  <div className="mt-1 border-t border-zinc-100 dark:border-white/5 pt-3">
                    <button 
                      onClick={() => toggleDetails(activeToolCall.id)}
                      className="flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
                    >
                      <Code className="w-3.5 h-3.5" />
                      {isShowingDetails ? "Hide advanced details" : "Show advanced details"}
                    </button>
                    
                    {isShowingDetails && (
                      <div className="mt-3 bg-zinc-50 dark:bg-black/40 rounded-xl p-4 overflow-x-auto ring-1 ring-zinc-200 dark:ring-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                        <pre className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono leading-relaxed">
                          {JSON.stringify(activeToolCall.input, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "tool" || (message.role === "assistant" && !message.content)) {
    return null;
  }

  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] md:max-w-[75%] px-6 py-4 rounded-[24px] rounded-tr-[4px] bg-zinc-100 dark:bg-[#27272a] text-zinc-900 dark:text-zinc-100 text-[15px] leading-relaxed shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center shadow-sm">
        <svg className="w-4 h-4 text-white dark:text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 prose prose-zinc dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-50 dark:prose-pre:bg-black/50 prose-pre:ring-1 prose-pre:ring-zinc-200 dark:prose-pre:ring-white/10 prose-pre:rounded-xl max-w-none text-[15px] text-zinc-800 dark:text-zinc-200 pt-1">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content || ""}
        </ReactMarkdown>
      </div>
    </div>
  );
}
