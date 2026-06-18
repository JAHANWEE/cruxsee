"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ArrowUp, Paperclip, Sparkles, Mail, Calendar, Square, Newspaper } from "lucide-react";

interface ComposerProps {
  onSend: (content: string, action?: "email" | "calendar" | "inbox" | "ainews") => void;
  disabled: boolean;
  isInitial?: boolean;
  onStop?: () => void;
}

const PLACEHOLDERS = [
  "Initiate a query or send a command to the AI...",
  "Ask Cruxsee anything...",
  "Summarize my emails...",
  "Review latest PRs...",
  "Schedule a meeting..."
];

export function Composer({ onSend, disabled, isInitial, onStop }: ComposerProps) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  return (
    <div className={`w-full max-w-[800px] mx-auto ${isInitial ? "pb-0" : "px-4 pb-8"}`}>
      <div 
        className={`relative flex flex-col w-full bg-white dark:bg-[#18181b] rounded-[24px] transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border ${
          isFocused ? "border-indigo-500/30 shadow-[0_8px_30px_rgba(99,102,241,0.08)]" : "border-zinc-100 dark:border-zinc-800"
        }`}
      >
        <div className="flex items-start px-5 pt-5 pb-2 relative">
          {!value && (
            <div className="absolute left-6 top-[22px] pointer-events-none text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => { setShowPlusMenu(false); }, 150);
            }}
            placeholder={PLACEHOLDERS[placeholderIndex]}
            disabled={disabled}
            rows={1}
            className={`flex-1 max-h-[200px] resize-none bg-transparent ${value ? "pl-1" : "pl-7"} text-[15px] leading-[1.65] outline-none text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 disabled:opacity-50 scrollbar-hide transition-[height] duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]`}
          />
        </div>
        
        <div className="flex items-center justify-between px-4 pb-4 mt-2">
          <div className="flex items-center gap-2 relative">
            {/* Attachment Button & Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              {showPlusMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <Mail className="w-4 h-4 text-indigo-500" /> Gmail
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                    <Calendar className="w-4 h-4 text-indigo-500" /> Google Calendar
                  </button>
                </div>
              )}
            </div>

            {/* Action Pills */}
            <div className="flex flex-wrap items-center gap-2 ml-2 hidden sm:flex">
              <button 
                type="button"
                onClick={() => onSend("Craft a mail", "email")}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" /> Craft a mail
              </button>
              <button 
                type="button"
                onClick={() => onSend("Schedule an event", "calendar")}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" /> Schedule an event
              </button>
              <button 
                type="button"
                onClick={() => onSend("Read inbox", "inbox")}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" /> Read inbox
              </button>
              <button 
                type="button"
                onClick={() => onSend("Fetch top 10 AI news", "ainews")}
                className="px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              >
                <Newspaper className="w-3 h-3 text-indigo-500" /> AI News
              </button>
            </div>
          </div>

          {disabled ? (
            <button
              onClick={onStop}
              className="flex items-center justify-center w-10 h-10 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[14px] transition-all hover:scale-105 active:scale-95 shadow-md animate-pulse"
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="flex items-center justify-center w-10 h-10 bg-indigo-500 text-white rounded-[14px] disabled:opacity-30 disabled:bg-indigo-500/50 transition-all hover:scale-105 active:scale-95 shadow-md"
              title="Send message"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
