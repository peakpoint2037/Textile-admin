import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { categoryController } from '../controllers/categoryController.js';
import type { AppEnv } from '../types/hono.js';

export const categoryRoutes = new Hono<AppEnv>();

categoryRoutes.use('*', authenticate);

categoryRoutes.get('/', categoryController.list);
categoryRoutes.get('/:id', categoryController.getById);
categoryRoutes.post('/', requireRole('OWNER', 'ADMIN'), categoryController.create);
categoryRoutes.patch('/:id', requireRole('OWNER', 'ADMIN'), categoryController.update);
categoryRoutes.delete('/:id', requireRole('OWNER', 'ADMIN'), categoryController.remove);
