import type { Context } from 'hono';
import { createCustomerSchema, customerQuerySchema, updateCustomerSchema } from '@textile-admin/shared';
import { customerService } from '../services/customerService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const customerController = {
  async list(c: Context<AppEnv>) {
    const query = customerQuerySchema.parse(c.req.query());
    const result = await customerService.list(query);
    return ok(c, result);
  },

  async getById(c: Context<AppEnv>) {
    const customer = await customerService.getById(pathParam(c, 'id'));
    return ok(c, customer);
  },

  async create(c: Context<AppEnv>) {
    const input = createCustomerSchema.parse(await c.req.json());
    const customer = await customerService.create(input);
    return ok(c, customer, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateCustomerSchema.parse(await c.req.json());
    const customer = await customerService.update(pathParam(c, 'id'), input);
    return ok(c, customer);
  },

  async remove(c: Context<AppEnv>) {
    await customerService.remove(pathParam(c, 'id'));
    return ok(c, { deleted: true });
  },
};
