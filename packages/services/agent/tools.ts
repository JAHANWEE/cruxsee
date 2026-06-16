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

// ─── Tool Executor ────────────────────────────────────────────────────────

export async function executeTool(toolName: string, input: Record<string, unknown>): Promise<string> {
  const tool = mcpTools.find((t: CorsairToolDef) => t.name === toolName);
  if (!tool) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  try {
    const result = await tool.handler(input);
    
    // Unwrap MCP CallToolResult so the LLM gets plain text
    if (result && typeof result === "object" && Array.isArray((result as any).content)) {
      const text = (result as any).content.map((c: any) => c.text).join('\n');
      return JSON.stringify(text);
    }

    return JSON.stringify(result);
  } catch (e: any) {
    return JSON.stringify({ error: e.message });
  }
}
