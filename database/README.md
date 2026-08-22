# Database

Plain numbered SQL migrations (no ORM), applied by a small custom runner
against Postgres (local docker-compose Postgres or a real Supabase Postgres
instance — same `DATABASE_URL`-driven flow either way).

## Layout

- `migrations/` — numbered `.sql` files, applied in filename order. Each file
  is idempotent-tracked via a `schema_migrations` table (created
  automatically on first run) — already-applied files are skipped.
- `seeds/seed.ts` — populates demo data (categories, products, customers,
  orders, movements, expenses) so the dashboard is immediately usable.
- `seeds/dev-token.ts` — mints a Supabase-Auth-shaped JWT for a dev OWNER
  user, for exercising protected API routes before a real Supabase project
  is connected.

## Commands (run from repo root)

```bash
cp .env.example .env        # first time only
npm run db:up                # starts local Postgres + MinIO via docker-compose
npm run migrate              # applies all pending migrations
npm run seed                 # loads demo data
npm run dev-token            # prints a bearer token for local API testing
```

Adding a new migration: add a new `NNNN_description.sql` file with the next
number, then re-run `npm run migrate` — only unapplied files run.
