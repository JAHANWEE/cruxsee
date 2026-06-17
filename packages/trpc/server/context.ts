import * as trpcExpress from "@trpc/server/adapters/express";
import { auth } from "@repo/auth";

export async function createContext(opts: trpcExpress.CreateExpressContextOptions) {
  const { req, res } = opts;
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
  return {
    req,
    res,
    user: session?.user || null,
    session: session?.session || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
