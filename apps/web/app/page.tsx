"use client";

import { useSession, signIn, signOut } from "~/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = useSession();

  return (
    <main className="min-h-screen min-w-screen flex justify-center items-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight">Cruxsee</h1>
        <p className="text-muted-foreground">Work at inhumane speed.</p>

        {isPending ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : session ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              {session.user.image && (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-sm">{session.user.name || session.user.email}</span>
            </div>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() =>
              signIn.social({ provider: "google", callbackURL: "/" })
            }
            className="px-6 py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-md hover:opacity-90 transition-opacity font-medium"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </main>
  );
}
