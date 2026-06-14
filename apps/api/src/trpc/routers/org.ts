import { router, protectedProcedure, orgProcedure } from '../trpc.js';
import { createOrgSchema, updateOrgSchema } from '@vaultedge/shared';
import { organizations, orgMembers } from '@vaultedge/db/schema';
import { writeAuditLog } from '../../lib/audit.js';
import { and, eq, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const orgRouter = router({
  create: protectedProcedure
    .input(createOrgSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken (either active or soft-deleted)
      const existing = await ctx.db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug),
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'An organization with this slug already exists',
        });
      }

      return await ctx.db.transaction(async (tx) => {
        // Insert new organization
        const [org] = await tx
          .insert(organizations)
          .values({
            name: input.name,
            slug: input.slug,
            plan: 'free',
          })
          .returning();

        if (!org) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create organization',
          });
        }

        // Insert owner membership
        await tx.insert(orgMembers).values({
          orgId: org.id,
          userId: ctx.user.id,
          role: 'owner',
          joinedAt: new Date(),
        });

        // Write audit log
        await writeAuditLog(tx, {
          orgId: org.id,
          actorId: ctx.user.id,
          actorType: 'user',
          action: 'org.create',
          resourceType: 'organization',
          resourceId: org.id,
          changes: {
            after: org,
          },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });

        return org;
      });
    }),

  update: orgProcedure('org.update')
    .input(updateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const before = {
        name: ctx.org.name,
        billingEmail: ctx.org.billingEmail,
        logoUrl: ctx.org.logoUrl,
      };

      const [updated] = await ctx.db
        .update(organizations)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.billingEmail !== undefined && { billingEmail: input.billingEmail }),
          ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, input.orgId))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      const after = {
        name: updated.name,
        billingEmail: updated.billingEmail,
        logoUrl: updated.logoUrl,
      };

      await ctx.audit('org.update', 'organization', updated.id, {
        before,
        after,
      });

      return updated;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        plan: organizations.plan,
        billingEmail: organizations.billingEmail,
        logoUrl: organizations.logoUrl,
        metadata: organizations.metadata,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.orgId))
      .where(
        and(
          eq(orgMembers.userId, ctx.user.id),
          isNull(organizations.deletedAt)
        )
      );
  }),

  get: orgProcedure('org.view')
    .query(({ ctx }) => {
      return ctx.org;
    }),

  delete: orgProcedure('org.delete')
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .update(organizations)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, input.orgId))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      await ctx.audit('org.delete', 'organization', deleted.id, {
        before: { deletedAt: null },
        after: { deletedAt: deleted.deletedAt },
      });

      return { success: true };
    }),
});
