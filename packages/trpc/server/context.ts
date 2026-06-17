import * as trpcExpress from "@trpc/server/adapters/express";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";

export async function createContext(opts: trpcExpress.CreateExpressContextOptions) {
  const { req, res } = opts;
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  return {
    req,
    res,
    user: session?.user || null,
    session: session?.session || null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
