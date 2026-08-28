# Deployment guide

This is the operational runbook for deploying and running Textile Admin in
production — what's actually live today, how to redeploy or rebuild it from
scratch, and the gotchas that aren't obvious until you hit them. For a
conceptual walkthrough of the stack and local dev setup, see `README.md`.

## Architecture

```
┌─────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│  Admin frontend  │  API   │  Backend (Hono/Node) │  SQL   │  Supabase        │
│  (Vercel, Vite)  │ ─────► │  (Render)             │ ─────► │  Postgres + Auth │
└─────────────────┘        └───────────┬───────────┘        └─────────────────┘
                                        │ S3 API
                                        ▼
                            ┌──────────────────────┐        ┌─────────────────┐
                            │  Cloudflare R2        │        │  Public storefront│
                            │  (product images)     │        │  dzane.in — calls │
                            └──────────────────────┘        │  GET /api/public/* │
                                                             └─────────────────┘
```

Four independent services, each redeployed/managed separately:

| Layer | Host | What it does |
|---|---|---|
| Admin frontend | Vercel | Static Vite build of `apps/admin` |
| Backend API | Render | `apps/backend`, a plain Node/Hono server |
| Database + Auth | Supabase | Postgres, and Supabase Auth issues the JWTs the backend verifies |
| Image storage | Cloudflare R2 | S3-compatible; browser uploads directly via presigned URLs |

## Current live deployment

| Thing | Value |
|---|---|
| GitHub repo | `github.com/peakpoint2037/Textile-admin` (branch `main`, auto-deploys both Vercel and Render on push) |
| Admin frontend | `https://textile-admin-dzane.vercel.app` (Vercel project `textile-admin`, team `dzane`) |
| Backend API | `https://textile-admin-backend-1tre.onrender.com` (Render service `textile-admin-backend`) |
| Public storefront (consumer, not this repo) | `https://dzane.in` — calls `GET /api/public/products[/:id]`, CORS-allowed via `PUBLIC_STOREFRONT_URLS` |
| Supabase project | ref `cpjcfwsemuspoqrrbjcw`, region `ap-northeast-2` |
| Config as code | `render.yaml` (backend Blueprint), `vercel.json` (frontend build/rewrites) |

