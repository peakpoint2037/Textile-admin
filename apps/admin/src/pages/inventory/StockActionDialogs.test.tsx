import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { renderWithProviders } from '@/test/testUtils';
import { AdjustStockDialog } from './StockActionDialogs';

const adjustStock = vi.fn().mockResolvedValue({});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/api/inventory', () => ({
  useStockAdjust: () => ({ mutateAsync: adjustStock, isPending: false }),
  useStockIn: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const product = {
  id: 'p1',
  sku: 'TS-BLK-M',
  name: 'Oversized T-Shirt',
  size: 'M',
  color: 'Black',
  stockQuantity: 10,
  lowStockLimit: 5,
  stockStatus: 'IN_STOCK' as const,
  status: 'ACTIVE' as const,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('AdjustStockDialog', () => {
  it('requires a reason before submitting an adjustment', async () => {
    renderWithProviders(<AdjustStockDialog product={product} onOpenChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/quantity change/i), { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: /adjust stock/i }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('reason is required')));
    expect(adjustStock).not.toHaveBeenCalled();
  });

  it('submits a valid adjustment with quantity and reason', async () => {
    const onOpenChange = vi.fn();
    renderWithProviders(<AdjustStockDialog product={product} onOpenChange={onOpenChange} />);

    fireEvent.change(screen.getByLabelText(/quantity change/i), { target: { value: '-2' } });
    fireEvent.change(screen.getByLabelText(/^reason$/i), { target: { value: 'Damaged in transit' } });
    fireEvent.click(screen.getByRole('button', { name: /adjust stock/i }));

    await waitFor(() =>
      expect(adjustStock).toHaveBeenCalledWith({ productId: 'p1', quantity: -2, reason: 'Damaged in transit' }),
    );
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
});
