import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateOrderInput,
  OrderDetailDto,
  OrderListItemDto,
  OrderQuery,
  OrderStatus,
  PaginatedResult,
  PaymentStatus,
  UpdateOrderInput,
} from '@textile-admin/shared';
import { apiClient } from './client';

const KEY = ['orders'] as const;

export function useOrders(query: Partial<OrderQuery> = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => apiClient.get<PaginatedResult<OrderListItemDto>>('/orders', query),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<OrderDetailDto>(`/orders/${id}`),
    enabled: Boolean(id),
  });
}

/** One-off fetch for places that need full order detail outside a
 *  component's own render (e.g. a list row's Print/Download action). */
export function fetchOrder(id: string): Promise<OrderDetailDto> {
  return apiClient.get<OrderDetailDto>(`/orders/${id}`);
}

function useInvalidateOrders(id?: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: KEY });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    if (id) queryClient.invalidateQueries({ queryKey: [...KEY, id] });
  };
}

export function useCreateOrder() {
  const invalidate = useInvalidateOrders();
  return useMutation({
    mutationFn: (input: CreateOrderInput) => apiClient.post<OrderDetailDto>('/orders', input),
    onSuccess: invalidate,
  });
}

export function useUpdateOrder(id: string) {
  const invalidate = useInvalidateOrders(id);
  return useMutation({
    mutationFn: (input: UpdateOrderInput) => apiClient.patch<OrderDetailDto>(`/orders/${id}`, input),
    onSuccess: invalidate,
  });
}

export function useUpdateOrderStatus(id: string) {
  const invalidate = useInvalidateOrders(id);
  return useMutation({
    mutationFn: (status: OrderStatus) => apiClient.patch<OrderDetailDto>(`/orders/${id}/status`, { status }),
    onSuccess: invalidate,
  });
}

export function useUpdatePaymentStatus(id: string) {
  const invalidate = useInvalidateOrders(id);
  return useMutation({
    mutationFn: (paymentStatus: PaymentStatus) =>
      apiClient.patch<OrderDetailDto>(`/orders/${id}/payment`, { paymentStatus }),
    onSuccess: invalidate,
  });
}
