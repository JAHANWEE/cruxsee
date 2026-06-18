"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Plus, MessageSquare, Sparkles, X } from "lucide-react";
import type { Thread } from "../chat/page";

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  threads: Thread[];
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onTriggerAction: (action: "email" | "calendar" | "inbox") => void;
}

export function CommandPalette({ open, setOpen, threads, onSelectThread, onNewChat, onTriggerAction }: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [setOpen]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] px-4 backdrop-blur-sm bg-zinc-900/40"
    >
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800">
          <SearchIcon className="w-5 h-5 text-zinc-400 shrink-0" />
          <Command.Input 
            autoFocus 
            placeholder="Type a command or search..." 
            className="flex-1 px-3 py-4 bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 text-[15px]" 
          />
          <button 
            onClick={() => setOpen(false)} 
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Command.List className="max-h-[350px] overflow-y-auto p-2 scrollbar-hide">
          <Command.Empty className="py-6 text-center text-sm text-zinc-500">
            No results found.
          </Command.Empty>

          <Command.Group heading="Suggestions" className="px-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 mt-2">
            <Command.Item
              onSelect={() => { onNewChat(); setOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-white/10"
            >
              <Plus className="w-4 h-4 text-indigo-500" /> Start New Chat
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Quick Actions" className="px-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 mt-4">
            <Command.Item
              onSelect={() => { onTriggerAction("email"); setOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-white/10"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" /> Craft an Email
            </Command.Item>
            <Command.Item
              onSelect={() => { onTriggerAction("calendar"); setOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-white/10"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" /> Schedule an Event
            </Command.Item>
            <Command.Item
              onSelect={() => { onTriggerAction("inbox"); setOpen(false); }}
              className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-white/10"
            >
              <Sparkles className="w-4 h-4 text-indigo-500" /> Read Inbox
            </Command.Item>
          </Command.Group>

          {threads.length > 0 && (
            <Command.Group heading="Recent Chats" className="px-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1 mt-4">
              {threads.map(thread => (
                <Command.Item
                  key={thread.id}
                  value={thread.title || thread.id}
                  onSelect={() => { onSelectThread(thread.id); setOpen(false); }}
                  className="flex items-center gap-3 px-3 py-2.5 mt-1 rounded-xl text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/10 cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-white/10"
                >
                  <MessageSquare className="w-4 h-4 text-zinc-400" /> 
                  <span className="truncate">{thread.title || "New Thread"}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
