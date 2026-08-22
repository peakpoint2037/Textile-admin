import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';
import { reportController } from '../controllers/reportController.js';
import type { AppEnv } from '../types/hono.js';

export const reportRoutes = new Hono<AppEnv>();

reportRoutes.use('*', authenticate);

reportRoutes.get('/dashboard', reportController.dashboard);
reportRoutes.get('/sales', reportController.sales);
reportRoutes.get('/profit', reportController.profit);
reportRoutes.get('/inventory', reportController.inventory);
reportRoutes.get('/products', reportController.products);
