"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, X, ShieldAlert } from "lucide-react";
import type { Message, ToolCall } from "../page";

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, loading]);

  const pendingToolCalls = toolCalls.filter((tc) => tc.status === "waiting_confirmation");
  const hasPendingTools = pendingToolCalls.length > 0;
  const activeToolCall = pendingToolCalls[0];

  return (
    <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-8 pb-4 space-y-8 scrollbar-hide relative">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {loading && agentStatus && (
        <div className="flex items-center gap-3 px-4 py-2 opacity-70">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs font-medium tracking-wide text-zinc-400 uppercase">{agentStatus}</span>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />

      {/* Premium Tool Approval Modal */}
      {hasPendingTools && activeToolCall && (
        <div className="absolute bottom-4 left-4 right-4 md:left-8 md:right-8 z-50">
          <div className="bg-[#18181b]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl ring-1 ring-black/50 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0 ring-1 ring-amber-500/20">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Action Required</h3>
                  <p className="text-sm text-zinc-400">Agent wants to execute <span className="text-zinc-200 font-mono text-xs px-1 py-0.5 bg-white/5 rounded">{activeToolCall.toolName}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onReject(activeToolCall.id)}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  title="Reject"
                >
                  <X className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onApprove(activeToolCall.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-zinc-200 font-medium text-sm rounded-full transition-all shadow-lg shadow-white/5 hover:scale-105 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
            
            <div className="mt-4 bg-black/40 rounded-xl p-4 overflow-x-auto ring-1 ring-white/5">
              <pre className="text-xs text-zinc-300 font-mono leading-relaxed">
                {JSON.stringify(activeToolCall.input, null, 2)}
              </pre>
            </div>
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
        <div className="max-w-[80%] md:max-w-[70%] px-5 py-3.5 rounded-3xl rounded-tr-sm bg-[#27272a] text-zinc-100 text-[15px] leading-relaxed shadow-sm ring-1 ring-white/5">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4 w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
        <svg className="w-5 h-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0 prose prose-invert prose-p:leading-relaxed prose-pre:bg-black/50 prose-pre:ring-1 prose-pre:ring-white/10 prose-pre:rounded-xl max-w-none text-[15px] text-zinc-200 pt-1.5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {message.content || ""}
        </ReactMarkdown>
      </div>
    </div>
  );
}
