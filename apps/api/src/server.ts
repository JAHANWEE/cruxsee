import express from "express";
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

export const app = express();
const openApiDocument = generateOpenApiDocument(serverRouter, {
  title: "Cruxsee API",
  version: "1.0.0",
  baseUrl: env.BASE_URL.concat("/api"),
});

app.use(
  cors({
    origin: env.NODE_ENV === "prod"
      ? [env.FRONTEND_URL || "https://chat.cruxsee.in", "https://home.cruxsee.in"]
      : ["http://localhost:3000"],
    credentials: true,
  }),
);

app.use(express.json());

// Better Auth handler — handles /api/auth/*
app.all("/api/auth/*splat", toNodeHandler(auth));

import { generateOAuthUrl, processOAuthCallback } from "corsair/oauth";

const REDIRECT_URI = `${env.BASE_URL}/api/corsair/authCallback`;
const pendingStates = new Set<string>();

app.get("/api/corsair/connect", async (req, res) => {
  const tenantId = req.query.tenantId as string;
  const plugin = req.query.plugin as string;

  if (!tenantId || !plugin) {
    return res.status(400).send("Missing tenantId or plugin");
  }

  try {
    const { url, state } = await generateOAuthUrl(corsair, plugin, {
      tenantId,
      redirectUri: REDIRECT_URI,
    });
    pendingStates.add(state);
    res.redirect(url);
  } catch (err: any) {
    res.status(500).send(`Failed to generate URL: ${err.message}`);
  }
});

app.get("/api/corsair/authCallback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) return res.status(400).send(`<html><body><h2>Authorization failed</h2><p>${error}</p></body></html>`);
  if (!code || !state) return res.status(400).send("Missing code or state");
  
  if (!pendingStates.has(state)) return res.status(400).send("Invalid state");
  pendingStates.delete(state);

  try {
    const result = await processOAuthCallback(corsair, {
      code,
      state,
      redirectUri: REDIRECT_URI,
    });
    res.send(`<html><body><h2>Connected!</h2><p>Plugin <strong>${result.plugin}</strong> authorized. You can close this window and ask the AI to retry.</p></body></html>`);
  } catch (err: any) {
    res.status(500).send(`<html><body><h2>OAuth error</h2><p>${err.message}</p></body></html>`);
  }
});

// Corsair handler — handles /api/corsair/*
app.use("/api/corsair", toExpressHandler(corsair, { basePath: "/api/corsair" }));

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
