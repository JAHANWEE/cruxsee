"use client";

import { useState, useEffect } from "react";
import type { Thread } from "../chat/page";
import { Plus, MessageSquare, Search, LogOut, PanelLeftClose, PanelLeftOpen, MoreHorizontal, Trash2 } from "lucide-react";
import { signOut, useSession } from "~/lib/auth-client";

interface SidebarProps {
  threads: Thread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewThread: () => void;
  onDeleteThread?: (id: string) => void;
}

export function Sidebar({ threads, activeThreadId, onSelectThread, onNewThread, onDeleteThread }: SidebarProps) {
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.thread-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div 
      className={`relative h-[calc(100vh-40px)] my-[20px] ml-[20px] flex flex-col rounded-[32px] overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] shrink-0 shadow-sm bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl border border-white/50 dark:border-white/5`}
      style={{
        width: collapsed ? "72px" : "280px"
      }}
    >
      <div className="p-4 flex flex-col gap-2 mt-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-8 h-8 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ${collapsed ? "mx-auto" : "ml-auto"}`}
          title="Toggle Sidebar"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <button
          onClick={onNewThread}
          className={`flex items-center gap-3 bg-indigo-50/80 hover:bg-indigo-100/80 border border-indigo-100/50 dark:bg-indigo-500/20 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm mt-4 ${collapsed ? "w-10 h-10 p-0 justify-center mx-auto" : "px-4 py-3.5 mx-2 justify-start"}`}
          title="New Chat"
        >
          <div className="flex items-center justify-center shrink-0">
            <Plus className="w-5 h-5" />
          </div>
          {!collapsed && <span className="font-semibold text-sm tracking-tight">New Chat</span>}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1 scrollbar-hide mt-4">
        {!collapsed && (
          <div className="px-3 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-[0.1em] mt-2 mb-1">
            Recent Chats
          </div>
        )}
        {/* Hide recent chats when collapsed */}
        {!collapsed && threads.map((thread) => (
          <div
            key={thread.id}
            className={`group relative w-full flex items-center gap-3 text-sm rounded-xl transition-all ${
              activeThreadId === thread.id
                ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-zinc-100 font-medium"
                : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/5 hover:text-zinc-800 dark:hover:text-zinc-200"
            } justify-start px-3 py-2.5`}
          >
            <div 
              className="flex items-center flex-1 min-w-0 cursor-pointer gap-3"
              onClick={() => onSelectThread(thread.id)}
              title={thread.title || "New Thread"}
            >
              <MessageSquare className={`w-4 h-4 shrink-0 transition-colors ${activeThreadId === thread.id ? "text-indigo-500" : ""}`} />
              <span className="truncate flex-1 text-left">{thread.title || "New Thread"}</span>
            </div>

            {onDeleteThread && (
              <div className="relative shrink-0 thread-menu-container">
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setOpenMenuId(openMenuId === thread.id ? null : thread.id); 
                  }}
                  className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors ${openMenuId === thread.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                
                {openMenuId === thread.id && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onDeleteThread(thread.id); 
                        setOpenMenuId(null); 
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* User profile */}
      <div className={`p-4 mt-auto border-t border-zinc-100 dark:border-zinc-800/50 ${collapsed ? "flex justify-center px-0" : ""}`}>
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center px-0 py-0" : "px-2 py-2"}`}>
          {session?.user?.image ? (
            <img src={session.user.image} alt="" className="w-8 h-8 rounded-full shrink-0 shadow-sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 shrink-0 shadow-sm" />
          )}
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100 truncate">{session?.user?.name || "User"}</p>
              </div>
              <button
                onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/"; } } })}
                className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
