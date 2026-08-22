import type { Context } from 'hono';
import { createProductSchema, productQuerySchema, updateProductSchema } from '@textile-admin/shared';
import { productService } from '../services/productService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const productController = {
  async list(c: Context<AppEnv>) {
    const query = productQuerySchema.parse(c.req.query());
    const result = await productService.list(query);
    return ok(c, result);
  },

  async getById(c: Context<AppEnv>) {
    const product = await productService.getById(pathParam(c, 'id'));
    return ok(c, product);
  },

  async create(c: Context<AppEnv>) {
    const input = createProductSchema.parse(await c.req.json());
    const user = c.get('user');
    const product = await productService.create(input, user.id);
    return ok(c, product, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateProductSchema.parse(await c.req.json());
    const product = await productService.update(pathParam(c, 'id'), input);
    return ok(c, product);
  },

  async remove(c: Context<AppEnv>) {
    const result = await productService.remove(pathParam(c, 'id'));
    return ok(c, result);
  },
};
