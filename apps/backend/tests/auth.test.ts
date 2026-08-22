import { describe, expect, it } from 'vitest';
import { api } from './helpers/apiClient.js';
import { createAuthenticatedUser } from './helpers/testAuth.js';

describe('authentication', () => {
  it('rejects requests with no token', async () => {
    const { status, json } = await api.get('/api/auth/me');
    expect(status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects requests with a garbage token', async () => {
    const { status } = await api.get('/api/auth/me', { token: 'not-a-real-token' });
    expect(status).toBe(401);
  });

  it('returns the authenticated user profile for a valid token', async () => {
    const { userId, token } = await createAuthenticatedUser('ADMIN');
    const { status, json } = await api.get('/api/auth/me', { token });
    expect(status).toBe(200);
    expect(json.data.id).toBe(userId);
    expect(json.data.role).toBe('ADMIN');
  });

  it('rejects a role-gated route for a STAFF user', async () => {
    const { token } = await createAuthenticatedUser('STAFF');
    const { status, json } = await api.post('/api/categories', {
      token,
      body: { name: 'Should be blocked' },
    });
    expect(status).toBe(403);
    expect(json.error.code).toBe('FORBIDDEN');
  });
});
