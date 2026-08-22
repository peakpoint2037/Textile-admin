import type {
  CreateProductInput,
  ProductDetailDto,
  ProductListItemDto,
  ProductQuery,
  UpdateProductInput,
} from '@textile-admin/shared';
import { paginatedResult, type PaginatedResult } from './helpers/paginatedResult.js';
import { pool, withTransaction } from '../config/db.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { inventoryMovementRepository } from '../repositories/inventoryMovementRepository.js';
import { productImageRepository } from '../repositories/productImageRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapProductDetail, mapProductListItem } from '../utils/mappers.js';

async function findRowOrThrow(id: string) {
  const row = await productRepository.findById(pool, id);
  if (!row) throw ApiError.notFound('Product');
  return row;
}

async function assertSkuAvailable(sku: string, excludeId?: string) {
  const existing = await productRepository.findBySku(pool, sku);
  if (existing && existing.id !== excludeId) {
    throw ApiError.conflict('PRODUCT_SKU_EXISTS', 'A product with this SKU already exists');
  }
}

async function assertCategoryExists(categoryId: string | null | undefined) {
  if (!categoryId) return;
  const category = await categoryRepository.findById(pool, categoryId);
  if (!category) throw ApiError.notFound('Category', 'CATEGORY_NOT_FOUND');
}

export const productService = {
  async list(filters: ProductQuery): Promise<PaginatedResult<ProductListItemDto>> {
    const { items, total } = await productRepository.list(pool, filters);
    return paginatedResult(items.map(mapProductListItem), filters.page, filters.limit, total);
  },

  async getById(id: string): Promise<ProductDetailDto> {
    const row = await findRowOrThrow(id);
    const images = await productImageRepository.listByProduct(pool, id);
    return mapProductDetail(row, images);
  },

  async create(input: CreateProductInput, userId: string): Promise<ProductDetailDto> {
    await assertSkuAvailable(input.sku);
    await assertCategoryExists(input.categoryId);

    const created = await withTransaction(async (client) => {
      const product = await productRepository.create(client, {
        categoryId: input.categoryId ?? null,
        sku: input.sku,
        name: input.name,
        description: input.description ?? null,
        size: input.size ?? null,
        color: input.color ?? null,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        stockQuantity: input.stockQuantity,
        lowStockLimit: input.lowStockLimit,
        status: input.status,
      });

      if (input.stockQuantity > 0) {
        await inventoryMovementRepository.create(client, {
          productId: product.id,
          type: 'OPENING_STOCK',
          quantity: input.stockQuantity,
          reason: 'Initial stock on product creation',
          createdBy: userId,
        });
      }

      return product;
    });

    return this.getById(created.id);
  },

  async update(id: string, input: UpdateProductInput): Promise<ProductDetailDto> {
    await findRowOrThrow(id);
    if (input.sku !== undefined) await assertSkuAvailable(input.sku, id);
    if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);

    await productRepository.update(pool, id, {
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.sku !== undefined ? { sku: input.sku } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.size !== undefined ? { size: input.size ?? null } : {}),
      ...(input.color !== undefined ? { color: input.color ?? null } : {}),
      ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice } : {}),
      ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
      ...(input.lowStockLimit !== undefined ? { lowStockLimit: input.lowStockLimit } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    });

    return this.getById(id);
  },

  async remove(id: string): Promise<{ archived: boolean }> {
    await findRowOrThrow(id);

    const [hasOrders, hasMovements] = await Promise.all([
      productRepository.hasOrderReferences(pool, id),
      inventoryMovementRepository.existsForProduct(pool, id),
    ]);

    if (hasOrders || hasMovements) {
      throw ApiError.conflict(
        'PRODUCT_IN_USE',
        'This product has order or stock history and cannot be deleted. Archive it instead (set status to ARCHIVED).',
      );
    }

    await productRepository.remove(pool, id);
    return { archived: false };
  },
};
