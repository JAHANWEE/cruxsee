import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [/^(?!@anthropic-ai\/claude-agent-sdk|@mastra\/core\/tools|@ai-sdk\/mcp|better-sqlite3|pg-native).*$/],
  external: [
    "@anthropic-ai/claude-agent-sdk",
    "@mastra/core/tools",
    "@ai-sdk/mcp",
  ],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
