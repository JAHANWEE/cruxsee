import { buildCorsairToolDefs } from "@corsair-dev/mcp";
import { corsair } from "@repo/corsair";

const tools = buildCorsairToolDefs({ corsair });
for (const t of tools) {
  console.log(t.name, "shape:", t.shape ? Object.keys(t.shape) : "undefined");
}
