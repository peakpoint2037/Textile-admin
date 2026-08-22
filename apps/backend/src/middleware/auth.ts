import type { MiddlewareHandler } from 'hono';
import * as jose from 'jose';
import type { UserRole } from '@textile-admin/shared';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { userRepository } from '../repositories/userRepository.js';
import { ApiError } from '../utils/apiError.js';
import type { AppEnv } from '../types/hono.js';

// Supabase Auth signs tokens with a per-project asymmetric key (ES256) and
// publishes the public half at this JWKS endpoint — real Supabase projects
// verify against it. Local dev has no Supabase project, so SUPABASE_URL is
// blank and tokens (minted by `dev-token.ts`) are HS256-signed with a shared
// secret instead; `jose.jwtVerify` handles both via the same call shape.
const remoteJWKS = env.SUPABASE_URL
  ? jose.createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`))
  : null;
const devSecret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

async function verifyAccessToken(token: string): Promise<jose.JWTPayload> {
  if (remoteJWKS) {
    const { payload } = await jose.jwtVerify(token, remoteJWKS, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });
    return payload;
  }
  const { payload } = await jose.jwtVerify(token, devSecret);
  return payload;
}

export const authenticate: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw ApiError.unauthorized();
  }
  const token = authHeader.slice('Bearer '.length);

  let payload: jose.JWTPayload;
  try {
    payload = await verifyAccessToken(token);
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
