import { Pool } from "pg";
import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const googleConfig = {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
};

export const corsair = createCorsair({
  plugins: [
    gmail(googleConfig as any), 
    googlecalendar(googleConfig as any)
  ],
  database: pool,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true, // each user = tenant
  connect: {
    baseUrl: process.env.BASE_URL ? `${process.env.BASE_URL}/api/corsair` : "http://localhost:4000/api/corsair",
    redirectUri: process.env.BASE_URL ? `${process.env.BASE_URL}/api/corsair/authCallback` : "http://localhost:4000/api/corsair/authCallback"
  }
});

export { pool };
