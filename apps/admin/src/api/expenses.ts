import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateExpenseInput, ExpenseDto, ExpenseQuery, PaginatedResult, UpdateExpenseInput } from '@textile-admin/shared';
import { apiClient } from './client';

const KEY = ['expenses'] as const;

export function useExpenses(query: Partial<ExpenseQuery> = {}) {
  return useQuery({
    queryKey: [...KEY, query],
    queryFn: () => apiClient.get<PaginatedResult<ExpenseDto>>('/expenses', query),
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => apiClient.post<ExpenseDto>('/expenses', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateExpense(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateExpenseInput) => apiClient.patch<ExpenseDto>(`/expenses/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/expenses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
