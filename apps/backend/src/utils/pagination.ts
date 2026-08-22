import type { PaginationMeta } from '@textile-admin/shared';

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function offsetFor(page: number, limit: number): number {
  return (page - 1) * limit;
}
