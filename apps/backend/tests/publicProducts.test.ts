import { beforeEach, describe, expect, it } from 'vitest';
import { api } from './helpers/apiClient.js';
import { createAuthenticatedUser } from './helpers/testAuth.js';

let token: string;
let tshirtsCategoryId: string;
let activeProductId: string;
let inactiveProductId: string;

beforeEach(async () => {
  ({ token } = await createAuthenticatedUser('OWNER'));
  const category = await api.post('/api/categories', { token, body: { name: 'T-Shirts' } });
  tshirtsCategoryId = category.json.data.id;

  const active = await api.post('/api/products', {
    token,
    body: {
      categoryId: tshirtsCategoryId,
      sku: 'TS-BLK-M',
      name: 'Oversized T-Shirt',
      purchasePrice: 300,
      sellingPrice: 799,
      stockQuantity: 10,
      status: 'ACTIVE',
    },
  });
  activeProductId = active.json.data.id;

  const inactive = await api.post('/api/products', {
    token,
    body: {
      sku: 'HD-GRY-L',
      name: 'Pullover Hoodie',
      purchasePrice: 500,
      sellingPrice: 1499,
      stockQuantity: 5,
      status: 'INACTIVE',
    },
  });
  inactiveProductId = inactive.json.data.id;
});

describe('public products API', () => {
  it('requires no authentication', async () => {
    const { status } = await api.get('/api/public/products');
    expect(status).toBe(200);
  });

  it('never returns cost price or the low-stock threshold', async () => {
    const { json } = await api.get('/api/public/products');
    const product = json.data.items[0];
    expect(product).not.toHaveProperty('purchasePrice');
    expect(product).not.toHaveProperty('lowStockLimit');
    expect(product.sellingPrice).toBe(799);
  });

  it('only returns ACTIVE products, never draft/archived ones', async () => {
    const { json } = await api.get('/api/public/products');
    const skus = json.data.items.map((p: { sku: string }) => p.sku);
    expect(skus).toContain('TS-BLK-M');
    expect(skus).not.toContain('HD-GRY-L');
  });

  it('filters by category slug', async () => {
    const { json } = await api.get('/api/public/products?category=t-shirts');
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].sku).toBe('TS-BLK-M');
  });

  it('returns an empty page (not an error) for an unknown category slug', async () => {
    const { status, json } = await api.get('/api/public/products?category=does-not-exist');
    expect(status).toBe(200);
    expect(json.data.items).toHaveLength(0);
  });
});

describe('public product detail API', () => {
  it('requires no authentication and returns the images array', async () => {
    const { status, json } = await api.get(`/api/public/products/${activeProductId}`);
    expect(status).toBe(200);
    expect(json.data.sku).toBe('TS-BLK-M');
    expect(Array.isArray(json.data.images)).toBe(true);
  });

  it('never returns cost price, low-stock threshold, or internal image storage keys', async () => {
    const { json } = await api.get(`/api/public/products/${activeProductId}`);
    expect(json.data).not.toHaveProperty('purchasePrice');
    expect(json.data).not.toHaveProperty('lowStockLimit');
    for (const image of json.data.images) {
      expect(image).not.toHaveProperty('storageKey');
    }
  });

  it('404s for an INACTIVE product', async () => {
    const { status, json } = await api.get(`/api/public/products/${inactiveProductId}`);
    expect(status).toBe(404);
    expect(json.success).toBe(false);
  });

  it('404s for a nonexistent product id', async () => {
    const { status } = await api.get('/api/public/products/00000000-0000-0000-0000-000000000000');
    expect(status).toBe(404);
  });
});
