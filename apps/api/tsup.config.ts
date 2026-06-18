import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/index.ts"],
  external: [
    // Native modules that can't be bundled
    "pg",
    "pg-pool",
    "pg-native",
    // AI SDK packages with complex internals
    "@ai-sdk/mcp",
    "@ai-sdk/openai",
    "@corsair-dev/mcp",
    // MCP transport needs Node streams
    "better-sqlite3",
  ],
  noExternal: [/.*/],
  splitting: false,
  bundle: true,
  outDir: "./dist",
  clean: true,
  env: { IS_SERVER_BUILD: "true" },
  loader: { ".json": "copy" },
  minify: true,
  sourcemap: false,
});
