import { Pool, types, type PoolClient } from 'pg';
import { env } from './env.js';

// node-postgres parses DATE columns (OID 1082) into JS Date objects by
// default, which then serialize to a full UTC datetime shifted by the
// server's local timezone — e.g. a stored "2026-08-21" can come back as
// "2026-08-20T18:30:00.000Z". Keep them as the plain 'YYYY-MM-DD' string
// Postgres sends instead.
types.setTypeParser(1082, (val: string) => val);

// A smaller max + a bounded connect timeout keep a post-spin-down burst of
// requests from opening 10 simultaneous new sessions against Supabase's
// pooler at once — the exact pattern that exhausted its session-mode pool
// and produced ECHECKOUTTIMEOUT errors on this free-tier Render instance.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 5,
  connectionTimeoutMillis: 10_000,
});

// Without this listener, an idle client dropped by the server (e.g. a
// connection pooler like Supabase's Supavisor recycling it) throws an
// unhandled 'error' on the pool's EventEmitter and crashes the process —
// turning a single dead connection into a full server restart.
pool.on('error', (err) => {
  console.error('Unexpected error on idle pg client', err);
});

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
