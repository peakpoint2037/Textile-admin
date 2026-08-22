import { Pool, types, type PoolClient } from 'pg';
import { env } from './env.js';

// node-postgres parses DATE columns (OID 1082) into JS Date objects by
// default, which then serialize to a full UTC datetime shifted by the
// server's local timezone — e.g. a stored "2026-08-21" can come back as
// "2026-08-20T18:30:00.000Z". Keep them as the plain 'YYYY-MM-DD' string
// Postgres sends instead.
types.setTypeParser(1082, (val: string) => val);

export const pool = new Pool({ connectionString: env.DATABASE_URL });

/** Anything that can run a parameterized query: the pool itself, or a client inside a transaction. */
export type Queryable = Pool | PoolClient;

/**
 * Runs `fn` inside a single transaction. Every stock mutation and order
 * confirm/cancel must go through this so the movement record and the stock
 * update commit (or roll back) together.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
