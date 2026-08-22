import type { Context } from 'hono';
import { mapUser } from '../utils/mappers.js';
import { ok } from '../utils/response.js';
import type { AppEnv } from '../types/hono.js';

export const authController = {
  async me(c: Context<AppEnv>) {
    return ok(c, mapUser(c.get('user')));
  },

  async logout(c: Context<AppEnv>) {
    // Stateless JWT auth: there's no server-side session to invalidate.
    // The frontend calls supabase-js signOut() to clear the client token;
    // this endpoint exists so that flow has a symmetrical API call to make.
    return ok(c, { loggedOut: true });
  },
};
