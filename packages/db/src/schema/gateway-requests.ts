import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  smallint,
  boolean,
  numeric,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Gateway requests — high-volume, append-only request log.
 *
 * Design notes:
 * - No foreign keys: avoids lock contention on high-write table.
 *   Referential integrity is enforced at the application layer.
 * - In production, this table should be partitioned monthly by created_at.
 *   Partition DDL is managed by the partition-manager worker, not Drizzle.
 * - Indexes are optimized for the most common dashboard queries.
 */
export const gatewayRequests = pgTable(
  'gateway_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id').notNull(),
    projectId: uuid('project_id'),
    apiKeyId: uuid('api_key_id').notNull(),
    requestId: varchar('request_id', { length: 36 }).unique().notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    requestType: varchar('request_type', { length: 20 }).notNull(),
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),
    costCents: numeric('cost_cents', { precision: 12, scale: 6 }).notNull().default('0'),
    latencyMs: integer('latency_ms').notNull(),
    statusCode: smallint('status_code').notNull(),
    isCacheHit: boolean('is_cache_hit').notNull().default(false),
    isStreamed: boolean('is_streamed').notNull().default(false),
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_gw_req_org_created').on(table.orgId, table.createdAt),
    index('idx_gw_req_project_created').on(table.projectId, table.createdAt),
    index('idx_gw_req_apikey').on(table.apiKeyId, table.createdAt),
  ],
);

export type GatewayRequest = typeof gatewayRequests.$inferSelect;
export type NewGatewayRequest = typeof gatewayRequests.$inferInsert;
