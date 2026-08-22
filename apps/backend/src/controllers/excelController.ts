import type { Context } from 'hono';
import { dateRangeQuerySchema } from '@textile-admin/shared';
import { productExcelImportService } from '../services/excel/productExcelImportService.js';
import { stockExcelImportService } from '../services/excel/stockExcelImportService.js';
import { excelExportService } from '../services/excel/excelExportService.js';
import { ApiError } from '../utils/apiError.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function readUploadedFile(
  c: Context<AppEnv>,
): Promise<{ buffer: Uint8Array; confirm: boolean }> {
  const body = await c.req.parseBody();
  const file = body['file'];
  if (!(file instanceof File)) {
    throw ApiError.validation('A file field named "file" is required');
  }
  const confirm = body['confirm'] === 'true';
  const buffer = new Uint8Array(await file.arrayBuffer());
  return { buffer, confirm };
}

function downloadResponse(c: Context<AppEnv>, buffer: Uint8Array, filename: string) {
  c.header('Content-Type', XLSX_CONTENT_TYPE);
  c.header('Content-Disposition', `attachment; filename="${filename}"`);
  // Hono's body() pins the Uint8Array generic to plain ArrayBuffer; `new
  // Uint8Array(...)` infers the wider ArrayBufferLike, so narrow it back here.
  return c.body(buffer as Uint8Array<ArrayBuffer>);
}

export const excelController = {
  async importProducts(c: Context<AppEnv>) {
    const { buffer, confirm } = await readUploadedFile(c);
    const user = c.get('user');
    const result = await productExcelImportService.import(buffer, confirm, user.id);
    return ok(c, result);
  },

  async importStock(c: Context<AppEnv>) {
    const { buffer, confirm } = await readUploadedFile(c);
    const user = c.get('user');
    const result = await stockExcelImportService.import(buffer, confirm, user.id);
    return ok(c, result);
  },

  async exportProducts(c: Context<AppEnv>) {
    const buffer = await excelExportService.products();
    return downloadResponse(c, buffer, 'products.xlsx');
  },

  async exportInventory(c: Context<AppEnv>) {
    const buffer = await excelExportService.inventory();
    return downloadResponse(c, buffer, 'inventory.xlsx');
  },

  async exportOrders(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    const buffer = await excelExportService.orders(range);
    return downloadResponse(c, buffer, 'orders.xlsx');
  },

  async exportSales(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    const buffer = await excelExportService.sales(range);
    return downloadResponse(c, buffer, 'sales.xlsx');
  },

  async exportProfit(c: Context<AppEnv>) {
    const range = dateRangeQuerySchema.parse(c.req.query());
    const buffer = await excelExportService.profit(range);
    return downloadResponse(c, buffer, 'profit.xlsx');
  },
};
