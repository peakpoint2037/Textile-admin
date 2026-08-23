import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { api, type ApiCallResult } from './helpers/apiClient.js';
import { createAuthenticatedUser } from './helpers/testAuth.js';

let token: string;

beforeEach(async () => {
  ({ token } = await createAuthenticatedUser('OWNER'));
});

async function buildProductsWorkbook(
  rows: Array<Record<string, string | number>>,
): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');
  sheet.columns = [
    { header: 'SKU', key: 'sku' },
    { header: 'Product', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Description', key: 'description' },
    { header: 'Size', key: 'size' },
    { header: 'Color', key: 'color' },
    { header: 'Purchase Price', key: 'purchasePrice' },
    { header: 'Selling Price', key: 'sellingPrice' },
    { header: 'Stock', key: 'stock' },
    { header: 'Low Stock Limit', key: 'lowStockLimit' },
    { header: 'Status', key: 'status' },
  ];
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as unknown as ArrayBuffer);
}

async function importProducts(bytes: Uint8Array, confirm: boolean): Promise<ApiCallResult> {
  const formData = new FormData();
  formData.append('file', new Blob([bytes]), 'products.xlsx');
  if (confirm) formData.append('confirm', 'true');

  const res = await app.request('/api/excel/products/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return { status: res.status, json: await res.json() };
}

async function buildStockWorkbook(rows: Array<Record<string, string | number>>): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock');
  sheet.columns = [
    { header: 'SKU', key: 'sku' },
    { header: 'Quantity', key: 'quantity' },
    { header: 'Reason', key: 'reason' },
  ];
  for (const row of rows) sheet.addRow(row);
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer as unknown as ArrayBuffer);
}

async function importStock(bytes: Uint8Array, confirm: boolean): Promise<ApiCallResult> {
  const formData = new FormData();
  formData.append('file', new Blob([bytes]), 'stock.xlsx');
  if (confirm) formData.append('confirm', 'true');

  const res = await app.request('/api/excel/stock/import', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return { status: res.status, json: await res.json() };
}

async function exportSheet(kind: 'products' | 'inventory'): Promise<ExcelJS.Worksheet> {
  const res = await app.request(`/api/excel/${kind}/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const buffer = await res.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  return workbook.worksheets[0]!;
}

function rowBySku(sheet: ExcelJS.Worksheet, sku: string): ExcelJS.CellValue[] | undefined {
  let found: ExcelJS.CellValue[] | undefined;
  sheet.eachRow((row) => {
    if (row.getCell(1).value === sku) found = row.values as ExcelJS.CellValue[];
  });
  return found;
}

describe('Excel product import validation', () => {
  it('reports a row-level error for an unknown category and does not write anything', async () => {
    const bytes = await buildProductsWorkbook([
      {
        sku: 'TS-BAD',
        name: 'Bad Row',
        category: 'DoesNotExist',
        purchasePrice: 300,
        sellingPrice: 799,
        stock: 5,
        lowStockLimit: 5,
        status: 'ACTIVE',
      },
    ]);

    const { json } = await importProducts(bytes, true);
    expect(json.data.errorCount).toBe(1);
    expect(json.data.errors[0].message).toMatch(/category/i);
    expect(json.data.committed).toBe(false);

    const products = await api.get('/api/products', { token });
    expect(products.json.data.items).toHaveLength(0);
  });

  it('reports an invalid selling price', async () => {
    const bytes = await buildProductsWorkbook([
      { sku: 'TS-BAD', name: 'Bad Row', sellingPrice: 'not-a-number', purchasePrice: 300, stock: 5 },
    ]);
    const { json } = await importProducts(bytes, false);
    expect(json.data.errorCount).toBe(1);
    expect(json.data.errors[0].message).toMatch(/selling price/i);
  });

  it('imports valid rows only when confirm=true, and is a no-op preview otherwise', async () => {
    const bytes = await buildProductsWorkbook([
      { sku: 'TS-BLK-M', name: 'Oversized T-Shirt', purchasePrice: 300, sellingPrice: 799, stock: 10, lowStockLimit: 5, status: 'ACTIVE' },
    ]);

    const preview = await importProducts(bytes, false);
    expect(preview.json.data.committed).toBe(false);
    let products = await api.get('/api/products', { token });
    expect(products.json.data.items).toHaveLength(0);

    const committed = await importProducts(bytes, true);
    expect(committed.json.data.committed).toBe(true);
    products = await api.get('/api/products', { token });
    expect(products.json.data.items).toHaveLength(1);
    expect(products.json.data.items[0].sku).toBe('TS-BLK-M');
  });
});

describe('Excel import/export against product-group variants', () => {
  async function createGroupedVariant() {
    const category = await api.post('/api/categories', { token, body: { name: 'Accessories' } });
    const group = await api.post('/api/product-groups', {
      token,
      body: {
        categoryId: category.json.data.id,
        name: 'Grouped Cap',
        purchasePrice: 100,
        sellingPrice: 250,
        variants: [{ sku: 'GRP-CAP-OS', color: 'Black', stockQuantity: 8 }],
      },
    });
    return group.json.data.variants[0];
  }

  it('updating a grouped variant via product import preserves its group_id', async () => {
    const variant = await createGroupedVariant();

    const bytes = await buildProductsWorkbook([
      {
        sku: variant.sku,
        name: variant.name,
        color: 'Black',
        purchasePrice: 100,
        sellingPrice: 275,
        stock: 15,
        lowStockLimit: 5,
        status: 'ACTIVE',
      },
    ]);
    const { json } = await importProducts(bytes, true);
    expect(json.data.committed).toBe(true);
    expect(json.data.errorCount).toBe(0);

    const updated = await api.get(`/api/products?search=${variant.sku}`, { token });
    const row = updated.json.data.items[0];
    expect(row.sellingPrice).toBe(275);
    expect(row.stockQuantity).toBe(15);
    expect(row.groupId).toBe(variant.groupId);
  });

  it('adjusting stock via stock-only import preserves group_id and records a movement', async () => {
    const variant = await createGroupedVariant();

    const bytes = await buildStockWorkbook([{ sku: variant.sku, quantity: 6, reason: 'Restock' }]);
    const { json } = await importStock(bytes, true);
    expect(json.data.committed).toBe(true);

    const updated = await api.get(`/api/products?search=${variant.sku}`, { token });
    const row = updated.json.data.items[0];
    expect(row.stockQuantity).toBe(14); // 8 opening + 6
    expect(row.groupId).toBe(variant.groupId);

    const movements = await api.get(`/api/inventory/movements?productId=${variant.id}`, { token });
    expect(movements.json.data.items[0].type).toBe('STOCK_IN');
  });

  it('exports a grouped variant with its own sku/size/color, without a group column', async () => {
    const variant = await createGroupedVariant();

    const sheet = await exportSheet('products');
    const headers = (sheet.getRow(1).values as ExcelJS.CellValue[]).filter(Boolean).map(String);
    expect(headers).not.toContain('Group');

    const row = rowBySku(sheet, variant.sku);
    expect(row).toBeDefined();
    expect(row?.[2]).toBe(variant.name);
    expect(row?.[6]).toBe('Black');
    expect(row?.[9]).toBe(8);
  });
});
