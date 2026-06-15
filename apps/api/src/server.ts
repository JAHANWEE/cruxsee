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
