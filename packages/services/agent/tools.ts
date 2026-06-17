import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { buildCorsairToolDefs, type CorsairToolDef } from "@corsair-dev/mcp";
import { corsair } from "@repo/corsair";

// ─── Corsair MCP Tools ───────────────────────────────────────────────────

const mcpTools = buildCorsairToolDefs({ corsair });

const toolSchemas: Record<string, any> = {
  list_operations: {
    type: "object",
    properties: {
      plugin: { type: "string" },
      type: { type: "string", enum: ["api", "webhooks", "db"] },
    },
  },
  get_schema: {
    type: "object",
    properties: {
      path: { type: "string" },
    },
    required: ["path"],
  },
  run_script: {
    type: "object",
    properties: {
      code: { type: "string" },
    },
    required: ["code"],
  },
  corsair_setup: {
    type: "object",
    properties: {
      tenantId: { type: "string" },
    },
  },
};

export const toolDefinitions: ChatCompletionTool[] = mcpTools.map((t: CorsairToolDef) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: toolSchemas[t.name] || { type: "object", properties: {} },
  },
}));

// ─── Execution timeout (30 seconds max) ──────────────────────────────────

const TOOL_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tool "${label}" timed out after ${ms}ms`)), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// ─── Secure Tool Executor ─────────────────────────────────────────────────
// The tenantId is injected by the server from the authenticated session.
// The LLM never controls which tenant's data is accessed.

export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  tenantId: string, // ALWAYS from the authenticated session, never from LLM
): Promise<string> {
  const tool = mcpTools.find((t: CorsairToolDef) => t.name === toolName);
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  // For run_script: rewrite any corsair.withTenant(...) calls to use the enforced tenantId.
  // This prevents the LLM from accessing another user's data via prompt injection.
  let sanitizedInput = { ...input };
  if (toolName === "run_script" && typeof input.code === "string") {
    // Replace ALL corsair.withTenant("...") calls with the correct tenantId
    sanitizedInput.code = (input.code as string).replace(
      /corsair\.withTenant\(["'][^"']*["']\)/g,
      `corsair.withTenant("${tenantId}")`
    );
  }

  // For corsair_setup: enforce tenantId
  if (toolName === "corsair_setup") {
    sanitizedInput.tenantId = tenantId;
  }

  try {
    const result = await withTimeout(
      tool.handler(sanitizedInput),
      TOOL_TIMEOUT_MS,
      toolName,
    );

    // Unwrap MCP CallToolResult so the LLM gets plain text
    if (result && typeof result === "object" && Array.isArray((result as any).content)) {
      const text = (result as any).content.map((c: any) => c.text).join("\n");
      return JSON.stringify(text);
    }

    return JSON.stringify(result);
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}
