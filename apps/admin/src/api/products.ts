import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddProductImageInput,
  CreateProductInput,
  PaginatedResult,
  ProductDetailDto,
  ProductImageDto,
  ProductQuery,
  RequestUploadUrlInput,
  UpdateProductImageInput,
  UpdateProductInput,
} from '@textile-admin/shared';
import { apiClient } from './client';

const KEY = ['products'] as const;

export function useProducts(query: Partial<ProductQuery> = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => apiClient.get<PaginatedResult<ProductDetailDto>>('/products', query),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: () => apiClient.get<ProductDetailDto>(`/products/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => apiClient.post<ProductDetailDto>('/products', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProduct(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProductInput) => apiClient.patch<ProductDetailDto>(`/products/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ archived: boolean }>(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRequestUploadUrl(productId: string) {
  return useMutation({
    mutationFn: (input: RequestUploadUrlInput) =>
      apiClient.post<{ uploadUrl: string; storageKey: string }>(`/products/${productId}/images/upload-url`, input),
  });
}

export function useAddProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddProductImageInput) =>
      apiClient.post<ProductImageDto>(`/products/${productId}/images`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, productId] }),
  });
}

export function useUpdateProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ imageId, input }: { imageId: string; input: UpdateProductImageInput }) =>
      apiClient.patch<ProductImageDto>(`/products/${productId}/images/${imageId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, productId] }),
  });
}

export function useDeleteProductImage(productId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) => apiClient.delete(`/products/${productId}/images/${imageId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...KEY, productId] }),
  });
}
