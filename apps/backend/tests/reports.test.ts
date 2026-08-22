import { beforeEach, describe, expect, it } from 'vitest';
import { api } from './helpers/apiClient.js';
import { createAuthenticatedUser } from './helpers/testAuth.js';

let token: string;
let productId: string;

beforeEach(async () => {
  ({ token } = await createAuthenticatedUser('OWNER'));
  const category = await api.post('/api/categories', { token, body: { name: 'T-Shirts' } });
  const product = await api.post('/api/products', {
    token,
    body: {
      categoryId: category.json.data.id,
      sku: 'TS-BLK-M',
      name: 'Oversized T-Shirt',
      purchasePrice: 300,
      sellingPrice: 799,
      stockQuantity: 10,
      lowStockLimit: 5,
    },
  });
  productId = product.json.data.id;
});

describe('dashboard report', () => {
  it('reflects confirmed-order revenue and profit, and excludes cancelled orders', async () => {
    const confirmedOrder = await api.post('/api/orders', {
      token,
      body: { items: [{ productId, quantity: 2 }], shippingFee: 50 },
    });
    await api.patch(`/api/orders/${confirmedOrder.json.data.id}/status`, {
      token,
      body: { status: 'CONFIRMED' },
    });

    const cancelledOrder = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 1 }] } });
    await api.patch(`/api/orders/${cancelledOrder.json.data.id}/status`, { token, body: { status: 'CANCELLED' } });

    await api.post('/api/expenses', {
      token,
      body: { category: 'PACKAGING', amount: 100, expenseDate: '2026-01-15' },
    });

    const { json } = await api.get('/api/reports/dashboard', { token });

    expect(json.data.revenue).toBe(2 * 799 + 50); // only the confirmed order
    expect(json.data.orders).toBe(1);
    expect(json.data.unitsSold).toBe(2);
    expect(json.data.grossProfit).toBe(2 * (799 - 300));
    expect(json.data.expenses).toBe(100);
    expect(json.data.netProfit).toBe(2 * (799 - 300) - 100);
  });
});
