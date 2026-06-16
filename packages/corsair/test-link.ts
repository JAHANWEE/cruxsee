import { corsair } from "./src/index";
import { resolveConnectLink } from "corsair";

async function test() {
  try {
    const link = await resolveConnectLink(corsair, { plugin: "gmail", tenantId: "test-user" });
    console.log("LINK:", link);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
test();
