import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { excelController } from '../controllers/excelController.js';
import type { AppEnv } from '../types/hono.js';

export const excelRoutes = new Hono<AppEnv>();

excelRoutes.use('*', authenticate);

excelRoutes.post('/products/import', requireRole('OWNER', 'ADMIN'), excelController.importProducts);
excelRoutes.post('/stock/import', requireRole('OWNER', 'ADMIN', 'STAFF'), excelController.importStock);

excelRoutes.get('/products/export', excelController.exportProducts);
excelRoutes.get('/inventory/export', excelController.exportInventory);
excelRoutes.get('/orders/export', excelController.exportOrders);
excelRoutes.get('/sales/export', excelController.exportSales);
excelRoutes.get('/profit/export', excelController.exportProfit);
