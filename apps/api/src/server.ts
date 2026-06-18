import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { sql } from "drizzle-orm";
import { logger } from "@repo/logger";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "@repo/auth";

import * as trpcExpress from "@trpc/server/adapters/express";
import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";
import { apiReference } from "@scalar/express-api-reference";

import { serverRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";
import { corsair } from "@repo/corsair";
import { toExpressHandler } from "corsair";
import { generateOAuthUrl, processOAuthCallback } from "corsair/oauth";
import { db, eq } from "@repo/database";

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Cruxsee API",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

app.use(
  cors({
    origin: env.NODE_ENV === "prod" || env.NODE_ENV === "production"
      ? [env.FRONTEND_URL || "https://chat.cruxsee.in", "https://home.cruxsee.in", "https://cruxsee.in", "https://www.cruxsee.in"]
      : ["http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json());

// ─── Better Auth ─────────────────────────────────────────────────────────
app.all("/api/auth/*splat", toNodeHandler(auth));

// ─── Corsair OAuth (DB-backed state, email enforcement) ──────────────────

const REDIRECT_URI = `${env.BASE_URL}/api/corsair/authCallback`;

const PLUGIN_SCOPES: Record<string, string[]> = {
  gmail: ["https://mail.google.com/"],
  googlecalendar: ["https://www.googleapis.com/auth/calendar"],
};

// OAuth state stored in the verification table (same one Better Auth uses)
async function storeOAuthState(state: string, userId: string, plugin: string): Promise<void> {
  await db.execute(
    sql`INSERT INTO verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") VALUES (${state}, ${userId}, ${plugin}, ${new Date(Date.now() + 10 * 60 * 1000)}, NOW(), NOW())`
  );
}

async function consumeOAuthState(state: string): Promise<{ userId: string; plugin: string } | null> {
  const result = await db.execute(
    sql`DELETE FROM verification WHERE id = ${state} AND "expiresAt" > NOW() RETURNING identifier, value`
  );
  const row = (result as any).rows?.[0] || (Array.isArray(result) ? result[0] : result);
  if (!row || !row.identifier) return null;
  return { userId: row.identifier, plugin: row.value };
}

app.get("/api/corsair/connect", async (req, res) => {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session?.user?.id) return res.status(401).json({ error: "Sign in first" });

  const tenantId = session.user.id;
  const plugin = req.query.plugin as string;

  if (!plugin || !PLUGIN_SCOPES[plugin]) return res.status(400).json({ error: "Invalid plugin" });

  try {
    const { url, state } = await generateOAuthUrl(corsair, plugin, {
      tenantId,
      redirectUri: REDIRECT_URI,
      loginHint: session.user.email, // Enforces the connected email matches
      scopes: PLUGIN_SCOPES[plugin],
    });

    await storeOAuthState(state, tenantId, plugin);
    res.redirect(url);
  } catch (err: any) {
    logger.error("Corsair connect failed", { error: err.message, plugin, userId: tenantId });
    res.status(500).json({ error: "Failed to initiate connection" });
  }
});

app.get("/api/corsair/authCallback", async (req, res) => {
  const { code, state, error } = req.query as { code: string; state: string; error: string };

  if (error) return res.status(400).send(`<h2>Auth failed</h2><p>${error}</p>`);
  if (!code || !state) return res.status(400).send("Missing code or state");

  const stateData = await consumeOAuthState(state);
  if (!stateData) return res.status(400).send("Invalid or expired state.");

  try {
    const result = await processOAuthCallback(corsair, { code, state, redirectUri: REDIRECT_URI });

    res.send(`
      <html><body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fafafa;">
        <div style="text-align: center; background: white; padding: 40px; border-radius: 24px; box-shadow: 0 10px 40px rgba(0,0,0,0.08);">
          <div style="width: 48px; height: 48px; border-radius: 24px; background: #10B981; color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 style="margin: 0 0 8px;">Successfully Connected</h2>
          <p style="margin: 0 0 16px; color: #52525B;"><strong>${result.plugin}</strong> is now securely linked to your account.</p>
          <p style="color: #A1A1AA; font-size: 0.875rem;">This window will close automatically...</p>
          <script>setTimeout(() => window.close(), 1500);</script>
        </div>
      </body></html>
    `);
  } catch (err: any) {
    logger.error("OAuth callback failed", { error: err.message });
    res.status(500).send(`<h2>Connection failed</h2><p>${err.message}</p>`);
  }
});

// Corsair handler for other endpoints (webhooks, etc)
app.use("/api/corsair", toExpressHandler(corsair, { basePath: "/api/corsair" }));

// ─── Core Routes ─────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  return res.json({ message: "Cruxsee API is up and running" });
});

app.get("/health", (req, res) => {
  return res.json({ message: "healthy", healthy: true });
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);
app.get("/openapi.json", (req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);
app.use("/docs", apiReference({ url: "/openapi.json" }));

app.use(
  "/rest",
  createOpenApiExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
