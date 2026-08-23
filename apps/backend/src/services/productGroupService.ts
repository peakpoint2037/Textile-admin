import type {
  AddProductGroupVariantInput,
  CreateProductGroupInput,
  ProductGroupDetailDto,
  ProductGroupDto,
  UpdateProductGroupInput,
} from '@textile-admin/shared';
import { paginatedResult, type PaginatedResult } from './helpers/paginatedResult.js';
import { pool, withTransaction } from '../config/db.js';
import { productGroupRepository } from '../repositories/productGroupRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapProductGroup, mapProductGroupDetail, mapProductListItem } from '../utils/mappers.js';
import { assertCategoryExists, assertSkuAvailable, createProductRow } from './productService.js';

interface ProductGroupListFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

async function findRowOrThrow(id: string) {
  const row = await productGroupRepository.findById(pool, id);
  if (!row) throw ApiError.notFound('Product group');
  return row;
}

export const productGroupService = {
  async list(filters: ProductGroupListFilters): Promise<PaginatedResult<ProductGroupDto>> {
    const { items, total } = await productGroupRepository.list(pool, filters);
    return paginatedResult(items.map(mapProductGroup), filters.page, filters.limit, total);
  },

  async getById(id: string): Promise<ProductGroupDetailDto> {
    const row = await findRowOrThrow(id);
    const { items: variantRows } = await productRepository.list(pool, {
      page: 1,
      limit: 500,
      groupId: id,
      sortBy: 'createdAt',
      sortDir: 'asc',
    });
    return mapProductGroupDetail(row, variantRows.map(mapProductListItem));
  },

  async create(input: CreateProductGroupInput, userId: string): Promise<ProductGroupDetailDto> {
    await assertCategoryExists(input.categoryId);
    for (const variant of input.variants) {
      await assertSkuAvailable(variant.sku);
    }

    const created = await withTransaction(async (client) => {
      const group = await productGroupRepository.create(client, {
        categoryId: input.categoryId ?? null,
        name: input.name,
        description: input.description ?? null,
        purchasePrice: input.purchasePrice,
        sellingPrice: input.sellingPrice,
        status: input.status,
      });

      for (const variant of input.variants) {
        await createProductRow(
          client,
          {
            categoryId: input.categoryId ?? null,
            sku: variant.sku,
            name: input.name,
            description: input.description ?? null,
            size: variant.size ?? null,
            color: variant.color ?? null,
            purchasePrice: input.purchasePrice,
            sellingPrice: input.sellingPrice,
            stockQuantity: variant.stockQuantity,
            lowStockLimit: variant.lowStockLimit,
            status: input.status,
            groupId: group.id,
          },
          userId,
        );
      }

      return group;
    });

    return this.getById(created.id);
  },

  async update(id: string, input: UpdateProductGroupInput): Promise<ProductGroupDetailDto> {
    await findRowOrThrow(id);
    if (input.categoryId !== undefined) await assertCategoryExists(input.categoryId);

    await withTransaction(async (client) => {
      await productGroupRepository.update(client, id, {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice } : {}),
        ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      });

      // Cascades onto every variant row — this is what keeps "one shared
      // price" (and name/category/description/status) true after an edit.
      await productRepository.updateByGroup(client, id, {
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description ?? null } : {}),
        ...(input.purchasePrice !== undefined ? { purchasePrice: input.purchasePrice } : {}),
        ...(input.sellingPrice !== undefined ? { sellingPrice: input.sellingPrice } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      });
    });

    return this.getById(id);
  },

  async addVariant(
    groupId: string,
    input: AddProductGroupVariantInput,
    userId: string,
  ): Promise<ProductGroupDetailDto> {
    const group = await findRowOrThrow(groupId);
    await assertSkuAvailable(input.sku);

    await withTransaction((client) =>
      createProductRow(
        client,
        {
          categoryId: group.category_id,
          sku: input.sku,
          name: group.name,
          description: group.description,
          size: input.size ?? null,
          color: input.color ?? null,
          purchasePrice: Number(group.purchase_price),
          sellingPrice: Number(group.selling_price),
          stockQuantity: input.stockQuantity,
          lowStockLimit: input.lowStockLimit,
          status: group.status,
          groupId: group.id,
        },
        userId,
      ),
    );

    return this.getById(groupId);
  },

  async remove(id: string): Promise<void> {
    await findRowOrThrow(id);
    if (await productGroupRepository.hasVariants(pool, id)) {
      throw ApiError.conflict(
        'PRODUCT_GROUP_IN_USE',
        'This product group still has variants. Remove or reassign them first.',
      );
    }
    await productGroupRepository.remove(pool, id);
  },
};
