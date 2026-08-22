import { Hono } from 'hono';
import { publicProductController } from '../controllers/publicProductController.js';

// Intentionally no authenticate middleware — this router is the public
// storefront-facing surface. Every handler here must only ever return
// storefront-safe fields (no cost price, no internal-only data).
export const publicRoutes = new Hono();

publicRoutes.get('/products', publicProductController.list);
