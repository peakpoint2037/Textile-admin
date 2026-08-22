import type { PaginatedResult as SharedPaginatedResult } from '@textile-admin/shared';
import { paginationMeta } from '../../utils/pagination.js';

export type PaginatedResult<T> = SharedPaginatedResult<T>;

export function paginatedResult<T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return { items, pagination: paginationMeta(page, limit, total) };
}
