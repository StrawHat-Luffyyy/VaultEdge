import { router, orgProcedure } from '../trpc.js';
import { createApiKeySchema, generateApiKey, getApiKeyPrefix, hashApiKey } from '@vaultedge/shared';
import { apiKeys, projects } from '@vaultedge/db/schema';
import { writeAuditLog } from '../../lib/audit.js';
import { env } from '../../config/env.js';
import { and, eq, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const apiKeyRouter = router({
  create: orgProcedure('apiKey.create')
    .input(createApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      // Prevent IDOR: verify the target project exists and is active inside the organization
      if (input.projectId) {
        const project = await ctx.db.query.projects.findFirst({
          where: and(
            eq(projects.id, input.projectId),
            eq(projects.orgId, input.orgId),
            isNull(projects.archivedAt),
          ),
        });

        if (!project) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Project not found or archived',
          });
        }
      }

      // Generate plaintext API key and components
      const prefix = env.NODE_ENV === 'production' ? 've_live_' : 've_test_';
      const plaintextKey = generateApiKey(prefix);
      const keyPrefix = getApiKeyPrefix(plaintextKey);
      const keyHash = hashApiKey(plaintextKey, env.API_KEY_SECRET);

      return await ctx.db.transaction(async (tx) => {
        const [apiKey] = await tx
          .insert(apiKeys)
          .values({
            orgId: input.orgId,
            projectId: input.projectId || null,
            name: input.name,
            keyPrefix,
            keyHash,
            scopes: input.scopes,
            rateLimitOverride: input.rateLimitOverride || null,
            expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
            createdBy: ctx.user.id,
          })
          .returning();

        if (!apiKey) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create API key',
          });
        }

        // Write audit log entry (omit keyHash and plaintext key from metadata changes for safety)
        await writeAuditLog(tx, {
          orgId: input.orgId,
          actorId: ctx.user.id,
          actorType: 'user',
          action: 'apiKey.create',
          resourceType: 'apiKey',
          resourceId: apiKey.id,
          changes: {
            after: {
              id: apiKey.id,
              name: apiKey.name,
              projectId: apiKey.projectId,
              scopes: apiKey.scopes,
              keyPrefix: apiKey.keyPrefix,
              rateLimitOverride: apiKey.rateLimitOverride,
              expiresAt: apiKey.expiresAt,
            },
          },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });

        // Return plaintext key exactly once
        return {
          id: apiKey.id,
          name: apiKey.name,
          key: plaintextKey,
          prefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
        };
      });
    }),

  list: orgProcedure('apiKey.list')
    .query(async ({ ctx, input }) => {
      // Select only safe fields from the database. Do not expose plaintext, hash, or secrets.
      return await ctx.db
        .select({
          id: apiKeys.id,
          name: apiKeys.name,
          prefix: apiKeys.keyPrefix,
          scopes: apiKeys.scopes,
          createdAt: apiKeys.createdAt,
          revokedAt: apiKeys.revokedAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.orgId, input.orgId));
    }),

  revoke: orgProcedure('apiKey.revoke')
    .input(
      z.object({
        apiKeyId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent IDOR: retrieve key matching both apiKeyId and orgId and check active
      const existing = await ctx.db.query.apiKeys.findFirst({
        where: and(
          eq(apiKeys.id, input.apiKeyId),
          eq(apiKeys.orgId, input.orgId),
          isNull(apiKeys.revokedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found or already revoked',
        });
      }

      const [revoked] = await ctx.db
        .update(apiKeys)
        .set({
          revokedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(apiKeys.id, input.apiKeyId),
            eq(apiKeys.orgId, input.orgId),
          ),
        )
        .returning();

      if (!revoked) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'API key not found',
        });
      }

      // Write audit log entry
      await ctx.audit('apiKey.revoke', 'apiKey', revoked.id, {
        before: { revokedAt: null },
        after: { revokedAt: revoked.revokedAt },
      });

      return { success: true };
    }),
});
