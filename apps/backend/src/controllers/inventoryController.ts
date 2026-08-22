import type { Context } from 'hono';
import {
  inventoryQuerySchema,
  movementQuerySchema,
  paginationQuerySchema,
  stockAdjustSchema,
  stockInSchema,
} from '@textile-admin/shared';
import { inventoryService } from '../services/inventoryService.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const inventoryController = {
  async list(c: Context<AppEnv>) {
    const query = inventoryQuerySchema.parse(c.req.query());
    const result = await inventoryService.list(query);
    return ok(c, result);
  },

  async lowStock(c: Context<AppEnv>) {
    const query = paginationQuerySchema.parse(c.req.query());
    const result = await inventoryService.lowStock(query);
    return ok(c, result);
  },

  async movements(c: Context<AppEnv>) {
    const query = movementQuerySchema.parse(c.req.query());
    const result = await inventoryService.movements(query);
    return ok(c, result);
  },

  async stockIn(c: Context<AppEnv>) {
    const input = stockInSchema.parse(await c.req.json());
    const user = c.get('user');
    const product = await inventoryService.stockIn(input, user.id);
    return ok(c, product);
  },

  async adjust(c: Context<AppEnv>) {
    const input = stockAdjustSchema.parse(await c.req.json());
    const user = c.get('user');
    const product = await inventoryService.adjust(input, user.id);
    return ok(c, product);
  },
};
