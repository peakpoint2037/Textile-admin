import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(150),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().optional().nullable().or(z.literal('')),
  address: z.string().trim().max(500).optional().nullable(),
  city: z.string().trim().max(100).optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  pincode: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().max(100).optional().default('India'),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const customerQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
});
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
