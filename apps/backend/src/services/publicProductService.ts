import type {
  PaginatedResult,
  PublicProductDetailDto,
  PublicProductDto,
  PublicProductQuery,
} from '@textile-admin/shared';
import { paginatedResult } from './helpers/paginatedResult.js';
import { pool } from '../config/db.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { productImageRepository } from '../repositories/productImageRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapPublicProduct, mapPublicProductDetail } from '../utils/mappers.js';

export const publicProductService = {
  async list(query: PublicProductQuery): Promise<PaginatedResult<PublicProductDto>> {
    let categoryId: string | undefined;
    if (query.category) {
      const category = await categoryRepository.findBySlug(pool, query.category);
      // An unknown category slug is a normal "no matches" case for a public
      // listing, not an error — return an empty page rather than a 404.
      if (!category) return paginatedResult([], query.page, query.limit, 0);
      categoryId = category.id;
    }

    const { items, total } = await productRepository.list(pool, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      categoryId,
      size: query.size,
      color: query.color,
      status: 'ACTIVE',
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });

    return paginatedResult(items.map(mapPublicProduct), query.page, query.limit, total);
  },

  async getById(id: string): Promise<PublicProductDetailDto> {
    const row = await productRepository.findById(pool, id);
    // Inactive/archived products 404 here too, same as the list endpoint's
    // status filter — a product id must not leak existence/details for
    // anything that isn't ACTIVE.
    if (!row || row.status !== 'ACTIVE') throw ApiError.notFound('Product');

    const images = await productImageRepository.listByProduct(pool, id);
    return mapPublicProductDetail(row, images);
  },
};
