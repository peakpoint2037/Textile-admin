import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@textile-admin/shared';
import { pool } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';

export async function createAuthenticatedUser(
  role: UserRole = 'OWNER',
): Promise<{ userId: string; token: string }> {
  const userId = randomUUID();
  const email = `${userId}@test.local`;

  await pool.query(
    `INSERT INTO users (id, email, name, role, is_active) VALUES ($1, $2, 'Test User', $3, TRUE)`,
    [userId, email, role],
  );

  const token = jwt.sign({ sub: userId, email, role: 'authenticated' }, env.SUPABASE_JWT_SECRET, {
    expiresIn: '1h',
  });

  return { userId, token };
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
