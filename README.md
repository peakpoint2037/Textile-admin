# Textile Commerce Admin

A lightweight inventory, order, and sales admin system for a small textile
e-commerce business. One admin dashboard, one REST API, one Postgres
database — built to run comfortably on a laptop today and deploy to
Supabase + Cloudflare when you're ready.

```
apps/backend    Hono + TypeScript REST API (runs as a plain Node server; can
                also deploy to Cloudflare Workers — see "Backend deployment")
apps/admin      React + Vite admin dashboard
packages/shared Zod schemas, TS types, and enums shared by both apps
database        SQL migrations, seed data, and dev-auth helper scripts
```

## Quick start (local development)

Requires Node.js 20+, Docker, and npm.

```bash
npm install                 # installs every workspace
cp .env.example .env        # repo-root env (used by database/ scripts and,
                             # via fallback, by the backend)
npm run db:up                # starts local Postgres + MinIO (docker-compose)
npm run migrate               # applies all database migrations
npm run seed                   # loads demo categories/products/orders/expenses
npm run dev                     # runs backend (:3000) and admin (:5190) together
```

Open http://localhost:5190. Since no real Supabase project is configured
yet, the login page shows a **developer token** field instead of an
email/password form. Get a token with:

```bash
npm run dev-token
```

Paste it into the login form to sign in as the seeded OWNER user.

Run `npm run dev:backend` or `npm run dev:admin` to start either app alone.

## Why "local-first"

