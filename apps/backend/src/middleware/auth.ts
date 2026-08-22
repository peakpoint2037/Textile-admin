import type { MiddlewareHandler } from 'hono';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@textile-admin/shared';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { userRepository } from '../repositories/userRepository.js';
import { ApiError } from '../utils/apiError.js';
import type { AppEnv } from '../types/hono.js';

export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized();
  }
  const token = authHeader.slice('Bearer '.length);

  let payload: jwt.JwtPayload;
  try {
    const decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET);
    if (typeof decoded === 'string') throw new Error('unexpected token payload');
    payload = decoded;
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }

  const sub = payload.sub;
  if (!sub) {
    throw ApiError.unauthorized('Invalid token payload');
  }

  let user = await userRepository.findById(pool, sub);
  if (!user) {
    // First time we've seen this Supabase Auth user: provision an app-level
    // profile row for them (lowest-privilege role by default).
    const email = typeof payload.email === 'string' ? payload.email : `${sub}@unknown.local`;
    user = await userRepository.createFromAuth(pool, {
      id: sub,
      email,
      name: email.split('@')[0] ?? email,
    });
  }

  if (!user.is_active) {
    throw ApiError.forbidden('Your account has been deactivated');
  }

  c.set('user', user);
  await next();
};

export function requireRole(...roles: UserRole[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) {
      throw ApiError.forbidden();
    }
    await next();
  };
}
