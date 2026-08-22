import type { Context } from 'hono';
import { createExpenseSchema, expenseQuerySchema, updateExpenseSchema } from '@textile-admin/shared';
import { expenseService } from '../services/expenseService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const expenseController = {
  async list(c: Context<AppEnv>) {
    const query = expenseQuerySchema.parse(c.req.query());
    const result = await expenseService.list(query);
    return ok(c, result);
  },

  async getById(c: Context<AppEnv>) {
    const expense = await expenseService.getById(pathParam(c, 'id'));
    return ok(c, expense);
  },

  async create(c: Context<AppEnv>) {
    const input = createExpenseSchema.parse(await c.req.json());
    const user = c.get('user');
    const expense = await expenseService.create(input, user.id);
    return ok(c, expense, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateExpenseSchema.parse(await c.req.json());
    const expense = await expenseService.update(pathParam(c, 'id'), input);
    return ok(c, expense);
  },

  async remove(c: Context<AppEnv>) {
    await expenseService.remove(pathParam(c, 'id'));
    return ok(c, { deleted: true });
  },
};
