import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { inventoryController } from '../controllers/inventoryController.js';
import type { AppEnv } from '../types/hono.js';

export const inventoryRoutes = new Hono<AppEnv>();

inventoryRoutes.use('*', authenticate);

inventoryRoutes.get('/', inventoryController.list);
inventoryRoutes.get('/low-stock', inventoryController.lowStock);
inventoryRoutes.get('/movements', inventoryController.movements);
inventoryRoutes.post('/stock-in', requireRole('OWNER', 'ADMIN', 'STAFF'), inventoryController.stockIn);
inventoryRoutes.post('/adjust', requireRole('OWNER', 'ADMIN', 'STAFF'), inventoryController.adjust);
