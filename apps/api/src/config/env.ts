import { z } from 'zod';
import 'dotenv/config';

/**
 * Zod-validated environment variables.
 * The server will REFUSE TO START if any required variable is missing or invalid.
 * This fail-fast approach prevents configuration drift from causing runtime errors.
 */
const envSchema = z.object({
  // Core
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),

  // Database
  DATABASE_URL: z.string().min(1),

  // Redis
  REDIS_URL: z.string().min(1),
  BULLMQ_REDIS_URL: z.string().min(1),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),

  // OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // Encryption
  ENCRYPTION_KEY: z.string().min(1),
  API_KEY_SECRET: z.string().min(32),

  // CORS
  CORS_ORIGINS: z.string().min(1),

  // Observability
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
