"use client";

import type { Thread } from "../page";

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
}

export function Sidebar({ threads, activeThreadId, onSelectThread, onNewThread }: SidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onNewThread}
          className="w-full px-3 py-2 text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-md hover:opacity-90 transition-opacity"
        >
          + New Thread
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`w-full text-left px-3 py-2.5 text-sm truncate border-b border-zinc-100 dark:border-zinc-900 transition-colors ${
              activeThreadId === thread.id
                ? "bg-zinc-200 dark:bg-zinc-800"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-900"
            }`}
          >
            {thread.title || "New Thread"}
          </button>
        ))}
        {threads.length === 0 && (
          <p className="px-3 py-4 text-xs text-muted-foreground">No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
