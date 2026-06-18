"use client";

import { useState, useEffect, useRef } from "react";
import { Link2, Check, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ConnectPromptProps {
  plugin: string;
  onConnected: () => void;
}

/**
 * Renders when the agent detects auth-missing.
 * Opens a popup for OAuth, auto-detects when it closes, and triggers retry.
 */
export function ConnectPromptCard({ plugin, onConnected }: ConnectPromptProps) {
  const [state, setState] = useState<"idle" | "connecting" | "connected">("idle");
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pluginLabel = plugin === "gmail" ? "Gmail" : plugin === "googlecalendar" ? "Google Calendar" : plugin;

  function handleConnect() {
    setState("connecting");

    // Open popup centered on screen
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    popupRef.current = window.open(
      `${API_URL}/api/corsair/connect?plugin=${plugin}`,
      "corsair-connect",
      `width=${width},height=${height},left=${left},top=${top},popup=yes`
    );

    // Poll for popup close
    pollRef.current = setInterval(() => {
      if (popupRef.current?.closed) {
        clearInterval(pollRef.current!);
        pollRef.current = null;
        setState("connected");
        // Give the server a moment to process, then signal connected
        setTimeout(() => onConnected(), 500);
      }
    }, 500);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  if (state === "connected") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 max-w-[500px]">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Check className="w-3.5 h-3.5 text-white" />
        </div>
        <p className="text-sm font-medium text-green-800 dark:text-green-200">
          {pluginLabel} connected successfully. Retrying your request...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[500px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-[#1a1a1d] shadow-md overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Connect {pluginLabel}</h3>
            <p className="text-xs text-zinc-500">One-time authorization to access your account</p>
          </div>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          I need permission to access your {pluginLabel} account. This is a secure, one-time setup — your credentials are encrypted and never shared.
        </p>

        <button
          onClick={handleConnect}
          disabled={state === "connecting"}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
        >
          {state === "connecting" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for authorization...
            </>
          ) : (
            <>
              <Link2 className="w-4 h-4" />
              Authorize {pluginLabel}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
