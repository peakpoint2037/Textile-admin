import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/** z.coerce.boolean() treats any non-empty string (including "false") as true, so
 *  query-string booleans need this explicit string->boolean mapping instead. */
export const booleanQueryParam = z.preprocess((v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v;
}, z.boolean().optional());

export const dateRangeQuerySchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
});
export type DateRangeQuery = z.infer<typeof dateRangeQuerySchema>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
