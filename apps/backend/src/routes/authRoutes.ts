import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';
import { authController } from '../controllers/authController.js';
import type { AppEnv } from '../types/hono.js';

export const authRoutes = new Hono<AppEnv>();

authRoutes.use('*', authenticate);

authRoutes.get('/me', authController.me);
authRoutes.post('/logout', authController.logout);
