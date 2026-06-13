import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from '@vaultedge/db';

/**
 * Creates the Better Auth instance.
 *
 * This must be called at server startup with the live database connection.
 * The auth instance is then shared across the Express app.
 */
export function createAuth(db: Database, config: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg' }),
    baseURL: config.baseUrl,
    secret: config.secret,

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false, // Simplified for M1, enable later
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Refresh session if older than 1 day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minute cookie cache
      },
    },

    advanced: {
      cookiePrefix: 'vaultedge',
      generateId: undefined, // Use default UUID generation
    },

    // OAuth providers — configured via env vars
    ...(config.google
      ? {
          socialProviders: {
            google: {
              clientId: config.google.clientId,
              clientSecret: config.google.clientSecret,
            },
            ...(config.github
              ? {
                  github: {
                    clientId: config.github.clientId,
                    clientSecret: config.github.clientSecret,
                  },
                }
              : {}),
          },
        }
      : {}),
  });
}

export interface AuthConfig {
  secret: string;
  baseUrl: string;
  google?: {
    clientId: string;
    clientSecret: string;
  };
  github?: {
    clientId: string;
    clientSecret: string;
  };
}

export type Auth = ReturnType<typeof createAuth>;
