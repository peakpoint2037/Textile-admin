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
import { productGroupRoutes } from './routes/productGroupRoutes.js';
import { publicRoutes } from './routes/publicRoutes.js';
import { reportRoutes } from './routes/reportRoutes.js';
import type { AppEnv } from './types/hono.js';

export const app = new Hono<AppEnv>();

const publicStorefrontOrigins = env.PUBLIC_STOREFRONT_URLS.split(',')
  .map((url) => url.trim())
  .filter(Boolean);

app.use(
  '*',
  cors({
    // /api/public/* is the storefront-facing surface. If PUBLIC_STOREFRONT_URLS
    // is configured, only those origins may call it; left unset, any origin
    // may (useful before the storefront's real domain is known). Every other
    // route stays locked to the admin app's own origin regardless.
    origin: (origin, c) => {
      if (c.req.path.startsWith('/api/public/')) {
        if (publicStorefrontOrigins.length === 0) return origin;
        return origin && publicStorefrontOrigins.includes(origin) ? origin : null;
      }
      return env.FRONTEND_URL;
    },
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
api.route('/product-groups', productGroupRoutes);
api.route('/inventory', inventoryRoutes);
api.route('/customers', customerRoutes);
api.route('/orders', orderRoutes);
api.route('/expenses', expenseRoutes);
api.route('/reports', reportRoutes);
api.route('/excel', excelRoutes);
api.route('/public', publicRoutes);

app.route('/api', api);
