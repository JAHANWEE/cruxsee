"use client";

import { useEffect, useRef } from "react";
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

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {pendingToolCalls.length > 0 && (
        <div className="space-y-3">
          {pendingToolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} onApprove={onApprove} onReject={onReject} />
          ))}
        </div>
      )}

      {loading && agentStatus && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">{agentStatus}</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "tool") {
    return (
      <div className="ml-8 px-3 py-2 bg-zinc-100 dark:bg-zinc-900 rounded-md text-xs font-mono">
        <span className="text-muted-foreground">Tool result:</span>
        <pre className="mt-1 whitespace-pre-wrap">{message.content}</pre>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
          isUser
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
        }`}
      >
        {message.content || <span className="text-muted-foreground italic">...</span>}
      </div>
    </div>
  );
}

function ToolCallCard({
  toolCall,
  onApprove,
  onReject,
}: {
  toolCall: ToolCall;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-amber-400 rounded-full" />
        <span className="text-sm font-medium">Wants to call: {toolCall.toolName}</span>
      </div>
      <pre className="text-xs bg-zinc-100 dark:bg-zinc-800 p-2 rounded overflow-x-auto">
        {JSON.stringify(toolCall.input, null, 2)}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={() => onApprove(toolCall.id)}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Approve
        </button>
        <button
          onClick={() => onReject(toolCall.id)}
          className="px-3 py-1.5 text-xs bg-zinc-200 dark:bg-zinc-700 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
