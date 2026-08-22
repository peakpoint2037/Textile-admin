import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterAll, afterEach, beforeAll } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://textile:textile@localhost:55432/textile_admin_test';

// Every repository/service under test reads `pool` from `../src/config/db.js`,
// which builds its connection string from `env.DATABASE_URL` at import time.
// Setting it here — before any app module is imported — points the whole
// test run at the dedicated test database instead of the dev one.
process.env.DATABASE_URL = TEST_DATABASE_URL;

const TABLES_TO_TRUNCATE = [
  'inventory_movements',
  'order_items',
  'orders',
  'product_images',
  'products',
  'categories',
  'customers',
  'expenses',
  'users',
];

async function ensureTestDatabaseExists() {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1);
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const admin = new Pool({ connectionString: adminUrl.toString() });
  try {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } catch (err) {
    const pgError = err as { code?: string };
    if (pgError.code !== '42P04') throw err; // 42P04 = database already exists
  } finally {
    await admin.end();
  }
}

async function runMigrations(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR PRIMARY KEY,
      applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  `);

  const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

  const { rows } = await pool.query<{ name: string }>('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
  }
}

let setupPool: Pool;

beforeAll(async () => {
  await ensureTestDatabaseExists();
  setupPool = new Pool({ connectionString: TEST_DATABASE_URL });
  await runMigrations(setupPool);
});

afterEach(async () => {
  await setupPool.query(`TRUNCATE ${TABLES_TO_TRUNCATE.join(', ')} RESTART IDENTITY CASCADE`);
  await setupPool.query(`ALTER SEQUENCE order_number_seq RESTART WITH 1001`);
});

afterAll(async () => {
  await setupPool.end();
});
