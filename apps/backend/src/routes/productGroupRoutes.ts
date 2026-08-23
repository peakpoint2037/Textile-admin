import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { productGroupController } from '../controllers/productGroupController.js';
import type { AppEnv } from '../types/hono.js';

export const productGroupRoutes = new Hono<AppEnv>();

productGroupRoutes.use('*', authenticate);

productGroupRoutes.get('/', productGroupController.list);
productGroupRoutes.get('/:id', productGroupController.getById);
productGroupRoutes.post('/', requireRole('OWNER', 'ADMIN'), productGroupController.create);
productGroupRoutes.patch('/:id', requireRole('OWNER', 'ADMIN'), productGroupController.update);
productGroupRoutes.post(
  '/:id/variants',
  requireRole('OWNER', 'ADMIN'),
  productGroupController.addVariant,
);
productGroupRoutes.delete('/:id', requireRole('OWNER', 'ADMIN'), productGroupController.remove);
