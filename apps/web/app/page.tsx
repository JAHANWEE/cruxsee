"use client";

import { useSession, signIn, signOut } from "~/lib/auth-client";
import Link from "next/link";
import { ArrowRight, Mail, Calendar, Zap, Lock, BookOpen } from "lucide-react";

export default function Home() {
  const { data: session, isPending } = useSession();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-zinc-900">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded-md flex items-center justify-center">
            <Zap className="w-5 h-5 text-white dark:text-zinc-900" />
          </div>
          <span className="font-bold text-xl tracking-tight">Cruxsee</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Terms</Link>
          <Link href="/help" className="hover:text-zinc-900 dark:hover:text-white transition-colors">Support</Link>
        </nav>
        <div>
          {!isPending && (
            session ? (
              <Link href="/chat" className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-medium">
                Go to App
              </Link>
            ) : (
              <button
                onClick={() => signIn.social({ provider: "google", callbackURL: "/chat" })}
                className="px-4 py-2 text-sm bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-opacity font-medium"
              >
                Sign In
              </button>
            )
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 sm:py-32">
        <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tighter leading-[1.1] bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500 bg-clip-text text-transparent">
            Work at inhumane speed.
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Cruxsee connects your emails, calendar, and workflows into a single autonomous intelligence. Delegate tasks and get hours back every week.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isPending ? (
               <div className="px-8 py-4 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse w-48 h-14" />
            ) : session ? (
              <Link href="/chat" className="flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-all hover:scale-105 font-medium text-lg">
                Enter Workspace <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <button
                onClick={() => signIn.social({ provider: "google", callbackURL: "/chat" })}
                className="flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-full hover:opacity-90 transition-all hover:scale-105 font-medium text-lg shadow-xl shadow-zinc-900/20 dark:shadow-white/10"
              >
                Get Started with Google <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mt-32 text-left">
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <Mail className="w-8 h-8 mb-4 text-zinc-900 dark:text-white" />
            <h3 className="text-xl font-semibold mb-2">Email Autopilot</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">Let the AI draft, reply, and sort your inbox automatically. You just approve the final actions.</p>
          </div>
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <Calendar className="w-8 h-8 mb-4 text-zinc-900 dark:text-white" />
            <h3 className="text-xl font-semibold mb-2">Calendar Mgmt</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">Cruxsee books meetings, finds available slots, and handles the back-and-forth scheduling ping-pong.</p>
          </div>
          <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow">
            <Lock className="w-8 h-8 mb-4 text-zinc-900 dark:text-white" />
            <h3 className="text-xl font-semibold mb-2">Private & Secure</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">Your data remains yours. Cruxsee uses secure OAuth and never trains public models on your personal emails.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-200 dark:border-zinc-800 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-500 dark:text-zinc-500">
          <p>© {new Date().getFullYear()} Cruxsee. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Terms of Service</Link>
            <Link href="/help" className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors">Help & Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
