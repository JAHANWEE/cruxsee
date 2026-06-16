import { z } from "zod";

const envSchema = z.object({
  CORSAIR_KEK: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
});

function createEnv(env: NodeJS.ProcessEnv) {
  const safeParseResult = envSchema.safeParse(env);
  if (!safeParseResult.success) throw new Error(safeParseResult.error.message);
  return safeParseResult.data;
}

export const env = createEnv(process.env);
