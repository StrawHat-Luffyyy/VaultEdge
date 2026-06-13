import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';

/**
 * Organization members — junction table for user ↔ org membership.
 * Role determines RBAC permissions. See packages/shared/src/constants/roles.ts.
 */
export const orgMembers = pgTable(
  'org_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    // Better Auth manages the users table; we reference user IDs but don't FK
    // to avoid coupling to Better Auth's internal schema.
    role: varchar('role', { length: 20 }).notNull().default('member'),
    invitedBy: uuid('invited_by'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_org_members_user').on(table.userId),
    index('idx_org_members_org').on(table.orgId),
  ],
);

export type OrgMember = typeof orgMembers.$inferSelect;
export type NewOrgMember = typeof orgMembers.$inferInsert;
