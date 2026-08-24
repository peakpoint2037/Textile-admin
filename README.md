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

## Features

- **Catalog** — standalone products, or **product groups** (a shared name,
  category, description, price, and status) with per-**variant** SKU/size/
  color/stock — see [Products vs. product groups](#products-vs-product-groups)
  below. Multiple images per product (drag-to-reorder, one marked primary),
  uploaded client-side straight to S3-compatible storage via a presigned URL.
- **Inventory** — every stock change (manual stock-in, adjustment, sale,
  cancellation, return, opening stock, Excel reconciliation) is a single
  transactional `inventory_movements` row; `products.stock_quantity` is never
  written outside that path, so the ledger and the live count can never drift.
  Low-stock/out-of-stock views and a full movement history.
- **Orders** — line items priced against a product's current selling price
  (overridable per line), per-line discounts, order-level discount/shipping/
  tax, and an optional **stitching charge** (including stitching-only orders
  with zero products). A backend-enforced status state machine drives stock
  deduction/restoration automatically — see
  [Order lifecycle](#order-lifecycle--stock-rules). Payment status tracked
  separately from fulfillment status. PDF invoice generation in the browser.
- **Customers** — searchable directory with per-customer order stats; inline
  create from the New Order screen; deletion blocked while a customer has
  order history.
- **Expenses** — categorized business expenses (packaging, marketing,
  shipping, printing, photography, website, other), rolled into the profit
  report.
- **Reports & dashboard** — sales, gross/net profit (revenue minus product
  cost minus expenses), inventory valuation, top products, sales-by-day,
  and order/payment status distributions, all filterable by date range.
- **Excel import/export** — bulk product create/update and stock-in via
  `.xlsx`, with a mandatory preview-then-confirm step and an all-or-nothing
  commit (see [Excel import/export formats](#excel-importexport-formats)).
- **Public storefront API** — two deliberately unauthenticated, read-only
  endpoints for a separate customer-facing site to list/view `ACTIVE`
  products, with cost/margin fields stripped out (see
  [Public storefront API](#public-storefront-api)).
- **Auth & roles** — Supabase-Auth-backed JWT sessions with three roles
  (`OWNER`, `ADMIN`, `STAFF`) and per-route permission checks (see
  [Roles & permissions](#roles--permissions)); a developer-token flow stands
  in before a real Supabase project is connected.

## Tech stack

| Layer | Choices |
|---|---|
| Backend | [Hono](https://hono.dev) on Node (`@hono/node-server`), `pg`, `zod`, `jose` (JWT verification), `exceljs`, `@aws-sdk/client-s3` (S3/R2), Vitest |
| Frontend | React 18 + Vite, TanStack Query, React Hook Form + Zod resolvers, React Router, Tailwind CSS + Radix UI (hand-rolled shadcn-style components), Recharts, `jspdf`/`jspdf-autotable` (invoice PDFs), Sonner (toasts), Vitest + React Testing Library |
| Database | Postgres — plain numbered SQL migrations, no ORM |
| Storage | S3-compatible object storage (MinIO locally, Cloudflare R2 in production) via presigned URLs |
| Auth | Supabase Auth (JWT), verified locally against a shared dev secret before a real Supabase project exists |

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

## Domain model & business rules

### Products vs. product groups

A `product` row is always the sellable, stock-tracked unit — it's what
appears on an order line and what `inventory_movements` references. Most
fields (`name`, `category`, `description`, `purchase_price`, `selling_price`,
`status`) can either belong to a single standalone product, or be owned by a
**product group** and shared across every variant in it:

- Creating a group takes the shared fields once plus a list of variants, each
  contributing only what's genuinely per-variant: `sku`, `size`, `color`,
  `stockQuantity`, `lowStockLimit`.
- Editing a group's shared fields (e.g. `sellingPrice`) cascades onto every
  variant's `products` row in the same transaction — there's no way for two
  variants of one group to disagree on price.
- A variant can be added to an existing group later (`addVariant`); a group
  can't be deleted while it still has variants (`PRODUCT_GROUP_IN_USE`).
- A product with `group_id = NULL` is a plain standalone product — grouping
  was added as a purely additive migration (`0012_product_groups.sql`), so
  every product created before it, or created without a group since,
  behaves exactly as before.

### Order lifecycle & stock rules

Orders move through a fixed status state machine
(`ORDER_STATUS_TRANSITIONS` in `packages/shared/constants/enums.ts`),
enforced server-side — the API rejects any transition not listed:

```
PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED
   ↓           ↓          ↓        ↓          ↓
CANCELLED  CANCELLED  CANCELLED CANCELLED  RETURNED
                                    ↓
                                RETURNED
```

- Stock is deducted exactly once, on the `PENDING → CONFIRMED` transition —
  every line's stock is locked (in a stable order to avoid deadlocking
  against other concurrent confirmations) and checked before any of it is
  deducted, so one short-stocked line fails the whole confirmation.
- Cancelling an order only restores stock if it had already been deducted
  (i.e. it was at or past `CONFIRMED`) — cancelling a still-`PENDING` order
  restores nothing, since nothing was taken.
- Returning a `SHIPPED`/`DELIVERED` order always restores stock.
- Payment status (`PENDING`/`PAID`/`FAILED`/`REFUNDED`/`COD`) is tracked
  independently of fulfillment status and changed via a separate,
  `OWNER`/`ADMIN`-only endpoint.
- The backend always computes `total` server-side
  (`subtotal - discount + shippingFee + tax + stitchingCharge`) — the
  frontend's total is an estimate shown before submit, never trusted.

### Roles & permissions

Three roles, enforced per-route by `requireRole` middleware (not just hidden
in the UI):

| Action | OWNER / ADMIN | STAFF |
|---|---|---|
| View products, orders, customers, reports | ✅ | ✅ |
| Create/update orders, order status | ✅ | ✅ |
| Stock-in / stock adjustment, product image uploads | ✅ | ✅ |
| Stock Excel import | ✅ | ✅ |
| Create/update/delete products, product groups, categories | ✅ | ❌ |
| Update order **payment** status | ✅ | ❌ |
| Create/update/delete expenses | ✅ | ❌ |
| Delete a customer | ✅ | ❌ |
| Product Excel import | ✅ | ❌ |

A brand-new Supabase Auth user is provisioned automatically on first
authenticated request, defaulting to the least-privileged `STAFF` role —
promoting someone to `ADMIN`/`OWNER` is a manual SQL update (see
[Going to production](#going-to-production)).

## Environment variables

Copy `.env.example` to `.env` at the repo root — the database scripts and,
as a fallback, the backend both read it. `apps/admin` needs its own `.env`
(only `VITE_`-prefixed variables are ever readable from the browser bundle).

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | backend, database scripts | Postgres connection string. Local: the docker-compose Postgres (port `55432`, remapped from 5432 to avoid clashing with other local Postgres instances — adjust in `docker-compose.yml`/`.env` if it collides with something on your machine). Production: your Supabase connection string — prefer the **Transaction mode** pooler (port `6543`) over Session mode even for this long-running Node server if the host can spin down on inactivity (e.g. Render's free tier): a cold-start burst of requests opening several Session-mode connections at once can exhaust Supavisor's pool and produce `ECHECKOUTTIMEOUT` errors. Transaction mode multiplexes connections instead of holding one per client, and works fine here since every multi-statement transaction already goes through `withTransaction`'s single held client. Deploying the backend to Cloudflare Workers requires Transaction mode regardless. |
| `PORT` | backend | Port the API listens on. Default `3000`. |
| `FRONTEND_URL` | backend | Allowed CORS origin for the admin app. Local: `http://localhost:5190`. |
| `PUBLIC_STOREFRONT_URLS` | backend | Comma-separated origins allowed to call the public storefront API (`GET /api/public/*`). Blank allows any origin. |
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

`GET /api/public/products` and `GET /api/public/products/:id` are the two
deliberately unauthenticated routes in the API — meant to be called directly
from a separate customer-facing storefront (a different app/domain than the
admin dashboard). Full docs: [`docs/api/public-products.md`](docs/api/public-products.md).

- Filters on the list route: `category` (a category **slug**, not the
  internal UUID — e.g. `?category=t-shirts`), `search`, `size`, `color`,
  plus the usual `page`/`limit`/`sortBy`/`sortDir`.
- The `:id` route returns the same fields as the list plus the full
  `images` array (`PublicProductImageDto[]`) — use it for a product's
  gallery/detail page. It 404s for an inactive/archived product's id, not
  just a nonexistent one, so it never leaks a non-public product's
  existence.
- Both routes are always scoped to `status = 'ACTIVE'` products only;
  there's no way to ask either for draft/archived products.
- The response shapes (`PublicProductDto`, `PublicProductDetailDto`,
  `PublicProductImageDto`) deliberately omit `purchasePrice` (your
  cost/margin), `lowStockLimit` (an internal operational threshold), and
  `storageKey` (the internal R2/S3 object key) — fields the admin-facing
  `/api/products` endpoint returns but a public storefront must never
  expose. If you add fields to either endpoint later, keep that exclusion
  in mind.
- CORS for `/api/public/*` is controlled by `PUBLIC_STOREFRONT_URLS` (a
  comma-separated allowlist) — left blank, any origin may call it; set once
  the storefront's real domain(s) are known to lock it down. Every other
  route stays locked to `FRONTEND_URL` regardless. See the `origin`
  function in `apps/backend/src/app.ts` if you need finer-grained rules.
- An unknown category slug on the list route returns an empty page (`200`,
  zero items), not a `404` — treated as a filter matching nothing, not a
  missing resource.

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

The repo ships ready-to-use deploy configs for one concrete pairing — Render
for the backend (`render.yaml`, including a `preDeployCommand` that runs
migrations automatically) and Vercel for the admin frontend (`vercel.json`)
— but nothing about the backend or frontend is Render/Vercel-specific; see
[Backend deployment](#backend-deployment) for other hosts.

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
- A product group's shared fields (name, category, description, price,
  status) are edited once and cascaded onto every variant in the same
  transaction — there's no path that lets variants of one group disagree.
