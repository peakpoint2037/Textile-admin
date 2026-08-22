import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { productController } from '../controllers/productController.js';
import { productImageController } from '../controllers/productImageController.js';
import type { AppEnv } from '../types/hono.js';

export const productRoutes = new Hono<AppEnv>();

productRoutes.use('*', authenticate);

productRoutes.get('/', productController.list);
productRoutes.get('/:id', productController.getById);
productRoutes.post('/', requireRole('OWNER', 'ADMIN'), productController.create);
productRoutes.patch('/:id', requireRole('OWNER', 'ADMIN'), productController.update);
productRoutes.delete('/:id', requireRole('OWNER', 'ADMIN'), productController.remove);

productRoutes.get('/:id/images', productImageController.list);
productRoutes.post(
  '/:id/images/upload-url',
  requireRole('OWNER', 'ADMIN', 'STAFF'),
  productImageController.requestUploadUrl,
);
productRoutes.post(
  '/:id/images',
  requireRole('OWNER', 'ADMIN', 'STAFF'),
  productImageController.add,
);
productRoutes.patch(
  '/:id/images/:imageId',
  requireRole('OWNER', 'ADMIN', 'STAFF'),
  productImageController.update,
);
productRoutes.delete(
  '/:id/images/:imageId',
  requireRole('OWNER', 'ADMIN', 'STAFF'),
  productImageController.remove,
);
