import { z } from 'zod';
import { booleanQueryParam } from './common.js';

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase, alphanumeric, hyphen-separated')
    .optional(),
  description: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categoryQuerySchema = z.object({
  search: z.string().trim().optional(),
  isActive: booleanQueryParam,
});
export type CategoryQuery = z.infer<typeof categoryQuerySchema>;
