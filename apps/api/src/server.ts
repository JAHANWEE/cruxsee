import "dotenv/config";
import express from "express";
import crypto from "node:crypto";
import { logger } from "@repo/logger";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
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
    origin: env.NODE_ENV === "prod"
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
// Fields: id (state), identifier (userId), value (plugin), expiresAt
async function storeOAuthState(state: string, userId: string, plugin: string): Promise<void> {
  await db.execute({
    sql: `INSERT INTO verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, NOW(), NOW())`,
    params: [state, userId, plugin, new Date(Date.now() + 10 * 60 * 1000)] // 10 min TTL
  } as any);
}

async function consumeOAuthState(state: string): Promise<{ userId: string; plugin: string } | null> {
  const result = await db.execute({
    sql: `DELETE FROM verification WHERE id = $1 AND "expiresAt" > NOW() RETURNING identifier, value`,
    params: [state]
  } as any);
  const row = (result as any).rows?.[0];
  if (!row) return null;
  return { userId: row.identifier, plugin: row.value };
}

app.get("/api/corsair/connect", async (req, res) => {
  // Authenticated users only
  const session = await auth.api.getSession({ headers: new Headers(req.headers as Record<string, string>) });
  if (!session?.user?.id) {
    return res.status(401).json({ error: "Sign in first" });
  }

  const tenantId = session.user.id;
  const plugin = req.query.plugin as string;

  if (!plugin || !PLUGIN_SCOPES[plugin]) {
    return res.status(400).json({ error: "Invalid or missing plugin. Supported: gmail, googlecalendar" });
  }

  try {
    const { url, state } = await generateOAuthUrl(corsair, plugin, {
      tenantId,
      redirectUri: REDIRECT_URI,
      loginHint: session.user.email, // Guide user to same account
      scopes: PLUGIN_SCOPES[plugin],
    });

    // Store state in DB (survives restarts, works multi-instance)
    await storeOAuthState(state, tenantId, plugin);

    res.redirect(url);
  } catch (err: any) {
    logger.error("Corsair connect failed", { error: err.message, plugin, userId: tenantId });
    res.status(500).json({ error: "Failed to initiate connection" });
  }
});

app.get("/api/corsair/authCallback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    return res.status(400).send(`<html><body><h2>Authorization failed</h2><p>${error}</p><p><a href="/">Return</a></p></body></html>`);
  }
  if (!code || !state) {
    return res.status(400).send("Missing code or state");
  }

  // Validate and consume state from DB (atomic — prevents replay)
  const stateData = await consumeOAuthState(state);
  if (!stateData) {
    return res.status(400).send("Invalid or expired authorization state. Please try connecting again.");
  }

  try {
    const result = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: REDIRECT_URI,
    });

    logger.info("Corsair plugin connected", { plugin: result.plugin, userId: stateData.userId });

    const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
    res.send(`
      <html><body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h2>✓ Connected</h2>
          <p><strong>${result.plugin}</strong> is now linked to your account.</p>
          <p>You can close this window and return to <a href="${frontendUrl}/chat">Cruxsee</a>.</p>
        </div>
      </body></html>
    `);
  } catch (err: any) {
    logger.error("Corsair OAuth callback failed", { error: err.message, state: stateData });
    res.status(500).send(`<html><body><h2>Connection failed</h2><p>${err.message}</p><p><a href="/">Try again</a></p></body></html>`);
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
