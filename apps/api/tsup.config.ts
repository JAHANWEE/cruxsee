import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  noExternal: [
    // Bundle everything EXCEPT the externals below
    /^(?!pg$|pg-pool$|pg-native$|better-sqlite3$|@ai-sdk\/mcp$|@ai-sdk\/openai$|@corsair-dev\/mcp$|@anthropic-ai\/claude-agent-sdk$|@mastra\/core).*$/,
  ],
  external: [
    "pg",
    "pg-pool",
    "pg-native",
    "better-sqlite3",
    "@ai-sdk/mcp",
    "@ai-sdk/openai",
    "@corsair-dev/mcp",
    "@anthropic-ai/claude-agent-sdk",
    "@mastra/core/tools",
    "@mastra/core",
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
