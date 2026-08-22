import ExcelJS from 'exceljs';
import type { DateRangeQuery } from '@textile-admin/shared';
import { pool } from '../../config/db.js';
import { orderRepository } from '../../repositories/orderRepository.js';
import { productRepository } from '../../repositories/productRepository.js';
import { reportRepository } from '../../repositories/reportRepository.js';
import { expenseRepository } from '../../repositories/expenseRepository.js';
import { stockStatusFor } from '../../utils/mappers.js';

const ALL_ROWS = { page: 1, limit: 100000 } as const;

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: Partial<ExcelJS.Column>[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = columns;
  sheet.getRow(1).font = { bold: true };
  return sheet;
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Uint8Array> {
  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(arrayBuffer as unknown as ArrayBuffer);
}

export const excelExportService = {
  async products(): Promise<Uint8Array> {
    const { items } = await productRepository.list(pool, { ...ALL_ROWS, sortBy: 'sku', sortDir: 'asc' });
    const workbook = new ExcelJS.Workbook();
    const sheet = addSheet(workbook, 'Products', [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Product', key: 'name', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Size', key: 'size', width: 10 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'Purchase Price', key: 'purchasePrice', width: 15 },
      { header: 'Selling Price', key: 'sellingPrice', width: 15 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Low Stock Limit', key: 'lowStockLimit', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
    ]);
    for (const p of items) {
      sheet.addRow({
        sku: p.sku,
        name: p.name,
        category: p.category_name ?? '',
        description: p.description ?? '',
        size: p.size ?? '',
        color: p.color ?? '',
        purchasePrice: Number(p.purchase_price),
        sellingPrice: Number(p.selling_price),
        stock: p.stock_quantity,
        lowStockLimit: p.low_stock_limit,
        status: p.status,
      });
    }
    return toBuffer(workbook);
  },

  async inventory(): Promise<Uint8Array> {
    const { items } = await productRepository.list(pool, { ...ALL_ROWS, sortBy: 'name', sortDir: 'asc' });
    const workbook = new ExcelJS.Workbook();
    const sheet = addSheet(workbook, 'Inventory', [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Product', key: 'name', width: 30 },
      { header: 'Size', key: 'size', width: 10 },
      { header: 'Color', key: 'color', width: 12 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Low Stock Limit', key: 'lowStockLimit', width: 15 },
      { header: 'Stock Status', key: 'stockStatus', width: 14 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Last Updated', key: 'updatedAt', width: 22 },
    ]);
    for (const p of items) {
      sheet.addRow({
        sku: p.sku,
        name: p.name,
        size: p.size ?? '',
        color: p.color ?? '',
        stock: p.stock_quantity,
        lowStockLimit: p.low_stock_limit,
        stockStatus: stockStatusFor(p.stock_quantity, p.low_stock_limit),
        status: p.status,
        updatedAt: p.updated_at,
      });
    }
    return toBuffer(workbook);
  },

  async orders(filters: DateRangeQuery): Promise<Uint8Array> {
    const { items } = await orderRepository.list(pool, {
      ...ALL_ROWS,
      dateFrom: filters.from,
      dateTo: filters.to,
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = addSheet(workbook, 'Orders', [
      { header: 'Order Number', key: 'orderNumber', width: 16 },
      { header: 'Date', key: 'date', width: 22 },
      { header: 'Customer', key: 'customer', width: 24 },
      { header: 'Items', key: 'items', width: 10 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Payment Status', key: 'paymentStatus', width: 16 },
      { header: 'Order Status', key: 'orderStatus', width: 16 },
    ]);
    for (const o of items) {
      sheet.addRow({
        orderNumber: o.order_number,
        date: o.order_date,
        customer: o.customer_name ?? '',
        items: o.item_count,
        total: Number(o.total),
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
      });
    }
    return toBuffer(workbook);
  },

  async sales(range: DateRangeQuery): Promise<Uint8Array> {
    const salesByDay = await reportRepository.salesByDay(pool, range);
    const workbook = new ExcelJS.Workbook();
    const sheet = addSheet(workbook, 'Sales', [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Orders', key: 'orders', width: 10 },
      { header: 'Units', key: 'units', width: 10 },
      { header: 'Revenue', key: 'revenue', width: 14 },
    ]);
    for (const day of salesByDay) {
      sheet.addRow(day);
    }
    return toBuffer(workbook);
  },

  async profit(range: DateRangeQuery): Promise<Uint8Array> {
    const profit = await reportRepository.profitSummary(pool, range);
    const expenses = await expenseRepository.sumByFilters(pool, range);
    const workbook = new ExcelJS.Workbook();
    const sheet = addSheet(workbook, 'Profit', [
      { header: 'Metric', key: 'metric', width: 24 },
      { header: 'Amount', key: 'amount', width: 16 },
    ]);
    sheet.addRow({ metric: 'Product Revenue', amount: profit.productRevenue });
    sheet.addRow({ metric: 'Product Cost', amount: profit.productCost });
    sheet.addRow({ metric: 'Gross Profit', amount: profit.grossProfit });
    sheet.addRow({ metric: 'Expenses', amount: expenses });
    sheet.addRow({ metric: 'Net Profit', amount: profit.grossProfit - expenses });
    return toBuffer(workbook);
  },
};
