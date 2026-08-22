import { app } from '../../src/app.js';

interface CallOptions {
  token?: string;
  body?: unknown;
}

// The response envelope's shape varies per endpoint, and these are test
// assertions (not production code) reaching into arbitrary fields — `any`
// here is the pragmatic choice rather than re-declaring every DTO shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiCallResult {
  status: number;
  json: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

async function call(method: string, path: string, opts: CallOptions = {}): Promise<ApiCallResult> {
  const headers: Record<string, string> = {};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await app.request(path, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const json = await res.json();
  return { status: res.status, json };
}

export const api = {
  get: (path: string, opts?: CallOptions) => call('GET', path, opts),
  post: (path: string, opts?: CallOptions) => call('POST', path, opts),
  patch: (path: string, opts?: CallOptions) => call('PATCH', path, opts),
  delete: (path: string, opts?: CallOptions) => call('DELETE', path, opts),
};
