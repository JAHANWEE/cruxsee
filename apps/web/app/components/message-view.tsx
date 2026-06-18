"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, X, Code, Cpu, Copy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, loading]);

  const pendingToolCalls = toolCalls.filter((tc) => tc.status === "waiting_confirmation");
  const hasPendingTools = pendingToolCalls.length > 0;
  const activeToolCall = pendingToolCalls[0];

  const isEmailSendCall = activeToolCall?.toolName === "run_script" && String((activeToolCall.input as any)?.code || "").includes("gmail.api.messages.send");
  const isEmailDraftPending = isEmailSendCall && messages.some(m => m.content?.includes("```email-draft"));

  return (
    <div className="flex-1 overflow-y-auto px-2 pt-8 pb-32 space-y-10 scrollbar-hide relative w-full">
      {messages.map((msg, idx) => {
        // Find if this message has associated tool calls (for now just matching by order/time roughly, or just attach active tool call to the last message)
        const isLast = idx === messages.length - 1;
        return (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            activeToolCall={isLast ? activeToolCall : undefined}
            onApprove={onApprove}
            onReject={onReject}
          />
        );
      })}

      {loading && agentStatus && !hasPendingTools && (
        <div className="flex items-center gap-3 px-4 py-2 opacity-70 animate-in fade-in duration-500 w-full max-w-[760px] mx-auto">
          <div className="flex gap-1.5">
            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-1.5 h-1.5 bg-secondary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs font-semibold tracking-widest text-secondary uppercase">{agentStatus}</span>
        </div>
      )}

      {/* Global Tool Approval (if not attached to a message draft) */}
      {hasPendingTools && activeToolCall && !isEmailDraftPending && (
        <div className="w-full max-w-[760px] mx-auto bg-glass-bg backdrop-blur-[40px] rounded-[28px] p-6 border border-glass-border shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-foreground font-medium text-[15px]">Action Required</h3>
                <p className="text-secondary text-sm">Cruxsee wants to use a tool on your behalf.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onApprove(activeToolCall.id)}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground font-medium text-sm rounded-full transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(activeToolCall.id)}
                disabled={loading}
                className="px-4 py-2 bg-black/5 dark:bg-white/5 text-foreground hover:bg-black/10 dark:hover:bg-white/10 font-medium text-sm rounded-full transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
          <div className="mt-4 bg-[#0F1115] rounded-xl p-4 overflow-x-auto border border-white/5">
             <pre className="text-[11px] text-[#A1A1AA] font-mono leading-relaxed">
               {JSON.stringify(activeToolCall.input, null, 2)}
             </pre>
          </div>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}

function MessageBubble({ 
  message, 
  activeToolCall, 
  onApprove, 
  onReject 
}: { 
  message: Message, 
  activeToolCall?: ToolCall, 
  onApprove: (id: string) => void, 
  onReject: (id: string) => void 
}) {
  const [showFooter, setShowFooter] = useState(false);

  if (message.role === "tool" || (message.role === "assistant" && !message.content)) {
    return null;
  }

  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end w-full max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[75%] px-6 py-4 rounded-[28px] bg-black/5 dark:bg-white/5 text-foreground text-[17px] leading-[1.65] border border-glass-border">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[760px] mx-auto bg-glass-bg backdrop-blur-[40px] rounded-[28px] border border-glass-border shadow-[0_4px_40px_rgba(0,0,0,0.02)] transition-all duration-300 group hover:shadow-[0_8px_50px_rgba(0,0,0,0.04)] animate-in fade-in zoom-in-[0.99] duration-200">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-md">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground tracking-wide">Cruxsee</span>
        </div>
        
        {/* Assistant Actions (Hover only) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-foreground transition-colors" title="Copy text">
            <Copy className="w-4 h-4" />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-secondary hover:text-foreground transition-colors" title="Retry">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 pb-6 text-[16px] text-foreground font-sans prose prose-zinc dark:prose-invert prose-p:leading-[1.65] prose-pre:bg-[#0F1115] prose-pre:border prose-pre:border-white/5 prose-pre:rounded-[16px] max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }: any) {
              const match = /language-([\w-]+)/.exec(className || "");
              const isEmailDraft = match && match[1] === "email-draft";
              
              if (!inline && isEmailDraft) {
                let draftData = { to: "", subject: "", body: "" };
                try {
                  draftData = JSON.parse(String(children).trim());
                } catch (e) {
                  console.error("Failed to parse email draft JSON", e);
                }
                
                const isPending = activeToolCall?.status === "waiting_confirmation" && 
                                 String((activeToolCall.input as any)?.code || "").includes("gmail.api.messages.send");
                
                return (
                  <div className="my-8 bg-background/50 rounded-2xl overflow-hidden border border-glass-border w-full not-prose shadow-sm">
                    <div className="px-5 py-4 border-b border-glass-border flex items-center">
                      <span className="text-secondary text-sm w-16 font-medium">To</span>
                      <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">{draftData.to}</span>
                    </div>
                    <div className="px-5 py-4 border-b border-glass-border flex items-center">
                      <span className="text-secondary text-sm w-16 font-medium">Subject</span>
                      <span className="text-sm font-medium text-foreground">{draftData.subject}</span>
                    </div>
                    <div className="p-5 min-h-[160px] text-[15px] whitespace-pre-wrap leading-[1.65] text-foreground/90">
                      {draftData.body}
                    </div>
                    {isPending ? (
                      <div className="bg-black/5 dark:bg-white/5 px-5 py-4 flex items-center justify-end gap-3 border-t border-glass-border">
                        <button 
                          onClick={() => activeToolCall && onReject(activeToolCall.id)}
                          className="text-secondary hover:text-destructive text-sm font-medium transition-colors px-4 py-2"
                        >
                          Discard
                        </button>
                        <button 
                          onClick={() => activeToolCall && onApprove(activeToolCall.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-md hover:scale-105 active:scale-95"
                        >
                          Send Email
                        </button>
                      </div>
                    ) : (
                      <div className="bg-black/5 dark:bg-white/5 px-5 py-4 border-t border-glass-border">
                        <span className="text-xs font-semibold text-secondary uppercase tracking-widest flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500" /> Dispatched
                        </span>
                      </div>
                    )}
                  </div>
                );
              }
              
              return !inline ? (
                <pre className={className} {...props}>
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              ) : (
                <code className={`bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono ${className}`} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {message.content || ""}
        </ReactMarkdown>
      </div>

      {/* Footer (Terminal Drawer) */}
      <div className="border-t border-glass-border">
        <button 
          onClick={() => setShowFooter(!showFooter)}
          className="w-full px-6 py-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-secondary hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-b-[28px]"
        >
          <span className="flex items-center gap-2"><Code className="w-4 h-4" /> Execution Details</span>
          {showFooter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showFooter && (
          <div className="px-6 pb-6 pt-2">
            <div className="bg-[#0F1115] rounded-xl p-4 font-mono text-[11px] leading-relaxed text-[#A1A1AA] border border-white/5 shadow-inner">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10 text-[#5AC8FA]">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                System ready.
              </div>
              No additional execution logs for this message.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
