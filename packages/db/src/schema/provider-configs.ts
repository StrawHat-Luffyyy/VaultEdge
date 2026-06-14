import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { organizations } from './organizations';

/**
 * Provider configurations — stores encrypted LLM provider credentials.
 *
 * Security: API keys are encrypted with AES-256-GCM. The IV is stored alongside
 * the ciphertext to enable decryption. The encryption key lives in env vars only.
 */
export const providerConfigs = pgTable(
  'provider_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 20 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),
    apiKeyEncrypted: text('api_key_encrypted').notNull(),
    apiKeyIv: varchar('api_key_iv', { length: 32 }).notNull(),
    baseUrl: varchar('base_url', { length: 500 }),
    isEnabled: boolean('is_enabled').notNull().default(true),
    priority: integer('priority').notNull().default(0),
    modelsAllowed: text('models_allowed')
      .array()
      .default([] as unknown as string[]),
    settings: jsonb('settings').default({}).$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex('idx_provider_configs_org_provider').on(table.orgId, table.provider)],
);

export type ProviderConfig = typeof providerConfigs.$inferSelect;
export type NewProviderConfig = typeof providerConfigs.$inferInsert;
