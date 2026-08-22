import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/testUtils';
import { DashboardPage } from './DashboardPage';

const dashboardData = {
  revenue: 12450,
  orders: 6,
  unitsSold: 14,
  grossProfit: 5300,
  expenses: 800,
  netProfit: 4500,
  lowStockCount: 2,
  outOfStockCount: 1,
  salesByDay: [{ date: '2026-01-01', orders: 2, units: 4, revenue: 3200 }],
  topProducts: [{ productId: 'p1', sku: 'TS-BLK-M', name: 'Oversized T-Shirt', unitsSold: 4, revenue: 3200 }],
  orderStatusDistribution: [{ status: 'CONFIRMED', count: 3 }],
  paymentStatusDistribution: [{ status: 'PAID', count: 3 }],
  lowStockProducts: [
    {
      id: 'p2',
      sku: 'HD-BLK-L',
      name: 'Pullover Hoodie',
      size: 'L',
      color: 'Black',
      stockQuantity: 3,
      lowStockLimit: 5,
      stockStatus: 'LOW' as const,
      status: 'ACTIVE' as const,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
};

vi.mock('@/api/reports', () => ({
  useDashboard: () => ({ data: dashboardData, isPending: false, isError: false, error: null, refetch: vi.fn() }),
}));

describe('DashboardPage', () => {
  it('renders KPI stat cards and the low-stock list', () => {
    renderWithProviders(<DashboardPage />);

    expect(screen.getByText('₹12,450')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // orders
    expect(screen.getByText('Pullover Hoodie')).toBeInTheDocument();
    expect(screen.getByText('3 left')).toBeInTheDocument();
  });

  it('shows loading skeletons while pending', async () => {
    const reportsApi = await import('@/api/reports');
    vi.spyOn(reportsApi, 'useDashboard').mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof reportsApi.useDashboard>);

    const { container } = renderWithProviders(<DashboardPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });
});
