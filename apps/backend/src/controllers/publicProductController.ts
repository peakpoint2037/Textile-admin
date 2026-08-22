import type { Context } from 'hono';
import { publicProductQuerySchema } from '@textile-admin/shared';
import { publicProductService } from '../services/publicProductService.js';
import { ok } from '../utils/response.js';

export const publicProductController = {
  async list(c: Context) {
    const query = publicProductQuerySchema.parse(c.req.query());
    const result = await publicProductService.list(query);
    return ok(c, result);
  },
};
