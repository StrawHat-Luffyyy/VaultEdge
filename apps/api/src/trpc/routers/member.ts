import { router, orgProcedure } from '../trpc.js';
import { inviteMemberSchema, updateMemberRoleSchema } from '@vaultedge/shared';
import { orgMembers } from '@vaultedge/db/schema';
import { writeAuditLog } from '../../lib/audit.js';
import { and, eq, isNull } from 'drizzle-orm';
import { pgTable, uuid, varchar } from 'drizzle-orm/pg-core';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

// Local Drizzle definition for the Better Auth user table
export const users = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
});

export const memberRouter = router({
  list: orgProcedure('org.view')
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select({
          id: orgMembers.id,
          userId: orgMembers.userId,
          role: orgMembers.role,
          joinedAt: orgMembers.joinedAt,
          createdAt: orgMembers.createdAt,
          user: {
            id: users.id,
            name: users.name,
            email: users.email,
          },
        })
        .from(orgMembers)
        .innerJoin(users, eq(orgMembers.userId, users.id))
        .where(eq(orgMembers.orgId, input.orgId));
    }),

  add: orgProcedure('member.invite')
    .input(inviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const callerRole = ctx.orgMember.role;

      // Prevent privilege escalation: only owner can invite admin
      if (input.role === 'admin' && callerRole !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can assign the admin role',
        });
      }



      // Find the target user by email
      const [targetUser] = await ctx.db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No user found with the provided email address',
        });
      }

      // Check if the user is already a member
      const existingMembership = await ctx.db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.orgId, input.orgId),
          eq(orgMembers.userId, targetUser.id),
        ),
      });

      if (existingMembership) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User is already a member of this organization',
        });
      }

      return await ctx.db.transaction(async (tx) => {
        const [newMember] = await tx
          .insert(orgMembers)
          .values({
            orgId: input.orgId,
            userId: targetUser.id,
            role: input.role,
            invitedBy: ctx.user.id,
            joinedAt: new Date(),
          })
          .returning();

        if (!newMember) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to add member',
          });
        }

        await writeAuditLog(tx, {
          orgId: input.orgId,
          actorId: ctx.user.id,
          actorType: 'user',
          action: 'member.add',
          resourceType: 'member',
          resourceId: newMember.id,
          changes: {
            after: newMember,
          },
          ipAddress: ctx.ip,
          userAgent: ctx.userAgent,
        });

        return newMember;
      });
    }),

  updateRole: orgProcedure('member.updateRole')
    .input(updateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const callerRole = ctx.orgMember.role;

      const targetMember = await ctx.db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.id, input.memberId),
          eq(orgMembers.orgId, input.orgId),
        ),
      });

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      // Users cannot modify their own role
      if (targetMember.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot modify your own role',
        });
      }

      if (targetMember.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot modify the owner of the organization',
        });
      }



      // Only owners may promote to admin or demote an admin
      if (targetMember.role === 'admin' && callerRole !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can demote an admin',
        });
      }

      if (input.role === 'admin' && callerRole !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can promote a member to admin',
        });
      }

      const [updated] = await ctx.db
        .update(orgMembers)
        .set({
          role: input.role,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orgMembers.id, input.memberId),
            eq(orgMembers.orgId, input.orgId),
          ),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      await ctx.audit('member.updateRole', 'member', updated.id, {
        before: { role: targetMember.role },
        after: { role: updated.role },
      });

      return updated;
    }),

  remove: orgProcedure('member.remove')
    .input(
      z.object({
        memberId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const callerRole = ctx.orgMember.role;

      const targetMember = await ctx.db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.id, input.memberId),
          eq(orgMembers.orgId, input.orgId),
        ),
      });

      if (!targetMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found in this organization',
        });
      }

      // Users cannot remove themselves
      if (targetMember.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You cannot remove yourself from the organization',
        });
      }

      if (targetMember.role === 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove the owner of the organization',
        });
      }

      // Only owners can remove an admin
      if (targetMember.role === 'admin' && callerRole !== 'owner') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only owners can remove an admin',
        });
      }

      const [removed] = await ctx.db
        .delete(orgMembers)
        .where(
          and(
            eq(orgMembers.id, input.memberId),
            eq(orgMembers.orgId, input.orgId),
          ),
        )
        .returning();

      if (!removed) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found',
        });
      }

      await ctx.audit('member.remove', 'member', removed.id, {
        before: removed,
      });

      return { success: true };
    }),
});
