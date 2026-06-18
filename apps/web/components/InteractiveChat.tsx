"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const prompts = [
  { id: "draft", text: "Draft an email", response: "Sure, who would you like to email and what's the topic?" },
  { id: "schedule", text: "What's on my schedule", response: "You have 3 meetings today. Your next one is 'Team Sync' at 10:00 AM." },
  { id: "event", text: "Create an event", response: "I can help with that. What's the name of the event and when is it?" },
];

export default function InteractiveChat() {
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string; id: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handlePromptClick = (promptId: string) => {
    if (activePrompt) return; // Prevent clicking multiple while animating
    
    const selected = prompts.find(p => p.id === promptId);
    if (!selected) return;

    setActivePrompt(promptId);
    
    // Add User Message
    setMessages([{ role: "user", text: selected.text, id: Date.now().toString() }]);
    setIsTyping(true);

    // Simulate AI response delay
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [
        ...prev, 
        { role: "ai", text: selected.response, id: (Date.now() + 1).toString() }
      ]);
      
      // Auto reset after 5 seconds to let them try another
      setTimeout(() => {
        setMessages([]);
        setActivePrompt(null);
      }, 5000);
      
    }, 1200);
  };

  return (
    <div className="w-[800px] max-w-[90vw] bg-white/60 dark:bg-zinc-900/60 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-[32px] p-12 shadow-[0_8px_30px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center relative overflow-hidden pointer-events-auto" style={{ minHeight: '500px' }}>
      
      {/* Orb & Greeting Header */}
      <AnimatePresence>
        {messages.length === 0 && !isTyping && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
            className="text-center w-full relative z-10 flex flex-col items-center"
          >
            <div className="relative mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-200 via-blue-300 to-purple-400 opacity-90 shadow-[inset_-4px_-4px_10px_rgba(255,255,255,0.6),inset_4px_4px_10px_rgba(0,0,0,0.1),0_10px_20px_rgba(99,102,241,0.2)] animate-[pulse_6s_ease-in-out_infinite]" />
              <div className="w-24 h-24 rounded-full bg-indigo-400 blur-3xl opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h2 className="text-[28px] font-semibold tracking-tight text-zinc-800 dark:text-zinc-100 mb-1">
              Good Morning
            </h2>
            <p className="text-[24px] font-medium mb-10 text-zinc-800 dark:text-zinc-100">
              How Can I <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Assist You Today?</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div className="w-full max-w-[600px] flex flex-col gap-4 z-20">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`px-5 py-3.5 rounded-2xl text-[15px] max-w-[85%] leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white rounded-br-sm" 
                    : "bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 rounded-tl-sm border border-zinc-100 dark:border-zinc-800 shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex w-full justify-start"
            >
               <div className="px-5 py-4 rounded-2xl bg-white dark:bg-zinc-800/50 rounded-tl-sm border border-zinc-100 dark:border-zinc-800 shadow-sm flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-bounce" style={{ animationDelay: "300ms" }} />
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Composer Input Area */}
      <div className="w-full max-w-[600px] mt-auto z-20">
        <AnimatePresence>
          {!activePrompt && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-2 flex-wrap mb-4 justify-center"
            >
              {prompts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePromptClick(p.id)}
                  className="px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-[13px] font-medium text-zinc-600 dark:text-zinc-300 transition-all border border-zinc-200 dark:border-zinc-700 shadow-sm hover:shadow-md cursor-pointer hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                >
                  <span className="text-indigo-500">✨</span> {p.text}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fake Input Box */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center">
           <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-zinc-400">
             <span className="text-lg">📎</span>
           </div>
           <div className="flex-1 px-3 text-zinc-400 text-sm">
             Ask Cruxsee anything...
           </div>
           <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 text-white">
             <span className="text-sm">↑</span>
           </div>
        </div>
      </div>
    </div>
  );
}
