import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DateRangeQuery, ExcelImportResult } from '@textile-admin/shared';
import { apiClient, triggerBlobDownload, uploadFile } from './client';

export function useImportProducts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, confirm }: { file: File; confirm: boolean }) =>
      uploadFile('/excel/products/import', file, { confirm: String(confirm) }) as Promise<ExcelImportResult>,
    onSuccess: (result) => {
      if (result.committed) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
    },
  });
}

export function useImportStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, confirm }: { file: File; confirm: boolean }) =>
      uploadFile('/excel/stock/import', file, { confirm: String(confirm) }) as Promise<ExcelImportResult>,
    onSuccess: (result) => {
      if (result.committed) {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
      }
    },
  });
}

const EXPORT_ENDPOINTS = {
  products: '/excel/products/export',
  inventory: '/excel/inventory/export',
  orders: '/excel/orders/export',
  sales: '/excel/sales/export',
  profit: '/excel/profit/export',
} as const;

export type ExportKind = keyof typeof EXPORT_ENDPOINTS;

export function useExportExcel() {
  return useMutation({
    mutationFn: async ({ kind, range }: { kind: ExportKind; range?: Partial<DateRangeQuery> }) => {
      const blob = await apiClient.download(EXPORT_ENDPOINTS[kind], range);
      triggerBlobDownload(blob, `${kind}.xlsx`);
    },
  });
}
