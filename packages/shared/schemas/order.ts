import { z } from 'zod';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../constants/enums.js';
import { paginationQuerySchema } from './common.js';

export const orderItemInputSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  /** Optional per-unit price override; defaults to the product's current selling price. */
  unitPrice: z.coerce.number().min(0).optional(),
  /** Optional per-line discount amount (absolute, not percent). */
  discount: z.coerce.number().min(0).optional().default(0),
});
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;

export const createOrderSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(orderItemInputSchema).min(1, 'Order must contain at least one item'),
  discount: z.coerce.number().min(0).optional().default(0),
  shippingFee: z.coerce.number().min(0).optional().default(0),
  tax: z.coerce.number().min(0).optional().default(0),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional().default('PENDING'),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  discount: z.coerce.number().min(0).optional(),
  shippingFee: z.coerce.number().min(0).optional(),
  tax: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
});
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
});
export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusSchema>;

export const orderQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  customerId: z.string().uuid().optional(),
});
export type OrderQuery = z.infer<typeof orderQuerySchema>;
