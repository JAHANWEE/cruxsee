"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, Paperclip } from "lucide-react";

interface EmailDraftProps {
  to: string;
  subject: string;
  body: string;
  onSend: (data: { to: string; subject: string; body: string }) => void;
  onDiscard: () => void;
  disabled?: boolean;
}

export function EmailDraftCard({ to, subject, body, onSend, onDiscard, disabled }: EmailDraftProps) {
  const [draft, setDraft] = useState({ to, subject, body });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.style.height = "auto";
      bodyRef.current.style.height = bodyRef.current.scrollHeight + "px";
    }
  }, [draft.body]);

  return (
    <div className="w-full max-w-[600px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1a1a1d] shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">New Message</span>
        <button
          onClick={onDiscard}
          disabled={disabled}
          className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* To field */}
      <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 px-4 py-2">
        <span className="text-sm text-zinc-400 w-14 flex-shrink-0">To</span>
        <input
          type="email"
          value={draft.to}
          onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
          disabled={disabled}
          className="flex-1 text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          placeholder="recipient@email.com"
        />
      </div>

      {/* Subject field */}
      <div className="flex items-center border-b border-zinc-100 dark:border-zinc-800 px-4 py-2">
        <span className="text-sm text-zinc-400 w-14 flex-shrink-0">Subject</span>
        <input
          type="text"
          value={draft.subject}
          onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
          disabled={disabled}
          className="flex-1 text-sm bg-transparent outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          placeholder="Subject"
        />
      </div>

      {/* Body */}
      <div className="px-4 py-3 min-h-[120px]">
        <textarea
          ref={bodyRef}
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          disabled={disabled}
          rows={4}
          className="w-full text-sm bg-transparent outline-none resize-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 leading-relaxed"
          placeholder="Compose email..."
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSend(draft)}
            disabled={disabled || !draft.to.trim() || !draft.body.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
          <button
            onClick={onDiscard}
            disabled={disabled}
            className="px-3 py-2 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

/** Sent confirmation (replaces the draft after sending) */
export function EmailSentCard({ to, subject }: { to: string; subject: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 max-w-[600px]">
      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">Email sent to {to}</p>
        <p className="text-xs text-green-600 dark:text-green-400">{subject}</p>
      </div>
    </div>
  );
}
