"use client";

import { useState, useRef, useCallback } from "react";
import { ArrowUp } from "lucide-react";

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
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 250) + "px";
  };

  return (
    <div className="w-full px-4 pb-6 pt-2">
      <div className="relative flex items-end w-full max-w-3xl mx-auto bg-[#18181b] rounded-3xl shadow-lg ring-1 ring-white/10 focus-within:ring-white/20 transition-all overflow-hidden backdrop-blur-sm">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask Cruxsee anything..."
          disabled={disabled}
          rows={1}
          className="flex-1 max-h-[250px] resize-none bg-transparent px-5 py-4 text-[15px] leading-relaxed outline-none text-zinc-100 placeholder:text-zinc-500 disabled:opacity-50 scrollbar-hide"
        />
        <div className="p-2 pl-0">
          <button
            onClick={handleSubmit}
            disabled={disabled || !value.trim()}
            className="flex items-center justify-center w-9 h-9 bg-white text-black rounded-full disabled:opacity-20 disabled:bg-white/20 disabled:text-white hover:bg-zinc-200 transition-all active:scale-95"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
      <p className="text-center text-[11px] font-medium tracking-wide text-zinc-500 mt-3 uppercase">
        Cruxsee executes real actions. Review tool calls carefully.
      </p>
    </div>
  );
}