Everything above runs against a local Postgres and a local S3-compatible
store (MinIO) — no external account is required to develop or evaluate the
app. Every place that talks to Supabase or Cloudflare R2 is written against
their plain wire protocols (Postgres and S3), so switching to the real
services later is **only an environment-variable change** — see
[Going to production](#going-to-production) below.

## Repository layout in detail

```
apps/backend/src/
  config/       env loading, the pg Pool, the R2/S3 client
  middleware/   authenticate (JWT), requireRole, error envelope
  routes/       Hono routers, one per resource
  controllers/  parse request -> call service -> shape response
  services/     business logic (the only place stock/order rules live)
  repositories/ parameterized SQL, one file per table
  validators    (Zod schemas live in packages/shared instead, so the
                 frontend can import the exact same validation)
apps/admin/src/
  components/ui/  hand-built shadcn-style component library (Radix + Tailwind)
  layouts/        AdminLayout, Sidebar, Header, mobile drawer
  pages/          one folder per feature area
  api/            TanStack Query hooks, one file per resource
  hooks/useAuth   session state (Supabase Auth or dev-token, see below)
database/
  migrations/   numbered .sql files, applied in order, tracked in
                schema_migrations so re-running `npm run migrate` is a no-op
  seeds/        seed.ts (demo data) and dev-token.ts (local auth helper)
```

## Environment variables

Copy `.env.example` to `.env` at the repo root — the database scripts and,
as a fallback, the backend both read it. `apps/admin` needs its own `.env`
(only `VITE_`-prefixed variables are ever readable from the browser bundle).

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | backend, database scripts | Postgres connection string. Local: the docker-compose Postgres (port `55432`, remapped from 5432 to avoid clashing with other local Postgres instances — adjust in `docker-compose.yml`/`.env` if it collides with something on your machine). Production: your Supabase connection string (Session mode for a long-running Node server, Transaction mode if you deploy the backend to Workers). |
| `PORT` | backend | Port the API listens on. Default `3000`. |
| `FRONTEND_URL` | backend | Allowed CORS origin. Local: `http://localhost:5190`. |
| `SUPABASE_JWT_SECRET` | backend | Verifies the `Authorization: Bearer` JWT on every request. Local: any string (matched by `dev-token.ts`). Production: Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret. |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | backend | Only needed once a real Supabase project is connected; not required for local dev. Never expose the service-role key to the frontend. |
| `R2_ENDPOINT` | backend | S3-compatible endpoint. Local: MinIO (`http://localhost:59000`). Production: your Cloudflare R2 S3 API endpoint (`https://<account-id>.r2.cloudflarestorage.com`). |
| `R2_REGION` | backend | `auto` works for both MinIO and R2. |
| `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | backend | Local: the MinIO credentials in `docker-compose.yml`. Production: an R2 API token's access/secret key. **Never** put these in `apps/admin`. |
| `R2_BUCKET_NAME` | backend | Bucket product images are stored in. |
| `R2_PUBLIC_URL` | backend | Base URL images are served from — the backend derives each image's public URL from this + its storage key server-side (it does not trust a client-supplied URL). Local: MinIO's public endpoint. Production: your R2 bucket's public URL (custom domain or the `r2.dev` subdomain). |
| `VITE_API_URL` | admin | Base URL of the backend API. Local: `http://localhost:3000/api`. |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | admin | When set, the login page switches from the developer-token form to a real Supabase email/password form. Leave blank for local dev. |

## Database

Plain numbered SQL migrations, no ORM — see `database/README.md` for the
exact workflow. In short:

```bash
npm run migrate    # applies every pending migration in database/migrations/
npm run seed        # truncates and reloads demo data (categories, 12
                     # products across 5 categories, 5 customers, 8 orders
                     # in different statuses, 7 expenses)
```

Add a new migration by creating `database/migrations/NNNN_description.sql`
with the next number, then run `npm run migrate` again.

## Local authentication (no Supabase project yet)

`authenticate` middleware in the backend verifies a JWT the same way it
would verify a real Supabase Auth token (HS256, `SUPABASE_JWT_SECRET`), and
on first sight of a new user id it creates an app-level `users` row for
them automatically (defaulting to the least-privileged `STAFF` role).

`npm run dev-token` mints a token for a fixed seeded `OWNER` user so you can
exercise every protected route (via the UI, or `curl -H "Authorization:
Bearer $(...)"`) without a real Supabase project. There is no
`/api/auth/login` route — login is always handled by Supabase Auth (or, for
local dev, this token script) on the client side; the backend only ever
verifies tokens it's handed.

## Public storefront API

`GET /api/public/products` is the one deliberately unauthenticated route in
the API — meant to be called directly from a separate customer-facing
storefront (a different app/domain than the admin dashboard).

- Filters: `category` (a category **slug**, not the internal UUID — e.g.
  `?category=t-shirts`), `search`, `size`, `color`, plus the usual
  `page`/`limit`/`sortBy`/`sortDir`.
- Always scoped to `status = 'ACTIVE'` products only; there's no way to ask
  it for draft/archived products.
- The response shape (`PublicProductDto`) deliberately omits `purchasePrice`
  (your cost/margin) and `lowStockLimit` (an internal operational
  threshold) — fields the admin-facing `/api/products` endpoint returns but
  a public storefront must never expose. If you add fields to this
  endpoint later, keep that exclusion in mind.
- CORS for this one path allows any origin (the storefront's domain isn't
  known in advance); every other route stays locked to `FRONTEND_URL`. See
  the `origin` function in `apps/backend/src/app.ts` if you need to adjust
  this.
- An unknown category slug returns an empty page (`200`, zero items), not a
  `404` — treated as a filter matching nothing, not a missing resource.

## Excel import/export formats

**Products** (`/excel/products/import`, `/excel/products/export`) — header
row: `SKU, Product, Category, Description, Size, Color, Purchase Price,
Selling Price, Stock, Low Stock Limit, Status`. A row whose SKU already
exists updates that product (an SKU repeated twice within the same file is
an error); a new SKU creates a product. Changing the `Stock` column on an
existing product doesn't overwrite `stock_quantity` silently — it books an
`ADJUSTMENT` inventory movement for the difference, so the audit trail
never has a gap.

**Stock** (`/excel/stock/import`) — header row: `SKU, Quantity, Reason`.
Every row is a `STOCK_IN` movement for an existing product; `Quantity` must
be a positive whole number.

Both imports follow the same flow: upload once to get a **preview**
(`{ totalRows, validCount, errorCount, errors: [{row, message}], preview,
committed: false }`) without writing anything, fix any rows Excel flags,
then upload again with confirmation to actually commit. Commit is refused
(`committed: false`) if any row still has an error — imports are all-or-
nothing, never partial.

## Testing

```bash
npm run test --workspace=apps/backend   # Vitest, against a dedicated
                                         # textile_admin_test database that
                                         # the test setup creates/migrates
                                         # automatically (see tests/setup.ts)
npm run test --workspace=apps/admin     # Vitest + React Testing Library
```

## Going to production

### Supabase (database + auth)

1. Create a project at supabase.com.
2. Project Settings → Database → Connection string: copy the URI into
   `DATABASE_URL` (Session mode for a long-running Node backend; Transaction
   mode if you deploy the backend to Cloudflare Workers instead).
3. Project Settings → API → JWT Settings → copy the JWT Secret into
   `SUPABASE_JWT_SECRET`.
4. Project Settings → API → copy the Project URL and `anon` key into
   `SUPABASE_URL`/`SUPABASE_ANON_KEY` (backend) and `VITE_SUPABASE_URL`/
   `VITE_SUPABASE_ANON_KEY` (admin) — setting the `VITE_` pair is what
   switches the login page from the dev-token form to real email/password
   sign-in.
5. Authentication → Users: create your OWNER user (or enable a sign-up flow
   if you want one — this MVP doesn't ship one, by design; user/role
   management is a manual, infrequent admin task for a business this size).
6. Run `npm run migrate` with `DATABASE_URL` pointed at Supabase.
7. Give that user's `role` an `OWNER` row in the app's `users` table (insert
   it directly, matching the Supabase Auth user's UUID as `id` — or just
   sign in once so the backend's JIT-provisioning creates the row, then
   update `role` from `STAFF` to `OWNER` via SQL).

### Cloudflare R2 (image storage)

1. Cloudflare dashboard → R2 → Create bucket.
2. R2 → Manage R2 API Tokens → create a token with read/write access to
   that bucket → copy the Access Key ID / Secret Access Key into
   `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`.
3. Set `R2_ENDPOINT` to `https://<account-id>.r2.cloudflarestorage.com` and
   `R2_ACCOUNT_ID` to that account id.
4. Enable public access on the bucket (or attach a custom domain) and set
   `R2_PUBLIC_URL` to that base URL.
5. Bucket → Settings → CORS policy — allow `GET`/`PUT` from your admin
   app's origin so the browser can upload directly via presigned URLs:
   ```json
   [
     {
       "AllowedOrigins": ["https://your-admin-domain.example"],
       "AllowedMethods": ["GET", "PUT"],
       "AllowedHeaders": ["*"]
     }
   ]
   ```
6. No code changes are needed — the backend's `StorageService` speaks
   plain S3 API and already points at R2-shaped config; only the env vars
   change from MinIO's to R2's.

### Frontend deployment (Vercel)

1. Import the repo into Vercel, set the project root to `apps/admin`.
2. Build command: `npm run build --workspace=packages/shared && npm run
   build --workspace=apps/admin` (or configure `packages/shared` as a
   separate build step / turborepo pipeline if you outgrow this).
3. Output directory: `apps/admin/dist`.
4. Set `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` as
   Vercel project env vars.

### Backend deployment

**Plain Node server** (Railway, Render, Fly.io, a VM, etc.): build with
`npm run build --workspace=packages/shared && npm run build --workspace=apps/backend`,
then run `node apps/backend/dist/server.js`. Set every backend env var from
the table above (with production `DATABASE_URL`/R2/Supabase values) on the
host.

**Cloudflare Workers** (optional path — the backend was deliberately kept
framework-light for this): the business logic (`services/`, `repositories/`)
has no Node-specific dependencies, but the current entrypoint
(`src/server.ts`) uses `@hono/node-server` and the `pg` driver, which needs
a Postgres driver that works over Workers' fetch-based networking (e.g.
`@neondatabase/serverless` against Supabase's connection pooler, or
Hyperdrive). To deploy to Workers: add a `src/worker.ts` exporting
`export default app` (the same `app` from `app.ts`, unchanged), swap `pg`
for a Workers-compatible Postgres client behind the same `Queryable`
interface in `config/db.ts`, and add a `wrangler.toml`. Nothing in
`routes/`, `controllers/`, or `services/` needs to change.

## Development principles this codebase follows

- The backend always computes order totals and profit — the frontend's
  totals are an estimate shown before submit, never trusted.
- Every stock mutation goes through a service function that runs inside a
  single DB transaction and always writes an `inventory_movements` row;
  nothing updates `products.stock_quantity` directly.
- Order confirmation locks and checks every line's stock before deducting
  any of it — a short-stocked item fails the whole confirmation, never a
  partial one.
- DTOs returned to the frontend are camelCase and numeric (prices/quantities
  as JS numbers, not Postgres decimal strings); the shared Zod schemas in
  `packages/shared` are the single source of truth both apps validate
  against.
