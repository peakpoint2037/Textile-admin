import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { customerController } from '../controllers/customerController.js';
import type { AppEnv } from '../types/hono.js';

export const customerRoutes = new Hono<AppEnv>();

customerRoutes.use('*', authenticate);

customerRoutes.get('/', customerController.list);
customerRoutes.get('/:id', customerController.getById);
customerRoutes.post('/', customerController.create);
customerRoutes.patch('/:id', customerController.update);
customerRoutes.delete('/:id', requireRole('OWNER', 'ADMIN'), customerController.remove);
