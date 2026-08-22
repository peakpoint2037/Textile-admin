import type { Context } from 'hono';
import { dateRangeQuerySchema } from '@textile-admin/shared';
import { reportService } from '../services/reportService.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const reportController = {
  async dashboard(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    return ok(c, await reportService.dashboard(range));
  },

  async sales(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    return ok(c, await reportService.sales(range));
  },

  async profit(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    return ok(c, await reportService.profit(range));
  },

  async inventory(c: Context<AppEnv>) {
    return ok(c, await reportService.inventory());
  },

  async products(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    return ok(c, await reportService.products(range));
  },
};
