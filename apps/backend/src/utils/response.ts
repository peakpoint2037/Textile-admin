import type { Context } from 'hono';
import type { ApiSuccess } from '@textile-admin/shared';

export function ok<T>(c: Context, data: T, status: 200 | 201 = 200) {
  const body: ApiSuccess<T> = { success: true, data };
  return c.json(body, status);
}
