import type { Context } from 'hono';
import {
  addProductImageSchema,
  requestUploadUrlSchema,
  updateProductImageSchema,
} from '@textile-admin/shared';
import { productImageService } from '../services/productImageService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const productImageController = {
  async requestUploadUrl(c: Context<AppEnv>) {
    const input = requestUploadUrlSchema.parse(await c.req.json());
    const result = await productImageService.requestUploadUrl(pathParam(c, 'id'), input);
    return ok(c, result);
  },

  async list(c: Context<AppEnv>) {
    const images = await productImageService.list(pathParam(c, 'id'));
    return ok(c, images);
  },

  async add(c: Context<AppEnv>) {
    const input = addProductImageSchema.parse(await c.req.json());
    const image = await productImageService.add(pathParam(c, 'id'), input);
    return ok(c, image, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateProductImageSchema.parse(await c.req.json());
    const image = await productImageService.update(pathParam(c, 'id'), pathParam(c, 'imageId'), input);
    return ok(c, image);
  },

  async remove(c: Context<AppEnv>) {
    await productImageService.remove(pathParam(c, 'id'), pathParam(c, 'imageId'));
    return ok(c, { deleted: true });
  },
};
