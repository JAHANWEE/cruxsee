"use client";

import type { Thread } from "../page";
import { MessageSquare, Plus, PanelLeftClose } from "lucide-react";

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
}

export function Sidebar({ threads, activeThreadId, onSelectThread, onNewThread }: SidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950/50">
      <div className="p-3">
        <button
          onClick={onNewThread}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Recent
        </div>
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
              activeThreadId === thread.id
                ? "bg-zinc-200/50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 font-medium"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-300"
            }`}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="truncate text-left">{thread.title || "New Thread"}</span>
          </button>
        ))}
        {threads.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground text-center">No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
