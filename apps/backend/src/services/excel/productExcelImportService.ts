import type { ExcelImportError, ExcelImportPreviewRow, ExcelImportResult, ProductStatus } from '@textile-admin/shared';
import { PRODUCT_STATUSES } from '@textile-admin/shared';
import { pool, withTransaction } from '../../config/db.js';
import { categoryRepository } from '../../repositories/categoryRepository.js';
import { inventoryMovementRepository } from '../../repositories/inventoryMovementRepository.js';
import { productRepository } from '../../repositories/productRepository.js';
import { cellNumber, cellString, parseWorksheet } from './worksheetParser.js';

interface ValidProductRow {
  rowNumber: number;
  action: 'CREATE' | 'UPDATE';
  existingId?: string;
  sku: string;
  name: string;
  categoryId: string | null;
  description: string | null;
  size: string | null;
  color: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockLimit: number;
  status: ProductStatus;
}

const IMPORTER_USER_NOTE = 'Excel import';

export const productExcelImportService = {
  async import(buffer: Uint8Array, confirm: boolean, userId: string): Promise<ExcelImportResult> {
    const rows = await parseWorksheet(buffer);

    const categories = await categoryRepository.list(pool, {});
    const categoryByName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));

    const { items: existingProducts } = await productRepository.list(pool, {
      page: 1,
      limit: 100000,
      sortBy: 'sku',
      sortDir: 'asc',
    });
    const existingBySku = new Map(existingProducts.map((p) => [p.sku.toUpperCase(), p]));

    const errors: ExcelImportError[] = [];
    const valid: ValidProductRow[] = [];
    const seenSkus = new Set<string>();

    for (const row of rows) {
      const sku = cellString(row.values, 'SKU');
      const name = cellString(row.values, 'Product');
      const categoryName = cellString(row.values, 'Category');
      const purchasePrice = cellNumber(row.values, 'Purchase Price');
      const sellingPrice = cellNumber(row.values, 'Selling Price');
      const stock = cellNumber(row.values, 'Stock');
      const lowStockLimit = cellNumber(row.values, 'Low Stock Limit');
      const statusRaw = cellString(row.values, 'Status').toUpperCase();

      if (!sku) {
        errors.push({ row: row.rowNumber, message: 'SKU is required' });
        continue;
      }
      if (seenSkus.has(sku.toUpperCase())) {
        errors.push({ row: row.rowNumber, message: `Duplicate SKU "${sku}" within this file` });
        continue;
      }
      if (!name) {
        errors.push({ row: row.rowNumber, message: 'Product name is required' });
        continue;
      }

      let categoryId: string | null = null;
      if (categoryName) {
        const found = categoryByName.get(categoryName.trim().toLowerCase());
        if (!found) {
          errors.push({ row: row.rowNumber, message: `Category "${categoryName}" not found` });
          continue;
        }
        categoryId = found;
      }

      if (purchasePrice === undefined || purchasePrice < 0) {
        errors.push({ row: row.rowNumber, message: 'Purchase price is invalid' });
        continue;
      }
      if (sellingPrice === undefined || sellingPrice < 0) {
        errors.push({ row: row.rowNumber, message: 'Selling price is invalid' });
        continue;
      }
      const stockQuantity = stock ?? 0;
      if (stockQuantity < 0 || !Number.isInteger(stockQuantity)) {
        errors.push({ row: row.rowNumber, message: 'Stock must be a non-negative whole number' });
        continue;
      }
      const resolvedLowStockLimit = lowStockLimit ?? 5;
      if (resolvedLowStockLimit < 0 || !Number.isInteger(resolvedLowStockLimit)) {
        errors.push({ row: row.rowNumber, message: 'Low stock limit must be a non-negative whole number' });
        continue;
      }
      const status = (statusRaw || 'ACTIVE') as ProductStatus;
      if (!PRODUCT_STATUSES.includes(status)) {
        errors.push({ row: row.rowNumber, message: `Status must be one of ${PRODUCT_STATUSES.join(', ')}` });
        continue;
      }

      seenSkus.add(sku.toUpperCase());
      const existing = existingBySku.get(sku.toUpperCase());

      valid.push({
        rowNumber: row.rowNumber,
        action: existing ? 'UPDATE' : 'CREATE',
        existingId: existing?.id,
        sku,
        name,
        categoryId,
        description: cellString(row.values, 'Description') || null,
        size: cellString(row.values, 'Size') || null,
        color: cellString(row.values, 'Color') || null,
        purchasePrice,
        sellingPrice,
        stockQuantity,
        lowStockLimit: resolvedLowStockLimit,
        status,
      });
    }

    const preview: ExcelImportPreviewRow[] = valid.map((v) => ({
      row: v.rowNumber,
      sku: v.sku,
      action: v.action,
      name: v.name,
    }));

    const shouldCommit = confirm && errors.length === 0 && valid.length > 0;

    if (shouldCommit) {
      await withTransaction(async (client) => {
        for (const item of valid) {
          if (item.action === 'CREATE') {
            const created = await productRepository.create(client, {
              categoryId: item.categoryId,
              sku: item.sku,
              name: item.name,
              description: item.description,
              size: item.size,
              color: item.color,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              stockQuantity: item.stockQuantity,
              lowStockLimit: item.lowStockLimit,
              status: item.status,
            });
            if (item.stockQuantity > 0) {
              await inventoryMovementRepository.create(client, {
                productId: created.id,
                type: 'OPENING_STOCK',
                quantity: item.stockQuantity,
                reason: IMPORTER_USER_NOTE,
                createdBy: userId,
              });
            }
          } else {
            const existing = existingBySku.get(item.sku.toUpperCase())!;
            await productRepository.update(client, item.existingId!, {
              categoryId: item.categoryId,
              name: item.name,
              description: item.description,
              size: item.size,
              color: item.color,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              lowStockLimit: item.lowStockLimit,
              status: item.status,
            });

            const delta = item.stockQuantity - existing.stock_quantity;
            if (delta !== 0) {
              const locked = await productRepository.lockForUpdate(client, item.existingId!);
              await productRepository.setStockQuantity(
                client,
                item.existingId!,
                locked!.stock_quantity + delta,
              );
              await inventoryMovementRepository.create(client, {
                productId: item.existingId!,
                type: 'ADJUSTMENT',
                quantity: delta,
                reason: `${IMPORTER_USER_NOTE} stock reconciliation`,
                createdBy: userId,
              });
            }
          }
        }
      });
    }

    return {
      totalRows: rows.length,
      validCount: valid.length,
      errorCount: errors.length,
      errors,
      preview,
      committed: shouldCommit,
    };
  },
};
