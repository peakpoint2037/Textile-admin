import type { Context } from 'hono';
import {
  createOrderSchema,
  orderQuerySchema,
  updateOrderSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from '@textile-admin/shared';
import { orderService } from '../services/orderService.js';
import { pathParam } from '../utils/params.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const orderController = {
  async list(c: Context<AppEnv>) {
    const query = orderQuerySchema.parse(c.req.query());
    const result = await orderService.list(query);
    return ok(c, result);
  },

  async getById(c: Context<AppEnv>) {
    const order = await orderService.getById(pathParam(c, 'id'));
    return ok(c, order);
  },

  async create(c: Context<AppEnv>) {
    const input = createOrderSchema.parse(await c.req.json());
    const order = await orderService.create(input);
    return ok(c, order, 201);
  },

  async update(c: Context<AppEnv>) {
    const input = updateOrderSchema.parse(await c.req.json());
    const order = await orderService.update(pathParam(c, 'id'), input);
    return ok(c, order);
  },

  async updateStatus(c: Context<AppEnv>) {
    const input = updateOrderStatusSchema.parse(await c.req.json());
    const user = c.get('user');
    const order = await orderService.updateStatus(pathParam(c, 'id'), input.status, user.id);
    return ok(c, order);
  },

  async updatePayment(c: Context<AppEnv>) {
    const input = updatePaymentStatusSchema.parse(await c.req.json());
    const order = await orderService.updatePaymentStatus(pathParam(c, 'id'), input.paymentStatus);
    return ok(c, order);
  },
};
