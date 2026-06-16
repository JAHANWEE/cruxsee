import { buildCorsairToolDefs } from "@corsair-dev/mcp";
import { corsair } from "@repo/corsair";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

const tools = buildCorsairToolDefs({ corsair });
for (const t of tools) {
  const schema = zodToJsonSchema(z.object(t.shape as any));
  console.log(t.name, JSON.stringify(schema, null, 2));
}
