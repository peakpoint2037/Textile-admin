import jwt from 'jsonwebtoken';
import { pool } from '../db-client.js';

/**
 * Mints a Supabase-Auth-shaped JWT for a dev OWNER user, upserting that user
 * if it doesn't exist yet. Lets you exercise `authenticate`-protected routes
 * locally before a real Supabase project is connected. Once real Supabase
 * Auth is wired up, the frontend gets this same shape of token from
 * `supabase-js` directly and this script is no longer needed.
 */
const DEV_OWNER_ID = '00000000-0000-0000-0000-000000000001';
const DEV_OWNER_EMAIL = 'owner@dev.local';

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO users (id, email, name, role, is_active)
       VALUES ($1, $2, 'Dev Owner', 'OWNER', TRUE)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
       RETURNING id, email, role`,
      [DEV_OWNER_ID, DEV_OWNER_EMAIL],
    );
    const user = rows[0];

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      throw new Error('SUPABASE_JWT_SECRET is not set. Copy .env.example to .env.');
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: 'authenticated',
      },
      secret,
      { expiresIn: '24h' },
    );

    console.log('\nDev bearer token for', user.email, '(expires in 24h):\n');
    console.log(token);
    console.log('\nUse it like:');
    console.log(`  curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/auth/me\n`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
