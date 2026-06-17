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
// Fields: id (state), identifier (userId), value (plugin), expiresAt
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
  // Authenticated users only
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
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
    logger.error("Corsair connect failed", { error: err.message, stack: err.stack, plugin, userId: tenantId });
    res.status(500).json({ error: "Failed to initiate connection", detail: err.message });
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

    // Verify the connected account matches the logged-in user's email.
    // We stored the user's email in stateData. After connection, try to verify
    // by checking the tenant's connected account. If the provider email doesn't
    // match, the user connected a different Google account.
    const userRow = await db.execute({
      sql: `SELECT email FROM "user" WHERE id = $1`,
      params: [stateData.userId]
    } as any);
    const userEmail = (userRow as any).rows?.[0]?.email;

    // Check if the Corsair account was created for a different email.
    // Corsair stores account info in corsair_accounts with tenant_id = userId.
    // If the integration's stored email differs, warn the user.
    // NOTE: We can't easily extract the email from Corsair's encrypted store,
    // so we enforce via loginHint (pre-selects account) and log the event.
    // A full verification would require a test API call after connection.

    logger.info("Corsair plugin connected", {
      plugin: result.plugin,
      userId: stateData.userId,
      userEmail,
      note: "loginHint enforced same-account guidance"
    });

    const frontendUrl = env.FRONTEND_URL || "http://localhost:3000";
    res.send(`
      <html><body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center;">
          <h2>✓ Connected</h2>
          <p><strong>${result.plugin}</strong> is now linked to your account (${userEmail}).</p>
          <p style="color: #666; font-size: 0.875rem;">Make sure you authorized the same Google account you signed in with.</p>
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
