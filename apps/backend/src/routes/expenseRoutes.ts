import { Hono } from 'hono';
import { authenticate, requireRole } from '../middleware/auth.js';
import { expenseController } from '../controllers/expenseController.js';
import type { AppEnv } from '../types/hono.js';

export const expenseRoutes = new Hono<AppEnv>();

expenseRoutes.use('*', authenticate);

expenseRoutes.get('/', expenseController.list);
expenseRoutes.get('/:id', expenseController.getById);
expenseRoutes.post('/', requireRole('OWNER', 'ADMIN'), expenseController.create);
expenseRoutes.patch('/:id', requireRole('OWNER', 'ADMIN'), expenseController.update);
expenseRoutes.delete('/:id', requireRole('OWNER', 'ADMIN'), expenseController.remove);
