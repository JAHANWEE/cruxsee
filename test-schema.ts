import "dotenv/config";
import { db } from "./packages/database/index";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const result = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'account'`);
    console.log((result as any).rows || result);
  } catch(e:any) {
    console.error(e);
  }
  process.exit(0);
}
run();
