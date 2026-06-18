import { betterAuth } from "better-auth";
import { Pool } from "pg";

const isProd = (process.env.NODE_ENV as string) === "production" || (process.env.NODE_ENV as string) === "prod";

export const auth = betterAuth({
  baseURL: process.env.BASE_URL || "http://localhost:4000",
  advanced: {
    crossSubDomainCookies: {
      enabled: isProd,
      domain: isProd ? ".cruxsee.in" : undefined,
    },
  },
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      scope: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile"
      ],
      accessType: "offline",
      prompt: "select_account consent",
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://home.cruxsee.in",
    "https://chat.cruxsee.in",
    "https://cruxsee.in",
    "https://www.cruxsee.in"
  ],
});

export type Session = typeof auth.$Infer.Session;
