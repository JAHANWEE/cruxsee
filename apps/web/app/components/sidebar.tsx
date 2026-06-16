"use client";

import type { Thread } from "../page";
import { Plus, MessageSquare, Menu } from "lucide-react";

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
}

export function Sidebar({ threads, activeThreadId, onSelectThread, onNewThread }: SidebarProps) {
  return (
    <div className="w-[280px] h-full flex flex-col bg-[#09090b] border-r border-white/5">
      <div className="p-4">
        <button
          onClick={onNewThread}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#18181b] hover:bg-[#27272a] border border-white/5 text-zinc-100 rounded-xl transition-all shadow-sm group"
        >
          <span className="text-sm font-medium tracking-wide">New Chat</span>
          <div className="bg-white/10 p-1 rounded-md group-hover:bg-white/20 transition-colors">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-hide">
        <div className="px-3 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Recent
        </div>
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 text-sm rounded-xl transition-all group ${
              activeThreadId === thread.id
                ? "bg-[#18181b] text-white shadow-sm ring-1 ring-white/5"
                : "text-zinc-400 hover:bg-[#18181b]/50 hover:text-zinc-200"
            }`}
          >
            <MessageSquare className={`w-4 h-4 flex-shrink-0 transition-colors ${activeThreadId === thread.id ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"}`} />
            <span className="truncate text-left font-medium">{thread.title || "New Thread"}</span>
          </button>
        ))}
        {threads.length === 0 && (
          <div className="px-3 py-8 text-center">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-4 h-4 text-zinc-500" />
            </div>
            <p className="text-xs text-zinc-500 font-medium">No history yet</p>
          </div>
        )}
      </div>
      
      {/* User profile / bottom area placeholder */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#18181b] cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">Workspace</p>
            <p className="text-xs text-zinc-500 truncate">Manage settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
