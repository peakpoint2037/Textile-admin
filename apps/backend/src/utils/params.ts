import type { Context } from 'hono';

/**
 * Hono infers path-param types from the route pattern at the point a handler
 * is registered; once a handler is a standalone function typed as
 * `Context<AppEnv>` (not `Context<AppEnv, '/products/:id'>`), that inference
 * is lost and `c.req.param(name)` types as `string | undefined`. Every call
 * site here is only ever reached via a route that declares the param, so
 * it's always present at runtime — this just asserts that back to the
 * type checker in one place instead of casting at every call site.
 */
export function pathParam(c: Context, name: string): string {
  return c.req.param(name) as string;
}
