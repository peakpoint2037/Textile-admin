import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { orderController } from '../controllers/orderController.js';
import type { AppEnv } from '../types/hono.js';

export const orderRoutes = new Hono<AppEnv>();

orderRoutes.use('*', authenticate);

orderRoutes.get('/', orderController.list);
orderRoutes.get('/:id', orderController.getById);
orderRoutes.post('/', orderController.create);
orderRoutes.patch('/:id', orderController.update);
orderRoutes.patch('/:id/status', orderController.updateStatus);
orderRoutes.patch('/:id/payment', requireRole('OWNER', 'ADMIN'), orderController.updatePayment);
