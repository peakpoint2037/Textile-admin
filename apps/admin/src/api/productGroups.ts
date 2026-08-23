import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddProductGroupVariantInput,
  CreateProductGroupInput,
  PaginatedResult,
  ProductGroupDetailDto,
  ProductGroupDto,
  ProductGroupQuery,
  UpdateProductGroupInput,
} from '@textile-admin/shared';
import { apiClient } from './client';

const KEY = ['productGroups'] as const;

function invalidateAfterMutation(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: KEY });
  queryClient.invalidateQueries({ queryKey: ['products'] });
  queryClient.invalidateQueries({ queryKey: ['inventory'] });
}

export function useProductGroups(query: Partial<ProductGroupQuery> = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => apiClient.get<PaginatedResult<ProductGroupDto>>('/product-groups', query),
  });
}

export function useProductGroup(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<ProductGroupDetailDto>(`/product-groups/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProductGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductGroupInput) =>
      apiClient.post<ProductGroupDetailDto>('/product-groups', input),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useUpdateProductGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductGroupInput) =>
      apiClient.patch<ProductGroupDetailDto>(`/product-groups/${id}`, input),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}

export function useAddProductGroupVariant(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProductGroupVariantInput) =>
      apiClient.post<ProductGroupDetailDto>(`/product-groups/${id}/variants`, input),
    onSuccess: () => invalidateAfterMutation(queryClient),
  });
}
