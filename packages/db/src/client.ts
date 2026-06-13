import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema/index.js';
import * as relations from './relations.js';

/**
 * Creates a Drizzle ORM client connected to PostgreSQL.
 *
 * Uses node-postgres (pg) as the driver, which works with both
 * local PostgreSQL and Neon's standard TCP endpoint.
 */
export function createDbClient(connectionString: string) {
  const pool = new pg.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const db = drizzle(pool, {
    schema: { ...schema, ...relations },
  });

  return { db, pool };
}

export type Database = ReturnType<typeof createDbClient>['db'];
