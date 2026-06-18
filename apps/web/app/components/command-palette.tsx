"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Plus, MessageSquare, Sparkles, Folder, Layers, FileText, AppWindow } from "lucide-react";
import type { Thread } from "../chat/page";

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  threads: Thread[];
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onTriggerAction: (action: "email" | "calendar" | "inbox" | "ainews") => void;
}

export function CommandPalette({ open, setOpen, threads, onSelectThread, onNewChat, onTriggerAction }: CommandPaletteProps) {
  const [search, setSearch] = useState("");

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

  // Handle closing when mouse moves away from the box
  useEffect(() => {
    if (!open) return;

    let isActive = false;
    // Wait 300ms before enforcing the mouse-out rule to prevent accidental closures right after opening
    const timer = setTimeout(() => {
      isActive = true;
    }, 300);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isActive) return;
      const palette = document.getElementById("command-palette-inner");
      if (!palette) return;

      const rect = palette.getBoundingClientRect();
      const padding = 200; // safe zone in pixels

      if (
        e.clientX < rect.left - padding ||
        e.clientX > rect.right + padding ||
        e.clientY < rect.top - padding ||
        e.clientY > rect.bottom + padding
      ) {
        setOpen(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [open, setOpen]);

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-transparent"
    >
      <div className="w-full flex justify-center">
        <div 
          id="command-palette-inner"
          className={`w-full max-w-[680px] bg-[#3a3a3c]/70 backdrop-blur-[60px] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] flex flex-col animate-in fade-in zoom-in-95 duration-200 transition-all ${search ? "rounded-2xl" : "rounded-full"}`}
        >
          {/* Top Pill Area */}
          <div className="flex items-center px-4 py-2 relative">
            <SearchIcon className="w-6 h-6 text-white/50 shrink-0 ml-2" />
            <Command.Input 
              autoFocus 
              value={search}
              onValueChange={setSearch}
              placeholder="Spotlight Search" 
              className="flex-1 px-4 py-3 bg-transparent outline-none text-white placeholder:text-white/50 text-[22px] font-light" 
            />
          </div>

          {/* Results List - Only visible when searching or we can show suggestions */}
          {search && (
            <div className="border-t border-white/10">
              <Command.List className="max-h-[400px] overflow-y-auto p-2 scrollbar-hide">
                <Command.Empty className="py-10 text-center text-sm text-white/50">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Suggestions" className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 mt-2">
                  <Command.Item
                    onSelect={() => { onNewChat(); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg text-[15px] text-white/90 cursor-default aria-selected:bg-[#0058d0] aria-selected:text-white group transition-colors"
                  >
                    <Plus className="w-4 h-4 text-white/50 group-aria-selected:text-white transition-colors" /> Start New Chat
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Quick Actions" className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 mt-4">
                  <Command.Item
                    onSelect={() => { onTriggerAction("email"); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg text-[15px] text-white/90 cursor-default aria-selected:bg-[#0058d0] aria-selected:text-white group transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-white/50 group-aria-selected:text-white transition-colors" /> Craft an Email
                  </Command.Item>
                  <Command.Item
                    onSelect={() => { onTriggerAction("calendar"); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg text-[15px] text-white/90 cursor-default aria-selected:bg-[#0058d0] aria-selected:text-white group transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-white/50 group-aria-selected:text-white transition-colors" /> Schedule an Event
                  </Command.Item>
                  <Command.Item
                    onSelect={() => { onTriggerAction("inbox"); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg text-[15px] text-white/90 cursor-default aria-selected:bg-[#0058d0] aria-selected:text-white group transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-white/50 group-aria-selected:text-white transition-colors" /> Read Inbox
                  </Command.Item>
                  <Command.Item
                    onSelect={() => { onTriggerAction("ainews"); setOpen(false); }}
                    className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg text-[15px] text-white/90 cursor-default aria-selected:bg-[#0058d0] aria-selected:text-white group transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-white/50 group-aria-selected:text-white transition-colors" /> AI News
                  </Command.Item>
                </Command.Group>

                {threads.length > 0 && (
                  <Command.Group heading="Recent Chats" className="px-3 text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 mt-4">
                    {threads.map(thread => (
                      <Command.Item
                        key={thread.id}
                        value={thread.title || thread.id}
                        onSelect={() => { onSelectThread(thread.id); setOpen(false); }}
                        className="flex items-center gap-3 px-3 py-2.5 mt-0.5 rounded-lg text-[15px] text-white/90 cursor-default aria-selected:bg-[#0058d0] aria-selected:text-white group transition-colors"
                      >
                        <MessageSquare className="w-4 h-4 text-white/50 group-aria-selected:text-white shrink-0 transition-colors" /> 
                        <span className="truncate">{thread.title || "New Thread"}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </div>
          )}
        </div>
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
