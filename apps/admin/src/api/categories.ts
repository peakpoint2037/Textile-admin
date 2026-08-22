import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CategoryDto, CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from '@textile-admin/shared';
import { apiClient } from './client';

const KEY = ['categories'] as const;

export function useCategories(query: CategoryQuery = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => apiClient.get<CategoryDto[]>('/categories', query),
  });
}

export function useCategory(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<CategoryDto>(`/categories/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => apiClient.post<CategoryDto>('/categories', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCategory(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCategoryInput) => apiClient.patch<CategoryDto>(`/categories/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
