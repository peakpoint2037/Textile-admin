import { z } from 'zod';
import { PRODUCT_STATUSES } from '../constants/enums.js';
import { paginationQuerySchema } from './common.js';

export const createProductSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  name: z.string().trim().min(1, 'Name is required').max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  size: z.string().trim().max(30).optional().nullable(),
  color: z.string().trim().max(50).optional().nullable(),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  lowStockLimit: z.coerce.number().int().min(0).default(5),
  status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

/** One size/color combination within a product group — everything a
 *  standalone product has except the fields the group owns (name, category,
 *  description, price, status), which every variant inherits. */
export const productVariantInputSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(60),
  size: z.string().trim().max(30).optional().nullable(),
  color: z.string().trim().max(50).optional().nullable(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  lowStockLimit: z.coerce.number().int().min(0).default(5),
});
export type ProductVariantInput = z.infer<typeof productVariantInputSchema>;

export const createProductGroupSchema = z
  .object({
    categoryId: z.string().uuid().optional().nullable(),
    name: z.string().trim().min(1, 'Name is required').max(200),
    description: z.string().trim().max(4000).optional().nullable(),
    purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative'),
    sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative'),
    status: z.enum(PRODUCT_STATUSES).default('ACTIVE'),
    variants: z.array(productVariantInputSchema).min(1, 'Add at least one variant'),
  })
  .refine(
    (data) => {
      const skus = data.variants.map((v) => v.sku.trim().toUpperCase());
      return new Set(skus).size === skus.length;
    },
    { message: 'Each variant needs a unique SKU', path: ['variants'] },
  );
export type CreateProductGroupInput = z.infer<typeof createProductGroupSchema>;

/** Shared fields only — variants are managed individually (edit an existing
 *  product row) or via addProductGroupVariantSchema (add a new one). */
export const updateProductGroupSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  name: z.string().trim().min(1, 'Name is required').max(200).optional(),
  description: z.string().trim().max(4000).optional().nullable(),
  purchasePrice: z.coerce.number().min(0, 'Purchase price cannot be negative').optional(),
  sellingPrice: z.coerce.number().min(0, 'Selling price cannot be negative').optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});
export type UpdateProductGroupInput = z.infer<typeof updateProductGroupSchema>;

export const addProductGroupVariantSchema = productVariantInputSchema;
export type AddProductGroupVariantInput = z.infer<typeof addProductGroupVariantSchema>;

export const productGroupQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
});
export type ProductGroupQuery = z.infer<typeof productGroupQuerySchema>;

export const productQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  categoryId: z.string().uuid().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  stockStatus: z.enum(['IN_STOCK', 'LOW', 'OUT_OF_STOCK']).optional(),
  sortBy: z
    .enum(['name', 'sku', 'sellingPrice', 'stockQuantity', 'createdAt'])
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

/** Filters for the public, unauthenticated storefront listing — a category
 *  slug (not the internal UUID) rather than categoryId, and no status
 *  filter since public listings only ever show ACTIVE products. */
export const publicProductQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  sortBy: z.enum(['name', 'sellingPrice', 'createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type PublicProductQuery = z.infer<typeof publicProductQuerySchema>;

export const addProductImageSchema = z.object({
  storageKey: z.string().min(1),
  imageUrl: z.string().url(),
  altText: z.string().trim().max(200).optional().nullable(),
  isPrimary: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().min(0).optional().default(0),
});
export type AddProductImageInput = z.infer<typeof addProductImageSchema>;

export const updateProductImageSchema = z.object({
  altText: z.string().trim().max(200).optional().nullable(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
});
export type UpdateProductImageInput = z.infer<typeof updateProductImageSchema>;

export const requestUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, 'File must not exceed 10MB'),
});
export type RequestUploadUrlInput = z.infer<typeof requestUploadUrlSchema>;
