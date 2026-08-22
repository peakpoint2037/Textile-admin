import type {
  InventoryListItemDto,
  InventoryMovementDto,
  InventoryQuery,
  MovementQuery,
  ProductDetailDto,
  StockAdjustInput,
  StockInInput,
} from '@textile-admin/shared';
import { paginatedResult, type PaginatedResult } from './helpers/paginatedResult.js';
import { pool, withTransaction } from '../config/db.js';
import { inventoryMovementRepository } from '../repositories/inventoryMovementRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapInventoryListItem, mapMovement } from '../utils/mappers.js';
import { productService } from './productService.js';

export const inventoryService = {
  async list(filters: InventoryQuery): Promise<PaginatedResult<InventoryListItemDto>> {
    const { items, total } = await productRepository.list(pool, {
      page: filters.page,
      limit: filters.limit,
      search: filters.search,
      stockStatus: filters.stockStatus,
      sortBy: 'name',
      sortDir: 'asc',
    });
    return paginatedResult(items.map(mapInventoryListItem), filters.page, filters.limit, total);
  },

  async lowStock(pagination: {
    page: number;
    limit: number;
  }): Promise<PaginatedResult<InventoryListItemDto>> {
    const { items, total } = await productRepository.listLowStock(pool, pagination);
    return paginatedResult(items.map(mapInventoryListItem), pagination.page, pagination.limit, total);
  },

  async movements(filters: MovementQuery): Promise<PaginatedResult<InventoryMovementDto>> {
    const { items, total } = await inventoryMovementRepository.list(pool, filters);
    return paginatedResult(items.map(mapMovement), filters.page, filters.limit, total);
  },

  async stockIn(input: StockInInput, userId: string): Promise<ProductDetailDto> {
    await withTransaction(async (client) => {
      const product = await productRepository.lockForUpdate(client, input.productId);
      if (!product) throw ApiError.notFound('Product');

      const newQuantity = product.stock_quantity + input.quantity;
      await productRepository.setStockQuantity(client, product.id, newQuantity);
      await inventoryMovementRepository.create(client, {
        productId: product.id,
        type: 'STOCK_IN',
        quantity: input.quantity,
        reason: input.reason ?? 'Stock added',
        createdBy: userId,
      });
    });

    return productService.getById(input.productId);
  },

  async adjust(input: StockAdjustInput, userId: string): Promise<ProductDetailDto> {
    await withTransaction(async (client) => {
      const product = await productRepository.lockForUpdate(client, input.productId);
      if (!product) throw ApiError.notFound('Product');

      const newQuantity = product.stock_quantity + input.quantity;
      if (newQuantity < 0) {
        throw ApiError.validation(
          `Adjustment would result in negative stock (current: ${product.stock_quantity}, change: ${input.quantity})`,
        );
      }

      await productRepository.setStockQuantity(client, product.id, newQuantity);
      await inventoryMovementRepository.create(client, {
        productId: product.id,
        type: 'ADJUSTMENT',
        quantity: input.quantity,
        reason: input.reason,
        createdBy: userId,
      });
    });

    return productService.getById(input.productId);
  },
};
