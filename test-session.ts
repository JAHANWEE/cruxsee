import "dotenv/config";
import { auth } from "@repo/auth";
import { fromNodeHeaders } from "better-auth/node";

async function run() {
  try {
    const mockHeaders = { cookie: "better-auth.session_token=YrqAOV2l8q6aExLo5dVo9CCbuUKZykOB" };
    const session1 = await auth.api.getSession({ headers: fromNodeHeaders(mockHeaders as any) });
    console.log("Session 1:", session1 ? "OK" : "null");
  } catch(e:any) {
    console.error("Error 1:", e.message);
  }
  process.exit(0);
}
run();
