import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../constants/enums.js';
import { paginationQuerySchema } from './common.js';

export const createExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().trim().max(1000).optional().nullable(),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  expenseDate: z.string().date(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const expenseQuerySchema = paginationQuerySchema.extend({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type ExpenseQuery = z.infer<typeof expenseQuerySchema>;
