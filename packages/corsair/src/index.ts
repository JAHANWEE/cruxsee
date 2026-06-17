import { Pool } from "pg";
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: pool,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true,
  connect: {
    baseUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/api/corsair` : "http://localhost:4000/api/corsair",
    redirectUri: process.env.BASE_URL ? `${process.env.BASE_URL}/api/corsair/authCallback` : "http://localhost:4000/api/corsair/authCallback",
  },
});

export { pool };
export * from "./sync";
