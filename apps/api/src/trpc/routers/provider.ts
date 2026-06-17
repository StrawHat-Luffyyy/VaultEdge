import { router, orgProcedure } from '../trpc.js';
import { upsertProviderSchema, PROVIDER_METADATA } from '@vaultedge/shared';
import { providerConfigs } from '@vaultedge/db/schema';
import { writeAuditLog } from '../../lib/audit.js';
import { encryptValue } from '../../lib/encryption.js';
import { and, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

function maskApiKey(key: string): string {
  if (key.length <= 4) return '••••';
  return `••••${key.slice(-4)}`;
}

export const providerRouter = router({
  upsert: orgProcedure('provider.manage')
    .input(upsertProviderSchema)
    .mutation(async ({ ctx, input }) => {
      // 1. Validate allowed models
      if (input.modelsAllowed && input.modelsAllowed.length > 0) {
        const supportedModels = PROVIDER_METADATA[input.provider].models;
        for (const model of input.modelsAllowed) {
          if (!supportedModels.includes(model)) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: `Model "${model}" is not supported by provider "${input.provider}". Supported models: ${supportedModels.join(', ')}`,
            });
          }
        }
      }

      // Find existing config
      const existing = await ctx.db.query.providerConfigs.findFirst({
        where: and(
          eq(providerConfigs.orgId, input.orgId),
          eq(providerConfigs.provider, input.provider),
        ),
      });

      const maskedKey = maskApiKey(input.apiKey);
      const { ciphertext, iv } = encryptValue(input.apiKey);

      return await ctx.db.transaction(async (tx) => {
        if (existing) {
          const [updated] = await tx
            .update(providerConfigs)
            .set({
              displayName: input.displayName || existing.displayName || PROVIDER_METADATA[input.provider].name,
              apiKeyEncrypted: ciphertext,
              apiKeyIv: iv,
              baseUrl: input.baseUrl || PROVIDER_METADATA[input.provider].defaultBaseUrl,
              isEnabled: input.isEnabled,
              priority: input.priority,
              modelsAllowed: input.modelsAllowed || PROVIDER_METADATA[input.provider].models,
              settings: {
                ...(existing.settings || {}),
                maskedKey,
              },
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(providerConfigs.orgId, input.orgId),
                eq(providerConfigs.provider, input.provider),
              ),
            )
            .returning();

          if (!updated) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to update provider configuration',
            });
          }

          await writeAuditLog(tx, {
            orgId: input.orgId,
            actorId: ctx.user.id,
            actorType: 'user',
            action: 'provider.update',
            resourceType: 'provider',
            resourceId: updated.id,
            changes: {
              before: {
                displayName: existing.displayName,
                isEnabled: existing.isEnabled,
                priority: existing.priority,
                modelsAllowed: existing.modelsAllowed,
                baseUrl: existing.baseUrl,
                maskedKey: (existing.settings as { maskedKey?: string } | null)?.maskedKey || '••••',
              },
              after: {
                displayName: updated.displayName,
                isEnabled: updated.isEnabled,
                priority: updated.priority,
                modelsAllowed: updated.modelsAllowed,
                baseUrl: updated.baseUrl,
                maskedKey,
              },
            },
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          });

          return {
            id: updated.id,
            provider: updated.provider,
            displayName: updated.displayName,
            baseUrl: updated.baseUrl,
            isEnabled: updated.isEnabled,
            priority: updated.priority,
            modelsAllowed: updated.modelsAllowed,
            maskedKey,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
          };
        } else {
          const [created] = await tx
            .insert(providerConfigs)
            .values({
              orgId: input.orgId,
              provider: input.provider,
              displayName: input.displayName || PROVIDER_METADATA[input.provider].name,
              apiKeyEncrypted: ciphertext,
              apiKeyIv: iv,
              baseUrl: input.baseUrl || PROVIDER_METADATA[input.provider].defaultBaseUrl,
              isEnabled: input.isEnabled,
              priority: input.priority,
              modelsAllowed: input.modelsAllowed || PROVIDER_METADATA[input.provider].models,
              settings: { maskedKey },
            })
            .returning();

          if (!created) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'Failed to create provider configuration',
            });
          }

          await writeAuditLog(tx, {
            orgId: input.orgId,
            actorId: ctx.user.id,
            actorType: 'user',
            action: 'provider.create',
            resourceType: 'provider',
            resourceId: created.id,
            changes: {
              after: {
                displayName: created.displayName,
                isEnabled: created.isEnabled,
                priority: created.priority,
                modelsAllowed: created.modelsAllowed,
                baseUrl: created.baseUrl,
                maskedKey,
              },
            },
            ipAddress: ctx.ip,
            userAgent: ctx.userAgent,
          });

          return {
            id: created.id,
            provider: created.provider,
            displayName: created.displayName,
            baseUrl: created.baseUrl,
            isEnabled: created.isEnabled,
            priority: created.priority,
            modelsAllowed: created.modelsAllowed,
            maskedKey,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          };
        }
      });
    }),

  list: orgProcedure('org.view').query(async ({ ctx, input }) => {
    const configs = await ctx.db.query.providerConfigs.findMany({
      where: eq(providerConfigs.orgId, input.orgId),
      orderBy: [providerConfigs.provider],
    });

    return configs.map((config) => ({
      id: config.id,
      provider: config.provider,
      displayName: config.displayName,
      baseUrl: config.baseUrl,
      isEnabled: config.isEnabled,
      priority: config.priority,
      modelsAllowed: config.modelsAllowed,
      maskedKey: (config.settings as { maskedKey?: string } | null)?.maskedKey || '••••',
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));
  }),

  get: orgProcedure('org.view')
    .input(
      z.object({
        provider: z.enum(['openai', 'anthropic', 'gemini', 'mistral']),
      }),
    )
    .query(async ({ ctx, input }) => {
      const config = await ctx.db.query.providerConfigs.findFirst({
        where: and(
          eq(providerConfigs.orgId, input.orgId),
          eq(providerConfigs.provider, input.provider),
        ),
      });

      if (!config) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Configuration for provider "${input.provider}" not found`,
        });
      }

      return {
        id: config.id,
        provider: config.provider,
        displayName: config.displayName,
        baseUrl: config.baseUrl,
        isEnabled: config.isEnabled,
        priority: config.priority,
        modelsAllowed: config.modelsAllowed,
        maskedKey: (config.settings as { maskedKey?: string } | null)?.maskedKey || '••••',
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      };
    }),

  delete: orgProcedure('provider.manage')
    .input(
      z.object({
        provider: z.enum(['openai', 'anthropic', 'gemini', 'mistral']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.providerConfigs.findFirst({
        where: and(
          eq(providerConfigs.orgId, input.orgId),
          eq(providerConfigs.provider, input.provider),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Configuration for provider "${input.provider}" not found`,
        });
      }

      return await ctx.db.transaction(async (tx) => {
        await tx
          .delete(providerConfigs)
          .where(
            and(
              eq(providerConfigs.orgId, input.orgId),
              eq(providerConfigs.provider, input.provider),
            ),
          );

        await writeAuditLog(tx, {
          orgId: input.orgId,
          actorId: ctx.user.id,
          actorType: 'user',
          action: 'provider.delete',
          resourceType: 'provider',
          resourceId: existing.id,
          changes: {
            before: {
              displayName: existing.displayName,
              isEnabled: existing.isEnabled,
              priority: existing.priority,
              modelsAllowed: existing.modelsAllowed,
              baseUrl: existing.baseUrl,
              maskedKey: (existing.settings as { maskedKey?: string } | null)?.maskedKey || '••••',
            },
          },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });

        return { success: true };
      });
    }),
});
