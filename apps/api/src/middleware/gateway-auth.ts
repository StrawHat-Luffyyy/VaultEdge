import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { apiKeys, organizations, projects } from '@vaultedge/db/schema';
import { ERROR_CODES, hashApiKey } from '@vaultedge/shared';
import { env } from '../config/env.js';
import type { Database } from '@vaultedge/db';
import { logger } from '../lib/logger.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GatewayContext {
  apiKeyId: string;
  orgId: string;
  projectId: string | null;
  scopes: string[];
  requestId: string;
  mode: 'live' | 'test';
}

declare global {
  namespace Express {
    interface Request {
      gatewayContext?: GatewayContext;
    }
  }
}

/**
 * Express middleware to authenticate requests to the AI Gateway (/v1/*).
 *
 * It validates the API key from the Authorization header using HMAC-SHA256,
 * ensures the key, organization, and project are active, and checks multi-tenant isolation boundaries.
 * If authentication succeeds, it attaches a type-safe `GatewayContext` to req.gatewayContext.
 */
export const gatewayAuth = (db: Database) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();

    try {
      // 1. Read and parse the Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        logger.warn({ requestId }, 'Authentication failed: Missing Authorization header');
        return res.status(401).json({
          error: {
            message: 'Missing Authorization header',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        logger.warn({ requestId }, 'Authentication failed: Malformed Authorization header');
        return res.status(401).json({
          error: {
            message: 'Malformed Authorization header. Expected format: Bearer <key>',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      const plaintextKey = parts[1]!;

      // 2. Validate prefix and determine mode
      let mode: 'live' | 'test';
      if (plaintextKey.startsWith('ve_live_')) {
        mode = 'live';
      } else if (plaintextKey.startsWith('ve_test_')) {
        mode = 'test';
      } else {
        logger.warn({ requestId }, 'Authentication failed: Invalid API key prefix');
        return res.status(401).json({
          error: {
            message: 'Invalid API key prefix. Key must start with ve_live_ or ve_test_',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      // 3. Compute hash and query database with single consolidated JOIN
      const computedHash = hashApiKey(plaintextKey, env.API_KEY_SECRET);

      const rows = await db
        .select({
          apiKey: apiKeys,
          org: organizations,
          project: projects,
        })
        .from(apiKeys)
        .innerJoin(
          organizations,
          and(
            eq(apiKeys.orgId, organizations.id),
            isNull(organizations.deletedAt)
          )
        )
        .leftJoin(
          projects,
          and(
            eq(apiKeys.projectId, projects.id),
            isNull(projects.archivedAt)
          )
        )
        .where(eq(apiKeys.keyHash, computedHash))
        .limit(1);

      if (rows.length === 0) {
        logger.warn({ requestId }, 'Authentication failed: API key not found or organization deleted');
        return res.status(401).json({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      const { apiKey, org } = rows[0]!;

      // 4. Constant-time hash verification (defense-in-depth)
      const isMatch = crypto.timingSafeEqual(
        Buffer.from(apiKey.keyHash, 'utf8'),
        Buffer.from(computedHash, 'utf8')
      );
      if (!isMatch) {
        logger.warn({ requestId }, 'Authentication failed: Cryptographic timing safe comparison failed');
        return res.status(401).json({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      // 5. Expiration and Revocation Checks (Logged internally, generic INVALID_API_KEY returned)
      if (apiKey.revokedAt !== null) {
        logger.warn({ requestId, apiKeyId: apiKey.id }, 'Authentication failed: API key has been revoked');
        return res.status(401).json({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      if (apiKey.expiresAt !== null && apiKey.expiresAt < new Date()) {
        logger.warn({ requestId, apiKeyId: apiKey.id }, 'Authentication failed: API key has expired');
        return res.status(401).json({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      // 6. Project Scoping and Tenancy Validation
      const clientProjectId = 
        (req.headers['x-project-id'] as string | undefined) || 
        (req.body && typeof req.body === 'object' ? (req.body as Record<string, any>)['projectId'] as string | undefined : undefined) ||
        (req.query && typeof req.query === 'object' ? (req.query as Record<string, any>)['projectId'] as string | undefined : undefined);

      if (clientProjectId && !UUID_REGEX.test(clientProjectId)) {
        logger.warn({ requestId, clientProjectId }, 'Authentication failed: Client-specified project ID is not a valid UUID');
        return res.status(401).json({
          error: {
            message: 'Invalid API key',
            type: 'invalid_request_error',
            code: ERROR_CODES.INVALID_API_KEY,
          },
        });
      }

      let resolvedProjectId: string | null = null;

      if (apiKey.projectId !== null) {
        // Case A: Key is project-scoped
        if (clientProjectId && clientProjectId !== apiKey.projectId) {
          logger.warn(
            { requestId, apiKeyId: apiKey.id, clientProjectId, keyProjectId: apiKey.projectId },
            'Authentication failed: Attempted to override a project-scoped API key'
          );
          return res.status(401).json({
            error: {
              message: 'Invalid API key',
              type: 'invalid_request_error',
              code: ERROR_CODES.INVALID_API_KEY,
            },
          });
        }
        resolvedProjectId = apiKey.projectId;
      } else {
        // Case B: Key is organization-scoped
        if (clientProjectId) {
          // Verify that this client-specified project belongs to the organization and is active
          const project = await db.query.projects.findFirst({
            where: and(
              eq(projects.id, clientProjectId),
              eq(projects.orgId, org.id),
              isNull(projects.archivedAt)
            ),
          });

          if (!project) {
            logger.warn(
              { requestId, apiKeyId: apiKey.id, clientProjectId, orgId: org.id },
              'Authentication failed: Client-specified project not found, archived, or tenant mismatch'
            );
            return res.status(401).json({
              error: {
                message: 'Invalid API key',
                type: 'invalid_request_error',
                code: ERROR_CODES.INVALID_API_KEY,
              },
            });
          }
          resolvedProjectId = clientProjectId;
        }
      }

      // 7. Inject Gateway Context
      req.gatewayContext = {
        apiKeyId: apiKey.id,
        orgId: org.id,
        projectId: resolvedProjectId,
        scopes: apiKey.scopes,
        requestId,
        mode,
      };

      next();
    } catch (err: any) {
      logger.error({ err, requestId }, 'Gateway authentication unhandled error');
      return res.status(500).json({
        error: {
          message: 'An internal error occurred during gateway authentication',
          type: 'api_error',
          code: ERROR_CODES.INTERNAL_ERROR,
        },
      });
    }
  };
};
