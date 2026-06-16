import type { ChatCompletionTool } from "openai/resources/chat/completions";

// ─── Fake Tool Definitions (for OpenAI function calling) ─────────────────

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getWeather",
      description: "Get the current weather for a given city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, e.g. 'Mumbai'" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createReminder",
      description: "Create a reminder for the user",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Reminder title" },
          time: { type: "string", description: "When to remind, e.g. 'tomorrow at 9am'" },
        },
        required: ["title", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "createNote",
      description: "Create a note with a title and body",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          body: { type: "string", description: "Note content" },
        },
        required: ["title", "body"],
      },
    },
  },
];

// ─── Fake Tool Executors ─────────────────────────────────────────────────

type ToolExecutor = (input: Record<string, unknown>) => Promise<string>;

const executors: Record<string, ToolExecutor> = {
  getWeather: async (input) => {
    const city = input.city as string;
    // Fake response
    return JSON.stringify({
      city,
      temperature: "28°C",
      condition: "Partly cloudy",
      humidity: "65%",
    });
  },

  createReminder: async (input) => {
    return JSON.stringify({
      success: true,
      reminder: { title: input.title, time: input.time, id: crypto.randomUUID() },
    });
  },

  createNote: async (input) => {
    return JSON.stringify({
      success: true,
      note: { title: input.title, body: input.body, id: crypto.randomUUID() },
    });
  },
};

export async function executeTool(toolName: string, input: Record<string, unknown>): Promise<string> {
  const executor = executors[toolName];
  if (!executor) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }
  return executor(input);
}
