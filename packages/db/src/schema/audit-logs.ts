import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Audit logs — immutable, append-only security trail.
 *
 * Design notes:
 * - No foreign keys: this table must survive even if referenced entities are deleted.
 * - No UPDATE or DELETE operations allowed by application code.
 * - In production, partitioned monthly by created_at.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    actorId: uuid('actor_id'),
    actorType: varchar('actor_type', { length: 10 }).notNull(), // 'user' | 'system' | 'api_key'
    action: varchar('action', { length: 100 }).notNull(), // e.g. 'api_key.created'
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    resourceId: uuid('resource_id'),
    changes: jsonb('changes').$type<{ before?: Record<string, unknown>; after?: Record<string, unknown> }>(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_org_created').on(table.orgId, table.createdAt),
    index('idx_audit_action').on(table.orgId, table.action, table.createdAt),
  ],
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
