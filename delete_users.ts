import "dotenv/config";
import { db } from "./packages/database/index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Truncating 'user' table...");
  await db.execute(sql`TRUNCATE TABLE "user" CASCADE;`);
  console.log("Successfully deleted all users and related data.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error deleting users:", err);
  process.exit(1);
});
