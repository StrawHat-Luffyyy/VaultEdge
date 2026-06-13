import {
  pgTable,
  uuid,
  varchar,
  smallint,
  numeric,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations.js';
import { projects } from './projects.js';

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  period: varchar('period', { length: 10 }).notNull(), // 'daily' | 'weekly' | 'monthly'
  limitCents: numeric('limit_cents', { precision: 14, scale: 4 }).notNull(),
  alertThresholdPct: smallint('alert_threshold_pct').notNull().default(80),
  actionOnLimit: varchar('action_on_limit', { length: 10 }).notNull().default('alert'),
  isEnabled: boolean('is_enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
