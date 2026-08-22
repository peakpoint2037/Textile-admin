import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/testUtils';
import { ProductListPage } from './ProductListPage';

vi.mock('@/api/categories', () => ({
  useCategories: () => ({ data: [{ id: 'cat-1', name: 'T-Shirts' }] }),
}));

vi.mock('@/api/excel', () => ({
  useExportExcel: () => ({ mutate: vi.fn() }),
}));

const sampleProduct = {
  id: 'p1',
  sku: 'TS-BLK-M',
  name: 'Oversized T-Shirt',
  categoryId: 'cat-1',
  categoryName: 'T-Shirts',
  size: 'M',
  color: 'Black',
  purchasePrice: 300,
  sellingPrice: 799,
  stockQuantity: 10,
  lowStockLimit: 5,
  status: 'ACTIVE',
  stockStatus: 'IN_STOCK',
  primaryImageUrl: null,
  imageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

let mockProductsResult: unknown;

vi.mock('@/api/products', () => ({
  useProducts: () => mockProductsResult,
  useDeleteProduct: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ProductListPage', () => {
  it('renders product rows from the API result', () => {
    mockProductsResult = {
      data: { items: [sampleProduct], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithProviders(<ProductListPage />);

    expect(screen.getByText('Oversized T-Shirt')).toBeInTheDocument();
    expect(screen.getByText('TS-BLK-M')).toBeInTheDocument();
    expect(screen.getByText('In Stock')).toBeInTheDocument();
  });

  it('shows an empty state when there are no products', () => {
    mockProductsResult = {
      data: { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 } },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    };

    renderWithProviders(<ProductListPage />);

    expect(screen.getByText(/no products found/i)).toBeInTheDocument();
  });
});
