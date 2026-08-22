import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  InventoryListItemDto,
  InventoryMovementDto,
  InventoryQuery,
  MovementQuery,
  PaginatedResult,
  ProductDetailDto,
  StockAdjustInput,
  StockInInput,
} from '@textile-admin/shared';
import { apiClient } from './client';

export function useInventory(query: Partial<InventoryQuery> = {}) {
  return useQuery({
    queryKey: ['inventory', query],
    queryFn: () => apiClient.get<PaginatedResult<InventoryListItemDto>>('/inventory', query),
  });
}

export function useLowStock(query: { page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['inventory', 'low-stock', query],
    queryFn: () => apiClient.get<PaginatedResult<InventoryListItemDto>>('/inventory/low-stock', query),
  });
}

export function useMovements(query: Partial<MovementQuery> = {}) {
  return useQuery({
    queryKey: ['inventory', 'movements', query],
    queryFn: () => apiClient.get<PaginatedResult<InventoryMovementDto>>('/inventory/movements', query),
  });
}

function useInvalidateInventory() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };
}

export function useStockIn() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: StockInInput) => apiClient.post<ProductDetailDto>('/inventory/stock-in', input),
    onSuccess: invalidate,
  });
}

export function useStockAdjust() {
  const invalidate = useInvalidateInventory();
  return useMutation({
    mutationFn: (input: StockAdjustInput) => apiClient.post<ProductDetailDto>('/inventory/adjust', input),
    onSuccess: invalidate,
  });
}
