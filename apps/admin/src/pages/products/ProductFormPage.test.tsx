import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/testUtils';
import { ProductFormPage } from './ProductFormPage';

const createProduct = vi.fn().mockResolvedValue({ id: 'new-product-id' });

vi.mock('@/api/categories', () => ({
  useCategories: () => ({ data: [{ id: 'cat-1', name: 'T-Shirts', slug: 't-shirts', isActive: true }] }),
}));

vi.mock('@/api/products', () => ({
  useProduct: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useCreateProduct: () => ({ mutateAsync: createProduct }),
  useUpdateProduct: () => ({ mutateAsync: vi.fn() }),
}));

describe('ProductFormPage (create mode)', () => {
  it('renders the create form without a stock-quantity edit note', () => {
    renderWithProviders(<ProductFormPage />, { route: '/products/new', path: '/products/new' });
    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^sku$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/initial stock quantity/i)).toBeInTheDocument();
    expect(screen.getByText(/save the product first to add images/i)).toBeInTheDocument();
  });

  it('submits the form and calls the create mutation', async () => {
    renderWithProviders(<ProductFormPage />, { route: '/products/new', path: '/products/new' });

    fireEvent.change(screen.getByLabelText(/product name/i), { target: { value: 'Oversized T-Shirt' } });
    fireEvent.change(screen.getByLabelText(/^sku$/i), { target: { value: 'TS-BLK-M' } });
    fireEvent.change(screen.getByLabelText(/purchase price/i), { target: { value: '300' } });
    fireEvent.change(screen.getByLabelText(/selling price/i), { target: { value: '799' } });

    fireEvent.click(screen.getByRole('button', { name: /create product/i }));

    await waitFor(() =>
      expect(createProduct).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'TS-BLK-M', name: 'Oversized T-Shirt' }),
      ),
    );
  });
});
