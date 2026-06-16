import { corsair } from "../corsair/src/index";
import { buildCorsairToolDefs } from "@corsair-dev/mcp";

async function test() {
  const tools = buildCorsairToolDefs({ corsair });
  const setupTool = tools.find((t: any) => t.name === "corsair_setup");
  if (!setupTool) return console.log("No setup tool");
  
  try {
    const res = await setupTool.handler({ tenantId: "m32lVbGYsJKv844eBJjBpqIu9yzSP6ZA" });
    console.log(JSON.stringify(res, null, 2));
  } catch(e) {
    console.error("ERROR:", e);
  }
}
test();
