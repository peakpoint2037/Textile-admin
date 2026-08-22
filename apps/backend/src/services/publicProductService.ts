import type { PaginatedResult, PublicProductDto, PublicProductQuery } from '@textile-admin/shared';
import { paginatedResult } from './helpers/paginatedResult.js';
import { pool } from '../config/db.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { mapPublicProduct } from '../utils/mappers.js';

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
};
