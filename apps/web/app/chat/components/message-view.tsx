"use client";

import { useEffect, useRef } from "react";
import type { Message, ToolCall } from "../page";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";

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
  // We can just show the first pending tool call in the modal to process them one by one.
  const activeToolCall = pendingToolCalls[0];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {loading && agentStatus && (
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="w-2 h-2 bg-zinc-400 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">{agentStatus}</span>
        </div>
      )}

      <div ref={bottomRef} />

      {/* Tool Approval Modal */}
      <Dialog open={hasPendingTools}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Action Required</DialogTitle>
            <DialogDescription>
              The agent wants to execute a tool on your behalf. Please review the details below.
            </DialogDescription>
          </DialogHeader>
          
          {activeToolCall && (
            <div className="space-y-4 my-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-400 rounded-full" />
                <span className="text-sm font-medium">Tool: {activeToolCall.toolName}</span>
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900 rounded-md p-3 max-h-60 overflow-y-auto">
                <pre className="text-xs">
                  {JSON.stringify(activeToolCall.input, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              onClick={() => activeToolCall && onReject(activeToolCall.id)}
              className="px-4 py-2 text-sm font-medium bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-md hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={() => activeToolCall && onApprove(activeToolCall.id)}
              className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Approve Action
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
