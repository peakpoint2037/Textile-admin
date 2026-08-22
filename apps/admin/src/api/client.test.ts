import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

const refreshSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { refreshSession: (...args: unknown[]) => refreshSession(...args) } },
}));

import { ApiClientError, apiClient, getToken, setToken, setUnauthorizedHandler } from './client';

function jsonResponse(status: number, body: unknown): Response {
  return {
    status,
    ok: status < 400,
    json: async () => body,
    blob: async () => new Blob(),
  } as Response;
}

const errorBody = { success: false, error: { code: 'UNAUTHORIZED', message: 'Token expired' } };
const okBody = { success: true, data: { ok: true } };

describe('apiClient 401 handling', () => {
  beforeEach(() => {
    localStorage.clear();
    refreshSession.mockReset();
    setUnauthorizedHandler(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('silently refreshes the access token and retries once after a 401', async () => {
    setToken('stale-token');
    refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } }, error: null });

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, errorBody))
      .mockResolvedValueOnce(jsonResponse(200, okBody));
    vi.stubGlobal('fetch', fetchMock);

    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);

    const result = await apiClient.get('/whoami');

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect((secondCallInit.headers as Record<string, string>).Authorization).toBe('Bearer fresh-token');
    expect(getToken()).toBe('fresh-token');
    expect(unauthorized).not.toHaveBeenCalled();
  });

  it('logs the user out when the session cannot be refreshed', async () => {
    setToken('stale-token');
    refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('refresh token expired') });

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, errorBody));
    vi.stubGlobal('fetch', fetchMock);

    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);

    await expect(apiClient.get('/whoami')).rejects.toBeInstanceOf(ApiClientError);
    expect(unauthorized).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry forever if the refreshed token is also rejected', async () => {
    setToken('stale-token');
    refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } }, error: null });

    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, errorBody));
    vi.stubGlobal('fetch', fetchMock);

    const unauthorized = vi.fn();
    setUnauthorizedHandler(unauthorized);

    await expect(apiClient.get('/whoami')).rejects.toBeInstanceOf(ApiClientError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  it('shares a single in-flight refresh across concurrent 401s', async () => {
    setToken('stale-token');
    let resolveRefresh!: (v: unknown) => void;
    refreshSession.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const headers = init.headers as Record<string, string>;
      if (headers.Authorization === 'Bearer stale-token') return Promise.resolve(jsonResponse(401, errorBody));
      return Promise.resolve(jsonResponse(200, okBody));
    });
    vi.stubGlobal('fetch', fetchMock);

    const p1 = apiClient.get('/a');
    const p2 = apiClient.get('/b');

    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1));
    resolveRefresh({ data: { session: { access_token: 'fresh-token' } }, error: null });

    await expect(p1).resolves.toEqual({ ok: true });
    await expect(p2).resolves.toEqual({ ok: true });
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
