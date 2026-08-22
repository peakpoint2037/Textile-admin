import type { Context } from 'hono';
import {
  categoryQuerySchema,
  createCategorySchema,
  updateCategorySchema,
} from '@textile-admin/shared';
import { categoryService } from '../services/categoryService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const categoryController = {
  async list(c: Context<AppEnv>) {
    const query = categoryQuerySchema.parse(c.req.query());
    const categories = await categoryService.list(query);
    return ok(c, categories);
  },

  async getById(c: Context<AppEnv>) {
    const category = await categoryService.getById(pathParam(c, 'id'));
    return ok(c, category);
  },

  async create(c: Context<AppEnv>) {
    const input = createCategorySchema.parse(await c.req.json());
    const category = await categoryService.create(input);
    return ok(c, category, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateCategorySchema.parse(await c.req.json());
    const category = await categoryService.update(pathParam(c, 'id'), input);
    return ok(c, category);
  },

  async remove(c: Context<AppEnv>) {
    await categoryService.remove(pathParam(c, 'id'));
    return ok(c, { deleted: true });
  },
};
