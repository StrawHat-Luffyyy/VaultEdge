import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { Auth } from '@vaultedge/auth';
import type { Database } from '@vaultedge/db';
import { logger } from '../lib/logger.js';

/**
 * tRPC context — created fresh for every incoming request.
 *
 * Contains:
 * - Database connection
 * - Auth instance
 * - Session/user (resolved from cookie)
 * - Logger (with request ID)
 * - Request metadata (IP, user agent)
 */
export async function createContext(
  opts: CreateExpressContextOptions,
  deps: { db: Database; auth: Auth },
) {
  const { req, res } = opts;
  const { db, auth } = deps;

  // Resolve session from cookie
  let session: Session | null = null;
  let user: User | null = null;

  try {
    const authSession = await auth.api.getSession({
      headers: req.headers as Record<string, string>,
    });

    if (authSession) {
      session = authSession.session;
      user = authSession.user;
    }
  } catch (err) {
    logger.debug({ err }, 'Session resolution failed');
  }

  const requestId = (req.headers['x-request-id'] as string) ?? 'unknown';

  return {
    db,
    auth,
    session,
    user,
    requestId,
    ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
    userAgent: req.headers['user-agent'] ?? 'unknown',
    logger: logger.child({ requestId }),
  };
}

// Type-safe session and user interfaces (matching Better Auth output)
interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type Context = Awaited<ReturnType<typeof createContext>>;
