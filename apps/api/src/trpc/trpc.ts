import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { Context } from './context.js';
import { z } from 'zod';
import { hasPermission, type Permission, type OrgRole } from '@vaultedge/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { orgMembers, organizations } from '@vaultedge/db/schema';
import { writeAuditLog } from '../lib/audit.js';

/**
 * tRPC initialization with SuperJSON transformer for date/BigInt serialization.
 * This is the single source of truth for tRPC configuration.
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.code,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * Middleware: require authenticated session.
 * Extracts user from Better Auth session and injects into context.
 */
const isAuthenticated = middleware(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be signed in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      user: ctx.user,
    },
  });
});

/**
 * Protected procedure — requires a valid session.
 * All management API routes should use this.
 */
export const protectedProcedure = publicProcedure.use(isAuthenticated);

/**
 * Org-scoped procedure — requires:
 * 1. Authenticated user
 * 2. Organization ID (orgId) in the input schema
 * 3. Verified active membership in the target organization
 * 4. Specific role-based permission
 */
export const orgProcedure = (permission: Permission) =>
  protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
      }),
    )
    .use(async ({ ctx, input, next }) => {
      // 1. Verify organization exists and is not soft-deleted
      const org = await ctx.db.query.organizations.findFirst({
        where: and(
          eq(organizations.id, input.orgId),
          isNull(organizations.deletedAt),
        ),
      });

      if (!org) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found or has been deleted',
        });
      }

      // 2. Verify user is a member of the organization
      const member = await ctx.db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.orgId, input.orgId),
          eq(orgMembers.userId, ctx.user.id),
        ),
      });

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You are not a member of this organization',
        });
      }

      // 3. Verify user has the required permission
      if (!hasPermission(member.role as OrgRole, permission)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Insufficient permissions: required ${permission}`,
        });
      }

      // 4. Inject a request-scoped audit helper
      const audit = async (
        action: string,
        resourceType: string,
        resourceId?: string,
        changes?: { before?: Record<string, any>; after?: Record<string, any> },
      ) => {
        await writeAuditLog(ctx.db, {
          orgId: input.orgId,
          actorId: ctx.user.id,
          actorType: 'user',
          action,
          resourceType,
          resourceId,
          changes,
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });
      };

      return next({
        ctx: {
          ...ctx,
          org,
          orgMember: member,
          audit,
        },
      });
    });
