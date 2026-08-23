import { beforeEach, describe, expect, it } from 'vitest';
import { api } from './helpers/apiClient.js';
import { createAuthenticatedUser } from './helpers/testAuth.js';

let token: string;

beforeEach(async () => {
  ({ token } = await createAuthenticatedUser('OWNER'));
});

async function createCategory(name = 'Pants') {
  const { json } = await api.post('/api/categories', { token, body: { name } });
  return json.data;
}

function groupBody(categoryId: string, overrides: Record<string, unknown> = {}) {
  return {
    categoryId,
    name: 'Cargo Pants',
    purchasePrice: 500,
    sellingPrice: 1299,
    variants: [
      { sku: 'PT-BLK-32', size: '32', color: 'Black', stockQuantity: 10 },
      { sku: 'PT-KHK-34', size: '34', color: 'Khaki', stockQuantity: 5 },
    ],
    ...overrides,
  };
}

describe('product group creation', () => {
  it('creates a group with N variants, each getting its own OPENING_STOCK movement', async () => {
    const category = await createCategory();

    const { status, json } = await api.post('/api/product-groups', { token, body: groupBody(category.id) });

    expect(status).toBe(201);
    expect(json.data.variantCount).toBe(2);
    expect(json.data.totalStock).toBe(15);
    expect(json.data.variants).toHaveLength(2);

    for (const variant of json.data.variants) {
      expect(variant.groupId).toBe(json.data.id);
      expect(variant.sellingPrice).toBe(1299);
      const movements = await api.get(`/api/inventory/movements?productId=${variant.id}`, { token });
      expect(movements.json.data.items).toHaveLength(1);
      expect(movements.json.data.items[0].type).toBe('OPENING_STOCK');
    }
  });

  it('supports a variant with no size (free size / accessories)', async () => {
    const category = await createCategory('Accessories');

    const { status, json } = await api.post('/api/product-groups', {
      token,
      body: groupBody(category.id, {
        name: 'Baseball Cap',
        variants: [{ sku: 'AC-CAP-OS', color: 'Black', stockQuantity: 20 }],
      }),
    });

    expect(status).toBe(201);
    expect(json.data.variants[0].size).toBeNull();
  });

  it('rejects duplicate SKUs within the same submitted batch, creating nothing', async () => {
    const category = await createCategory();

    const { status } = await api.post('/api/product-groups', {
      token,
      body: groupBody(category.id, {
        variants: [
          { sku: 'PT-BLK-32', size: '32', color: 'Black', stockQuantity: 10 },
          { sku: 'PT-BLK-32', size: '34', color: 'Khaki', stockQuantity: 5 },
        ],
      }),
    });

    expect(status).toBe(422);

    const list = await api.get('/api/product-groups', { token });
    expect(list.json.data.items).toHaveLength(0);
    const products = await api.get('/api/products', { token });
    expect(products.json.data.items).toHaveLength(0);
  });

  it('rejects a variant SKU that already exists on a standalone product, creating nothing', async () => {
    const category = await createCategory();
    await api.post('/api/products', {
      token,
      body: { categoryId: category.id, sku: 'PT-BLK-32', name: 'Existing Product', purchasePrice: 1, sellingPrice: 2 },
    });

    const { status, json } = await api.post('/api/product-groups', { token, body: groupBody(category.id) });

    expect(status).toBe(409);
    expect(json.error.code).toBe('PRODUCT_SKU_EXISTS');

    const list = await api.get('/api/product-groups', { token });
    expect(list.json.data.items).toHaveLength(0);
  });
});

describe('product group updates', () => {
  it('cascades a shared-field edit onto every variant', async () => {
    const category = await createCategory();
    const created = await api.post('/api/product-groups', { token, body: groupBody(category.id) });
    const groupId = created.json.data.id;

    const { status, json } = await api.patch(`/api/product-groups/${groupId}`, {
      token,
      body: { sellingPrice: 1499, name: 'Cargo Pants v2', status: 'INACTIVE' },
    });

    expect(status).toBe(200);
    expect(json.data.sellingPrice).toBe(1499);
    for (const variant of json.data.variants) {
      expect(variant.sellingPrice).toBe(1499);
      expect(variant.name).toBe('Cargo Pants v2');
      expect(variant.status).toBe('INACTIVE');
    }
  });

  it('adds a new variant that inherits the group\'s shared fields', async () => {
    const category = await createCategory();
    const created = await api.post('/api/product-groups', { token, body: groupBody(category.id) });
    const groupId = created.json.data.id;

    const { status, json } = await api.post(`/api/product-groups/${groupId}/variants`, {
      token,
      body: { sku: 'PT-BLU-36', size: '36', color: 'Blue', stockQuantity: 3 },
    });

    expect(status).toBe(201);
    expect(json.data.variantCount).toBe(3);
    const added = json.data.variants.find((v: { sku: string }) => v.sku === 'PT-BLU-36');
    expect(added).toBeTruthy();
    expect(added.sellingPrice).toBe(1299);
    expect(added.name).toBe('Cargo Pants');
  });

  it('rejects adding a variant with a SKU that already exists', async () => {
    const category = await createCategory();
    const created = await api.post('/api/product-groups', { token, body: groupBody(category.id) });
    const groupId = created.json.data.id;

    const { status, json } = await api.post(`/api/product-groups/${groupId}/variants`, {
      token,
      body: { sku: 'PT-BLK-32', stockQuantity: 1 },
    });

    expect(status).toBe(409);
    expect(json.error.code).toBe('PRODUCT_SKU_EXISTS');
  });
});

describe('product group deletion', () => {
  it('blocks deleting a group that still has variants', async () => {
    const category = await createCategory();
    const created = await api.post('/api/product-groups', { token, body: groupBody(category.id) });

    const { status, json } = await api.delete(`/api/product-groups/${created.json.data.id}`, { token });
    expect(status).toBe(409);
    expect(json.error.code).toBe('PRODUCT_GROUP_IN_USE');
  });
});
