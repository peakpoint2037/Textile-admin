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