To redeploy either app: push to `main`. Both Vercel and Render are connected
via their GitHub integrations and build automatically. There's nothing to
trigger manually — the only thing that sometimes needs a manual step is the
**database migration** (see [Migrations](#migrations--the-one-gotcha-that-bites) below).

## Environment variables

Full reference lives in `.env.example` at the repo root — copy it to `.env`
(root, for the migration/seed scripts), `apps/backend/.env`, and
`apps/admin/.env` for local dev. In production, set these directly on each
host:

**Render** (`textile-admin-backend`, Dashboard → Environment):
`DATABASE_URL`, `FRONTEND_URL`, `PUBLIC_STOREFRONT_URLS`, `SUPABASE_JWT_SECRET`,
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ENDPOINT`,
`R2_REGION`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
`R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Everything except `PUBLIC_STOREFRONT_URLS`
and `R2_REGION` is `sync: false` in `render.yaml`, meaning Render won't
overwrite them from the Blueprint — they're set once by hand in the dashboard.

**Vercel** (`textile-admin` project, Settings → Environment Variables):
`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Must use
`--no-sensitive` visibility if setting via CLI (`vercel env add`) — Vercel
rejects "secret" visibility for `VITE_`-prefixed vars since they're bundled
into the public JS anyway.

## Setting up each service from scratch

### Supabase (database + auth)

1. Create a project at supabase.com.
2. Project Settings → Database → Connection string → copy the URI.
   **Use the Transaction mode pooler string (port `6543`), not "Direct
   connection" and not Session mode.** Two separate reasons:
   - Direct connection is IPv6-only and unreachable from Render's network —
     using it produces `ENETUNREACH` errors that look like a firewall
     problem but are actually just the wrong connection string.
   - Session mode holds one dedicated connection per client for the
     connection's lifetime. That's fine for an always-on host, but a
     free-tier host that spins down on inactivity (Render's free tier does)
     wakes up to a *burst* of requests that each try to open a fresh
     session-mode connection simultaneously — enough to exhaust Supavisor's
     pool and produce `ECHECKOUTTIMEOUT` errors. This actually happened in
     production. Transaction mode multiplexes connections instead, and
     works fine here because every multi-statement transaction in this
     codebase already goes through `withTransaction`'s single held client
     rather than assuming session-level state persists across queries.
     `apps/backend/src/config/db.ts` also caps the pool (`max: 5`,
     `connectionTimeoutMillis: 10_000`) as a second line of defense against
     the same burst pattern.
3. Project Settings → API → JWT Settings → copy the JWT Secret into
   `SUPABASE_JWT_SECRET` (used as a fallback; see the JWKS note below).
4. Project Settings → API → copy the Project URL and `anon` key into
   `SUPABASE_URL`/`SUPABASE_ANON_KEY` (backend) and `VITE_SUPABASE_URL`/
   `VITE_SUPABASE_ANON_KEY` (admin frontend) — setting the `VITE_` pair is
   what switches the login page from the dev-token form to real
   email/password sign-in.
5. Authentication → Users: create your OWNER user.
6. Run migrations against this database (`npm run migrate` with
   `DATABASE_URL` pointed at Supabase) — see the gotcha below, this doesn't
   reliably happen automatically.
7. New Supabase Auth users are JIT-provisioned into the app's `users` table
   with role `STAFF` on first sign-in. Promote your user to `OWNER` via SQL:
   ```sql
   UPDATE users SET role = 'OWNER' WHERE id = '<supabase-auth-user-uuid>';
   ```

**Auth token format**: newer Supabase projects issue ES256-signed JWTs
verified against Supabase's JWKS endpoint, not the legacy shared-secret
HS256 format. The backend (`apps/backend/src/middleware/auth.ts`) already
handles both — it verifies against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
when `SUPABASE_URL` is set, falling back to the HS256 shared secret only in
local dev when it isn't. No action needed unless you're debugging a fresh
"Invalid or expired token" error — check the token's header (`alg`) before
assuming the secret is wrong.

### Cloudflare R2 (image storage)

1. Cloudflare dashboard → R2 → Create bucket.
2. R2 → Manage R2 API Tokens → create a token with read/write access to that
   bucket → `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`.
3. `R2_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com`,
   `R2_ACCOUNT_ID` = that account id.
4. Enable the bucket's **Public Development URL** (or attach a custom
   domain) and set `R2_PUBLIC_URL` to that.
   **This must be the public `pub-*.r2.dev` URL (or custom domain), not the
   S3 API endpoint from step 3.** Using the S3 endpoint here is a real trap:
   uploads still succeed, but every image renders as a broken thumbnail
   because that endpoint requires signed requests — curling the "broken"
   image URL directly returns an XML `<Code>InvalidArgument</Code>` error,
   which is the tell if this happens.
5. Bucket → Settings → CORS policy — this is separate from the app's own
   CORS config and easy to forget:
   ```json
   [
     {
       "AllowedOrigins": ["https://textile-admin-dzane.vercel.app"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```

### Backend (Render)

Render Blueprint from `render.yaml` — connect the GitHub repo, Render reads
the file and creates the service. After the first deploy, set every
`sync: false` env var listed above in the dashboard (they aren't in the
Blueprint on purpose — secrets shouldn't live in a committed file).

`healthCheckPath: /health` — Render polls this to know when a deploy is
live; it's a cheap unauthenticated endpoint with no DB dependency.

### Frontend (Vercel)

Import the repo, project root can stay at the repo root (`vercel.json`
already sets `buildCommand`/`outputDirectory` to point at `apps/admin`). Set
the three `VITE_` env vars. The SPA rewrite (`"/(.*)" → "/index.html"`) is
required for React Router's client-side routes to work on a hard refresh —
without it, refreshing on e.g. `/products/123` 404s.

## Migrations — the one gotcha that bites

`render.yaml` sets `preDeployCommand: npm run migrate --workspace=database`,
which is *supposed* to run pending migrations before every deploy goes live.
**This has failed silently at least twice in this project** — the new
backend code deployed successfully (so the API responded, routes existed)
while the migration itself never actually ran, leaving the database schema
behind what the new code expected. The symptom is a generic `500
INTERNAL_ERROR` on whatever endpoint touches the new/changed table —
`GET /api/products` failed this way when a new table (`product_groups`) it
LEFT JOINs against didn't exist yet, even though the route itself worked
fine (routes are just JS; only the query inside failed).

**After any deploy that includes a new migration file, don't assume it
applied — verify it:**

```bash
# Cheap check: does the route respond with something other than a 401
# (route exists) and, ideally, hit an endpoint that doesn't need auth:
curl -s https://textile-admin-backend-1tre.onrender.com/api/public/products?limit=1
# A 500 here (not 401/200) is the signature of an unapplied migration.
```

**If it didn't apply, run it directly against production:**

```bash
cd database
DATABASE_URL='<production DATABASE_URL from Render>' npm run migrate
```

This is safe to run any time — `migrate.ts` tracks applied migrations in a
`schema_migrations` table and only runs what's pending, so re-running it
when everything's already applied is a harmless no-op
(`Applied 0 migration(s).`).

**Whenever you paste a production `DATABASE_URL` into a shell or chat to run
this, rotate the database password afterward** (Supabase → Database →
Reset database password) and update it in Render's `DATABASE_URL` env var to
match.

## Release checklist

The pattern this project follows for every change that touches the backend
or frontend:

1. `npm run typecheck` (both `apps/backend` and `apps/admin`)
2. `npm run lint` (root)
3. `npm test --workspace=apps/backend` and `npm test --workspace=apps/admin`
4. For anything UI-facing: exercise it in a real browser (golden path + at
   least one edge case), not just the automated tests
5. Commit, push to `main`
6. Poll Vercel (`vercel ls`) until the new deployment shows `● Ready`
7. **If the change touched `database/migrations/`**: verify the migration
   actually applied in production (see above) — don't assume the
   `preDeployCommand` handled it
8. Smoke-check the live API (`/health`, and whatever endpoint the change
   affects) before calling it done

## Troubleshooting reference

| Symptom | Likely cause |
|---|---|
| `500 INTERNAL_ERROR` on a previously-working endpoint, right after a deploy that added a migration | Migration didn't apply — see above |
| `ENETUNREACH` connecting to Postgres from Render | `DATABASE_URL` is using Supabase's Direct Connection (IPv6-only) instead of a pooler |
| `ECHECKOUTTIMEOUT` / connection pool exhausted, especially after the backend has been idle | `DATABASE_URL` is using Session mode (port `5432`) instead of Transaction mode (`6543`) — a cold-start request burst exhausts Session mode's per-client connections |
| `Invalid URL` from the `pg` connection string parser | Password wasn't URL-encoded, or the literal `[YOUR-PASSWORD]` placeholder was left in |
| `401 Invalid or expired token` right after switching to a real Supabase project | New Supabase projects issue ES256/JWKS tokens by default — confirm `SUPABASE_URL` is set on the backend so it verifies against JWKS, not the HS256 shared secret |
| Product images upload successfully but render as broken thumbnails | `R2_PUBLIC_URL` is set to the S3 API endpoint instead of the public `pub-*.r2.dev` URL |
| Browser blocked from `PUT`-ing an upload URL (CORS error in devtools) | R2 bucket-level CORS policy (not the app's own CORS) is missing the admin origin |
| `403` creating a category/product right after first login | New Supabase Auth users are JIT-provisioned as `STAFF` — promote to `OWNER` via SQL (see Supabase setup above) |
| Refreshing on a deep link (e.g. `/products/123`) 404s on Vercel | `vercel.json`'s SPA rewrite is missing or wasn't picked up — check `outputDirectory` matches where Vite actually builds to |
