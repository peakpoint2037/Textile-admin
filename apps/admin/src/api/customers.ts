import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateCustomerInput,
  CustomerQuery,
  CustomerWithStatsDto,
  PaginatedResult,
  UpdateCustomerInput,
} from '@textile-admin/shared';
import { apiClient } from './client';

const KEY = ['customers'] as const;

export function useCustomers(query: Partial<CustomerQuery> = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => apiClient.get<PaginatedResult<CustomerWithStatsDto>>('/customers', query),
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<CustomerWithStatsDto>(`/customers/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) => apiClient.post<CustomerWithStatsDto>('/customers', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCustomer(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCustomerInput) => apiClient.patch<CustomerWithStatsDto>(`/customers/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/customers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
