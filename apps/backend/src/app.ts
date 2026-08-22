import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/authRoutes.js';
import { categoryRoutes } from './routes/categoryRoutes.js';
import { customerRoutes } from './routes/customerRoutes.js';
import { excelRoutes } from './routes/excelRoutes.js';
import { expenseRoutes } from './routes/expenseRoutes.js';
import { inventoryRoutes } from './routes/inventoryRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';
import { productRoutes } from './routes/productRoutes.js';
import { publicRoutes } from './routes/publicRoutes.js';
import { reportRoutes } from './routes/reportRoutes.js';
import type { AppEnv } from './types/hono.js';

export const app = new Hono<AppEnv>();

app.use(
  '*',
  cors({
    // /api/public/* is the storefront-facing surface and needs to be
    // callable from whatever domain the storefront lives on, which we don't
    // know in advance — every other route stays locked to the admin app's
    // own origin. Echoing the request's origin back (rather than a literal
    // "*") is what lets this coexist with credentialed admin requests using
    // the same cors() call.
    origin: (origin, c) => (c.req.path.startsWith('/api/public/') ? origin : env.FRONTEND_URL),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  }),
);

app.onError(errorHandler);

app.get('/health', (c) => c.json({ status: 'ok' }));

const api = new Hono<AppEnv>();
api.route('/auth', authRoutes);
api.route('/categories', categoryRoutes);
api.route('/products', productRoutes);
api.route('/inventory', inventoryRoutes);
api.route('/customers', customerRoutes);
api.route('/orders', orderRoutes);
api.route('/expenses', expenseRoutes);
api.route('/reports', reportRoutes);
api.route('/excel', excelRoutes);
api.route('/public', publicRoutes);

app.route('/api', api);
