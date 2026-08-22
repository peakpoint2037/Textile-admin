import { z } from 'zod';
import { MOVEMENT_TYPES } from '../constants/enums.js';
import { paginationQuerySchema } from './common.js';

export const stockInSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive('Quantity must be greater than 0'),
  reason: z.string().trim().max(500).optional().nullable(),
});
export type StockInInput = z.infer<typeof stockInSchema>;

export const stockAdjustSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().refine((v) => v !== 0, 'Quantity cannot be zero'),
  reason: z.string().trim().min(1, 'Reason is required for adjustments').max(500),
});
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;

export const inventoryQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW', 'OUT_OF_STOCK']).optional(),
});
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

export const movementQuerySchema = paginationQuerySchema.extend({
  productId: z.string().uuid().optional(),
  type: z.enum(MOVEMENT_TYPES).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type MovementQuery = z.infer<typeof movementQuerySchema>;
