import type {
  DashboardDto,
  DateRangeQuery,
  InventoryReportDto,
  ProfitReportDto,
  ProductsReportDto,
  SalesReportDto,
} from '@textile-admin/shared';
import { pool } from '../config/db.js';
import { expenseRepository } from '../repositories/expenseRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { reportRepository } from '../repositories/reportRepository.js';
import { mapInventoryListItem } from '../utils/mappers.js';

const TOP_PRODUCTS_LIMIT = 5;
const LOW_STOCK_PREVIEW_LIMIT = 10;

export const reportService = {
  async dashboard(range: DateRangeQuery): Promise<DashboardDto> {
    const [sales, profit, expensesTotal, stockCounts, salesByDay, topProducts, orderDist, paymentDist, lowStock] =
      await Promise.all([
        reportRepository.salesSummary(pool, range),
        reportRepository.profitSummary(pool, range),
        expenseRepository.sumByFilters(pool, range),
        productRepository.countByStockStatus(pool),
        reportRepository.salesByDay(pool, range),
        reportRepository.topProducts(pool, range, TOP_PRODUCTS_LIMIT),
        reportRepository.orderStatusDistribution(pool, range),
        reportRepository.paymentStatusDistribution(pool, range),
        productRepository.listLowStock(pool, { page: 1, limit: LOW_STOCK_PREVIEW_LIMIT }),
      ]);

    const grossProfit = profit.grossProfit;
    const netProfit = grossProfit - expensesTotal;

    return {
      revenue: sales.revenue,
      orders: sales.orders,
      unitsSold: sales.unitsSold,
      grossProfit,
      expenses: expensesTotal,
      netProfit,
      lowStockCount: stockCounts.lowStockCount,
      outOfStockCount: stockCounts.outOfStockCount,
      salesByDay,
      topProducts,
      orderStatusDistribution: orderDist,
      paymentStatusDistribution: paymentDist,
      lowStockProducts: lowStock.items.map(mapInventoryListItem),
    };
  },

  async sales(range: DateRangeQuery): Promise<SalesReportDto> {
    const [summary, salesByDay] = await Promise.all([
      reportRepository.salesSummary(pool, range),
      reportRepository.salesByDay(pool, range),
    ]);
    return {
      revenue: summary.revenue,
      orders: summary.orders,
      unitsSold: summary.unitsSold,
      averageOrderValue: summary.orders > 0 ? summary.revenue / summary.orders : 0,
      stitchingRevenue: summary.stitchingRevenue,
      salesByDay,
    };
  },

  async profit(range: DateRangeQuery): Promise<ProfitReportDto> {
    const [profit, expensesTotal] = await Promise.all([
      reportRepository.profitSummary(pool, range),
      expenseRepository.sumByFilters(pool, range),
    ]);
    return {
      revenue: profit.productRevenue,
      productCost: profit.productCost,
      grossProfit: profit.grossProfit,
      expenses: expensesTotal,
      netProfit: profit.grossProfit - expensesTotal,
    };
  },

  async inventory(): Promise<InventoryReportDto> {
    const [summary, stockCounts] = await Promise.all([
      reportRepository.inventorySummary(pool),
      productRepository.countByStockStatus(pool),
    ]);
    return {
      totalProducts: summary.totalProducts,
      totalUnits: summary.totalUnits,
      inventoryValue: summary.inventoryValue,
      lowStockCount: stockCounts.lowStockCount,
      outOfStockCount: stockCounts.outOfStockCount,
    };
  },

  async products(range: DateRangeQuery): Promise<ProductsReportDto> {
    const topProducts = await reportRepository.topProducts(pool, range, 50);
    return { topProducts };
  },
};
