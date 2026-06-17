import "dotenv/config";
import { corsair } from "@repo/corsair";
import { generateOAuthUrl } from "corsair/oauth";

async function run() {
  try {
    const plugin = "gmail";
    const tenantId = "test-user-id";
    const { url, state } = await generateOAuthUrl(corsair, plugin, {
      tenantId,
      redirectUri: "http://localhost:4000/api/corsair/authCallback",
      loginHint: "test@example.com",
      scopes: ["https://mail.google.com/"],
    });
    console.log("Success:", url);
  } catch (e: any) {
    console.error("Failed:", e.message, e.stack);
  }
  process.exit(0);
}
run();
