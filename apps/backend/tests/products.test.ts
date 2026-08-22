import { beforeEach, describe, expect, it } from 'vitest';
import { api } from './helpers/apiClient.js';
import { createAuthenticatedUser } from './helpers/testAuth.js';

let token: string;

beforeEach(async () => {
  ({ token } = await createAuthenticatedUser('OWNER'));
});

async function createCategory(name = 'T-Shirts') {
  const { json } = await api.post('/api/categories', { token, body: { name } });
  return json.data;
}

describe('product CRUD', () => {
  it('creates a product and records an OPENING_STOCK movement for its initial stock', async () => {
    const category = await createCategory();

    const { status, json } = await api.post('/api/products', {
      token,
      body: {
        categoryId: category.id,
        sku: 'TS-BLK-M',
        name: 'Oversized T-Shirt',
        purchasePrice: 300,
        sellingPrice: 799,
        stockQuantity: 10,
        lowStockLimit: 5,
      },
    });

    expect(status).toBe(201);
    expect(json.data.sku).toBe('TS-BLK-M');
    expect(json.data.stockQuantity).toBe(10);
    expect(json.data.stockStatus).toBe('IN_STOCK');

    const movements = await api.get(`/api/inventory/movements?productId=${json.data.id}`, { token });
    expect(movements.json.data.items).toHaveLength(1);
    expect(movements.json.data.items[0].type).toBe('OPENING_STOCK');
    expect(movements.json.data.items[0].quantity).toBe(10);
  });

  it('rejects a duplicate SKU', async () => {
    const category = await createCategory();
    const body = {
      categoryId: category.id,
      sku: 'TS-BLK-M',
      name: 'Oversized T-Shirt',
      purchasePrice: 300,
      sellingPrice: 799,
    };
    await api.post('/api/products', { token, body });

    const { status, json } = await api.post('/api/products', { token, body });
    expect(status).toBe(409);
    expect(json.error.code).toBe('PRODUCT_SKU_EXISTS');
  });

  it('updates a product', async () => {
    const category = await createCategory();
    const created = await api.post('/api/products', {
      token,
      body: { categoryId: category.id, sku: 'TS-BLK-M', name: 'Old Name', purchasePrice: 300, sellingPrice: 799 },
    });

    const { status, json } = await api.patch(`/api/products/${created.json.data.id}`, {
      token,
      body: { name: 'New Name', sellingPrice: 899 },
    });

    expect(status).toBe(200);
    expect(json.data.name).toBe('New Name');
    expect(json.data.sellingPrice).toBe(899);
  });

  it('blocks deleting a product that has stock history, suggesting archive instead', async () => {
    const category = await createCategory();
    const created = await api.post('/api/products', {
      token,
      body: {
        categoryId: category.id,
        sku: 'TS-BLK-M',
        name: 'Oversized T-Shirt',
        purchasePrice: 300,
        sellingPrice: 799,
        stockQuantity: 5,
      },
    });

    const { status, json } = await api.delete(`/api/products/${created.json.data.id}`, { token });
    expect(status).toBe(409);
    expect(json.error.code).toBe('PRODUCT_IN_USE');
  });

  it('lists products with pagination and search', async () => {
    const category = await createCategory();
    await api.post('/api/products', {
      token,
      body: { categoryId: category.id, sku: 'TS-BLK-M', name: 'Black Tee', purchasePrice: 100, sellingPrice: 200 },
    });
    await api.post('/api/products', {
      token,
      body: { categoryId: category.id, sku: 'TS-WHT-M', name: 'White Tee', purchasePrice: 100, sellingPrice: 200 },
    });

    const { json } = await api.get('/api/products?search=Black', { token });
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].sku).toBe('TS-BLK-M');
    expect(json.data.pagination.total).toBe(1);
  });
});

describe('product images', () => {
  it('registers image metadata and marks the first image as primary automatically', async () => {
    const category = await createCategory();
    const product = await api.post('/api/products', {
      token,
      body: { categoryId: category.id, sku: 'TS-BLK-M', name: 'Black Tee', purchasePrice: 100, sellingPrice: 200 },
    });

    const { status, json } = await api.post(`/api/products/${product.json.data.id}/images`, {
      token,
      body: {
        storageKey: `products/${product.json.data.id}/photo.jpg`,
        imageUrl: 'https://example.com/photo.jpg',
        isPrimary: false,
        sortOrder: 0,
      },
    });

    expect(status).toBe(201);
    expect(json.data.isPrimary).toBe(true); // first image is always primary regardless of input

    const detail = await api.get(`/api/products/${product.json.data.id}`, { token });
    expect(detail.json.data.imageCount).toBe(1);
    expect(detail.json.data.primaryImageUrl).toBeTruthy();
  });
});
