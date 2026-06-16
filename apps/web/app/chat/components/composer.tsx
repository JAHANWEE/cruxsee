"use client";

import { useState, useRef, useCallback } from "react";

interface ComposerProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function Composer({ onSend, disabled }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Message Cruxsee..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !value.trim()}
          className="px-4 py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-sm font-medium disabled:opacity-30 hover:opacity-90 transition-opacity"
        >
          Send
        </button>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-2">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  );
}
