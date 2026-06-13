import {
  pgTable,
  uuid,
  varchar,
  date,
  integer,
  bigint,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { projects } from './projects.js';

/**
 * Usage daily — pre-aggregated daily rollups of gateway request data.
 *
 * Workers upsert into this table after every request (via cost-calculation worker).
 * An hourly reconciliation job ensures accuracy.
 */
export const usageDaily = pgTable(
  'usage_daily',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
    date: date('date').notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    totalRequests: integer('total_requests').notNull().default(0),
    totalPromptTokens: bigint('total_prompt_tokens', { mode: 'number' }).notNull().default(0),
    totalCompletionTokens: bigint('total_completion_tokens', { mode: 'number' })
      .notNull()
      .default(0),
    totalTokens: bigint('total_tokens', { mode: 'number' }).notNull().default(0),
    totalCostCents: numeric('total_cost_cents', { precision: 14, scale: 6 }).notNull().default('0'),
    cacheHits: integer('cache_hits').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    avgLatencyMs: numeric('avg_latency_ms', { precision: 10, scale: 2 }).notNull().default('0'),
    p99LatencyMs: integer('p99_latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('idx_usage_daily_unique').on(
      table.orgId,
      table.projectId,
      table.date,
      table.provider,
      table.model,
    ),
    index('idx_usage_daily_org_date').on(table.orgId, table.date),
  ],
);

export type UsageDaily = typeof usageDaily.$inferSelect;
export type NewUsageDaily = typeof usageDaily.$inferInsert;
