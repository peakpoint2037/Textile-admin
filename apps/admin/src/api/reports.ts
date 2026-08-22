import { useQuery } from '@tanstack/react-query';
import type {
  DashboardDto,
  DateRangeQuery,
  InventoryReportDto,
  ProfitReportDto,
  SalesReportDto,
} from '@textile-admin/shared';
import { apiClient } from './client';

export function useDashboard(range: Partial<DateRangeQuery> = {}) {
  return useQuery({
    queryKey: ['reports', 'dashboard', range],
    queryFn: () => apiClient.get<DashboardDto>('/reports/dashboard', range),
  });
}

export function useSalesReport(range: Partial<DateRangeQuery> = {}) {
  return useQuery({
    queryKey: ['reports', 'sales', range],
    queryFn: () => apiClient.get<SalesReportDto>('/reports/sales', range),
  });
}

export function useProfitReport(range: Partial<DateRangeQuery> = {}) {
  return useQuery({
    queryKey: ['reports', 'profit', range],
    queryFn: () => apiClient.get<ProfitReportDto>('/reports/profit', range),
  });
}

export function useInventoryReport() {
  return useQuery({
    queryKey: ['reports', 'inventory'],
    queryFn: () => apiClient.get<InventoryReportDto>('/reports/inventory'),
  });
}
