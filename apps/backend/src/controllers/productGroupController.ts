import type { Context } from 'hono';
import {
  addProductGroupVariantSchema,
  createProductGroupSchema,
  productGroupQuerySchema,
  updateProductGroupSchema,
} from '@textile-admin/shared';
import { productGroupService } from '../services/productGroupService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const productGroupController = {
  async list(c: Context<AppEnv>) {
    const query = productGroupQuerySchema.parse(c.req.query());
    const result = await productGroupService.list(query);
    return ok(c, result);
  },

  async getById(c: Context<AppEnv>) {
    const group = await productGroupService.getById(pathParam(c, 'id'));
    return ok(c, group);
  },

  async create(c: Context<AppEnv>) {
    const input = createProductGroupSchema.parse(await c.req.json());
    const user = c.get('user');
    const group = await productGroupService.create(input, user.id);
    return ok(c, group, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateProductGroupSchema.parse(await c.req.json());
    const group = await productGroupService.update(pathParam(c, 'id'), input);
    return ok(c, group);
  },

  async addVariant(c: Context<AppEnv>) {
    const input = addProductGroupVariantSchema.parse(await c.req.json());
    const user = c.get('user');
    const group = await productGroupService.addVariant(pathParam(c, 'id'), input, user.id);
    return ok(c, group, 201);
  },

  async remove(c: Context<AppEnv>) {
    await productGroupService.remove(pathParam(c, 'id'));
    return ok(c, { removed: true });
  },
};
