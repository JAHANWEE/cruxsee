import "dotenv/config";
import { db } from "./packages/database/index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const state = "test-state";
    const userId = "test-user-id";
    const plugin = "gmail";
    await db.execute(
      sql`INSERT INTO verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt") VALUES (${state}, ${userId}, ${plugin}, ${new Date(Date.now() + 10 * 60 * 1000)}, NOW(), NOW())`
    );
    console.log("Success");
  } catch (e: any) {
    console.error("Failed:", e.message);
  }
  process.exit(0);
}
run();
