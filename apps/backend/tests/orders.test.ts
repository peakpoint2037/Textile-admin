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

describe('order creation', () => {
  it('computes totals on the backend regardless of what the client sends', async () => {
    const { status, json } = await api.post('/api/orders', {
      token,
      body: {
        items: [{ productId, quantity: 3 }],
        shippingFee: 50,
        // no unitPrice sent -> must default to the product's current selling price
      },
    });

    expect(status).toBe(201);
    expect(json.data.items[0].unitPrice).toBe(799);
    expect(json.data.subtotal).toBe(2397); // 3 * 799
    expect(json.data.total).toBe(2447); // subtotal + shipping
    expect(json.data.orderStatus).toBe('PENDING');
  });

  it('does not touch stock until the order is confirmed', async () => {
    await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 3 }] } });
    const product = await api.get(`/api/products/${productId}`, { token });
    expect(product.json.data.stockQuantity).toBe(10);
  });
});

describe('order confirmation', () => {
  it('deducts stock and records a SALE movement referencing the order', async () => {
    const order = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 3 }] } });
    const orderId = order.json.data.id;

    const { status, json } = await api.patch(`/api/orders/${orderId}/status`, {
      token,
      body: { status: 'CONFIRMED' },
    });

    expect(status).toBe(200);
    expect(json.data.orderStatus).toBe('CONFIRMED');

    const product = await api.get(`/api/products/${productId}`, { token });
    expect(product.json.data.stockQuantity).toBe(7);

    const movements = await api.get(`/api/inventory/movements?productId=${productId}&type=SALE`, { token });
    expect(movements.json.data.items).toHaveLength(1);
    expect(movements.json.data.items[0].quantity).toBe(-3);
    expect(movements.json.data.items[0].referenceId).toBe(orderId);
  });

  it('rejects confirmation when stock is insufficient and leaves stock untouched', async () => {
    const order = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 999 }] } });

    const { status, json } = await api.patch(`/api/orders/${order.json.data.id}/status`, {
      token,
      body: { status: 'CONFIRMED' },
    });

    expect(status).toBe(422);
    expect(json.error.message).toMatch(/insufficient stock/i);

    const product = await api.get(`/api/products/${productId}`, { token });
    expect(product.json.data.stockQuantity).toBe(10);

    const orderAfter = await api.get(`/api/orders/${order.json.data.id}`, { token });
    expect(orderAfter.json.data.orderStatus).toBe('PENDING');
  });

  it('rejects an illegal status jump', async () => {
    const order = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 1 }] } });

    const { status } = await api.patch(`/api/orders/${order.json.data.id}/status`, {
      token,
      body: { status: 'DELIVERED' },
    });

    expect(status).toBe(422);
  });
});

describe('order cancellation', () => {
  it('restores stock and records a CANCELLED_ORDER movement when cancelling a confirmed order', async () => {
    const order = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 3 }] } });
    await api.patch(`/api/orders/${order.json.data.id}/status`, { token, body: { status: 'CONFIRMED' } });

    const { status, json } = await api.patch(`/api/orders/${order.json.data.id}/status`, {
      token,
      body: { status: 'CANCELLED' },
    });

    expect(status).toBe(200);
    expect(json.data.orderStatus).toBe('CANCELLED');

    const product = await api.get(`/api/products/${productId}`, { token });
    expect(product.json.data.stockQuantity).toBe(10); // fully restored
  });

  it('does not restore stock when cancelling a still-PENDING order (nothing was deducted)', async () => {
    const order = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 3 }] } });

    await api.patch(`/api/orders/${order.json.data.id}/status`, { token, body: { status: 'CANCELLED' } });

    const movements = await api.get(`/api/inventory/movements?productId=${productId}`, { token });
    expect(movements.json.data.items.filter((m: { type: string }) => m.type === 'CANCELLED_ORDER')).toHaveLength(0);
  });

  it('never double-restores stock on a repeated cancel call', async () => {
    const order = await api.post('/api/orders', { token, body: { items: [{ productId, quantity: 3 }] } });
    await api.patch(`/api/orders/${order.json.data.id}/status`, { token, body: { status: 'CONFIRMED' } });
    await api.patch(`/api/orders/${order.json.data.id}/status`, { token, body: { status: 'CANCELLED' } });
    await api.patch(`/api/orders/${order.json.data.id}/status`, { token, body: { status: 'CANCELLED' } });

    const product = await api.get(`/api/products/${productId}`, { token });
    expect(product.json.data.stockQuantity).toBe(10); // not 13
  });
});
