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
  baseURL: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/corsair`,
  connect: {
    redirectUri: "http://localhost:3000/chat"
  }
});

export { pool };
