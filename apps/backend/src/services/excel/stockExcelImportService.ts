import type { ExcelImportError, ExcelImportPreviewRow, ExcelImportResult } from '@textile-admin/shared';
import { pool, withTransaction } from '../../config/db.js';
import { inventoryMovementRepository } from '../../repositories/inventoryMovementRepository.js';
import { productRepository } from '../../repositories/productRepository.js';
import { cellNumber, cellString, parseWorksheet } from './worksheetParser.js';

interface ValidStockRow {
  rowNumber: number;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  reason: string;
}

export const stockExcelImportService = {
  async import(buffer: Uint8Array, confirm: boolean, userId: string): Promise<ExcelImportResult> {
    const rows = await parseWorksheet(buffer);

    const { items: existingProducts } = await productRepository.list(pool, {
      page: 1,
      limit: 100000,
      sortBy: 'sku',
      sortDir: 'asc',
    });
    const bySku = new Map(existingProducts.map((p) => [p.sku.toUpperCase(), p]));

    const errors: ExcelImportError[] = [];
    const valid: ValidStockRow[] = [];

    for (const row of rows) {
      const sku = cellString(row.values, 'SKU');
      const quantity = cellNumber(row.values, 'Quantity');
      const reason = cellString(row.values, 'Reason');

      if (!sku) {
        errors.push({ row: row.rowNumber, message: 'SKU is required' });
        continue;
      }
      const product = bySku.get(sku.toUpperCase());
      if (!product) {
        errors.push({ row: row.rowNumber, message: `SKU "${sku}" not found` });
        continue;
      }
      if (quantity === undefined || quantity <= 0 || !Number.isInteger(quantity)) {
        errors.push({ row: row.rowNumber, message: 'Quantity must be a positive whole number' });
        continue;
      }

      valid.push({
        rowNumber: row.rowNumber,
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity,
        reason: reason || 'Excel stock import',
      });
    }

    const preview: ExcelImportPreviewRow[] = valid.map((v) => ({
      row: v.rowNumber,
      sku: v.sku,
      action: 'UPDATE',
      name: v.productName,
    }));

    const shouldCommit = confirm && errors.length === 0 && valid.length > 0;

    if (shouldCommit) {
      await withTransaction(async (client) => {
        for (const item of valid) {
          const locked = await productRepository.lockForUpdate(client, item.productId);
          if (!locked) continue;
          await productRepository.setStockQuantity(client, item.productId, locked.stock_quantity + item.quantity);
          await inventoryMovementRepository.create(client, {
            productId: item.productId,
            type: 'STOCK_IN',
            quantity: item.quantity,
            reason: item.reason,
            createdBy: userId,
          });
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
