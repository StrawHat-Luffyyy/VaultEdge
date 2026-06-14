import { router, orgProcedure } from '../trpc.js';
import { createProjectSchema, updateProjectSchema } from '@vaultedge/shared';
import { projects } from '@vaultedge/db/schema';
import { writeAuditLog } from '../../lib/audit.js';
import { and, eq, isNull } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const projectRouter = router({
  create: orgProcedure('project.create')
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken in this organization (active or archived)
      const existing = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.orgId, input.orgId),
          eq(projects.slug, input.slug),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A project with this slug already exists in this organization',
        });
      }

      return await ctx.db.transaction(async (tx) => {
        // Insert new project
        const [project] = await tx
          .insert(projects)
          .values({
            orgId: input.orgId,
            name: input.name,
            slug: input.slug,
            description: input.description,
          })
          .returning();

        if (!project) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create project',
          });
        }

        // Write audit log using transaction
        await writeAuditLog(tx, {
          orgId: input.orgId,
          actorId: ctx.user.id,
          actorType: 'user',
          action: 'project.create',
          resourceType: 'project',
          resourceId: project.id,
          changes: {
            after: project,
          },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });

        return project;
      });
    }),

  update: orgProcedure('project.update')
    .input(
      updateProjectSchema.extend({
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent IDOR: find the project belonging to the org and active
      const existing = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.orgId, input.orgId),
          isNull(projects.archivedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or archived',
        });
      }

      const before = {
        name: existing.name,
        description: existing.description,
      };

      const [updated] = await ctx.db
        .update(projects)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.orgId, input.orgId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      const after = {
        name: updated.name,
        description: updated.description,
      };

      await ctx.audit('project.update', 'project', updated.id, {
        before,
        after,
      });

      return updated;
    }),

  list: orgProcedure('org.view')
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.projects.findMany({
        where: and(
          eq(projects.orgId, input.orgId),
          isNull(projects.archivedAt),
        ),
      });
    }),

  get: orgProcedure('org.view')
    .input(
      z.object({
        projectId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Prevent IDOR: retrieve only if matching both projectId and orgId and not archived
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

      return project;
    }),

  archive: orgProcedure('project.archive')
    .input(
      z.object({
        projectId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Prevent IDOR: check existence and active state within this org
      const existing = await ctx.db.query.projects.findFirst({
        where: and(
          eq(projects.id, input.projectId),
          eq(projects.orgId, input.orgId),
          isNull(projects.archivedAt),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found or already archived',
        });
      }

      const [archived] = await ctx.db
        .update(projects)
        .set({
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projects.id, input.projectId),
            eq(projects.orgId, input.orgId),
          ),
        )
        .returning();

      if (!archived) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Project not found',
        });
      }

      await ctx.audit('project.archive', 'project', archived.id, {
        before: { archivedAt: null },
        after: { archivedAt: archived.archivedAt },
      });

      return { success: true };
    }),
});
