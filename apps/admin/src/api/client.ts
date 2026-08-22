import type { ApiResponse } from '@textile-admin/shared';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const TOKEN_STORAGE_KEY = 'textile_admin_token';
const REQUEST_TIMEOUT_MS = 15000;

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  unauthorizedHandler = fn;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Set when the response body is a file download rather than JSON. */
  raw?: boolean;
}

// The background auth-state listener (see useAuth) normally keeps the stored
// token fresh, but it relies on Supabase's own refresh timer, which doesn't
// run while the tab is asleep/backgrounded. This is the fallback for that
// gap: on a 401, try one explicit refresh before giving up on the session.
// Concurrent 401s share one in-flight refresh instead of each racing Supabase.
let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!supabase) return Promise.resolve(null);
  if (!refreshPromise) {
    refreshPromise = supabase.auth
      .refreshSession()
      .then(({ data, error }) => {
        if (error || !data.session) return null;
        setToken(data.session.access_token);
        return data.session.access_token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function request<T>(path: string, opts: RequestOptions = {}, isRetry = false): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiClientError('TIMEOUT', 'The request timed out. Please try again.', 0);
    }
    throw new ApiClientError('NETWORK_ERROR', 'Could not reach the server. Is it running?', 0);
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401) {
    if (!isRetry) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) return request<T>(path, opts, true);
    }
    unauthorizedHandler?.();
  }

  if (opts.raw) {
    if (!res.ok) throw new ApiClientError('DOWNLOAD_FAILED', 'Could not download the file.', res.status);
    return (await res.blob()) as T;
  }

  const json = (await res.json()) as ApiResponse<T>;
  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message, res.status, json.error.fields);
  }
  return json.data;
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  download: (path: string, query?: RequestOptions['query']) => request<Blob>(path, { query, raw: true }),
};

export async function uploadFile(
  path: string,
  file: File,
  extraFields: Record<string, string> = {},
  isRetry = false,
): Promise<unknown> {
  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(extraFields)) formData.append(key, value);

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path), { method: 'POST', headers, body: formData });

  if (res.status === 401) {
    if (!isRetry) {
      const refreshedToken = await refreshAccessToken();
      if (refreshedToken) return uploadFile(path, file, extraFields, true);
    }
    unauthorizedHandler?.();
  }

  const json = (await res.json()) as ApiResponse<unknown>;
  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message, res.status, json.error.fields);
  }
  return json.data;
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
