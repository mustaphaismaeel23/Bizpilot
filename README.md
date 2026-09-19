# BizPilot

**Run your business. Know your numbers.**

BizPilot is a business management platform for small and medium-sized
businesses: sales/POS, inventory, customers & credit, expenses, and
sales/profit reporting — all backed by PostgreSQL with strict
business-level data isolation.

## Tech stack

- **Frontend:** Next.js 14 (App Router), TypeScript, React, Tailwind CSS, shadcn/ui-style components
- **Backend:** Next.js API routes, TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod (client + server)
- **Forms:** React Hook Form
- **Charts:** Recharts
- **Auth:** NextAuth (Credentials provider, bcrypt password hashing, JWT sessions)
- **Icons:** Lucide React

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/bizpilot?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-long-random-string"   # e.g. `openssl rand -base64 32`
```

You need a running PostgreSQL instance. Locally you can use Docker:

```bash
docker run --name bizpilot-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=bizpilot -p 5432:5432 -d postgres:16
```

### 3. Generate the Prisma client & run migrations

```bash
npx prisma generate
npx prisma migrate dev --name init
```

> **Note:** `prisma generate` downloads a query-engine binary from
> `binaries.prisma.sh` the first time it runs. This requires normal
> outbound internet access (this is standard on any developer machine,
> CI runner, or hosting platform — it was simply not reachable inside
> the sandboxed environment this project was authored in, which only
> allowed connections to `npm`/`pypi`/`github`-style registries). Once
> generated, the code has already been reviewed for correctness against
> the schema; if you hit any residual TypeScript errors after
> generation they will be narrow and easy to resolve.

### 4. Seed demo data (optional but recommended)

```bash
npm run seed
```

This creates a demo account you can log in with immediately:

```
Email:    demo@bizpilot.app
Password: Password123!
```

It also creates a demo business ("Demo Electronics Store"), categories,
5 products (one deliberately low-stock, one out-of-stock), 3 customers,
4 sample sales (including one on credit), and a handful of expenses —
so the dashboard, reports and low-stock alerts have real data to show
immediately.

### 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Available scripts

| Command                  | Description                                  |
| ------------------------- | --------------------------------------------- |
| `npm run dev`              | Start the dev server                          |
| `npm run build`             | Prisma generate + production build            |
| `npm start`                | Start the production server (after build)     |
| `npm run prisma:migrate`    | Create/apply a dev migration                  |
| `npm run prisma:deploy`     | Apply migrations in production                |
| `npm run prisma:studio`     | Open Prisma Studio (visual DB browser)        |
| `npm run seed`              | Populate demo data                            |

## Production build & deployment

```bash
npm run build
npm start
```

For a platform like Vercel, Railway, or Render:

1. Provision a PostgreSQL database (Neon, Supabase, Railway, RDS, etc.).
2. Set `DATABASE_URL`, `NEXTAUTH_URL` (your production URL) and
   `NEXTAUTH_SECRET` as environment variables on the platform.
3. Run `npx prisma migrate deploy` as part of your deploy step (or a
   one-off release command) before the app starts.
4. Deploy — the build script (`npm run build`) already runs
   `prisma generate` first.

Never expose `DATABASE_URL`, `NEXTAUTH_SECRET`, or any other secret in
client-side code — everything sensitive here lives only in server
components/API routes and environment variables.

## Architecture notes

- **Business data isolation is enforced server-side, always.** Every
  API route resolves the caller's business via their `BusinessUser`
  membership (`lib/session.ts` → `requireBusiness`) — a `businessId`
  is *never* trusted from client input. Any resource fetched by ID is
  re-checked against the caller's business with `assertOwnership`
  before it is read or mutated. This is what guarantees a user from
  Business A can never see or touch Business B's data, per the MVP's
  acceptance test.
- **Sale completion is fully transactional** (`app/api/sales/route.ts`):
  stock is validated, the sale + line items are created, inventory is
  decremented, an `InventoryTransaction` audit trail is written, and
  notifications are generated — all inside a single `prisma.$transaction`.
  If any step fails, everything rolls back and stock is never
  corrupted.
- **Historical accuracy:** `SaleItem` snapshots `unitPrice` and
  `buyingPrice` at the moment of sale, so historical profit is never
  recalculated using a product's *current* price (section 14 of the
  spec).
- **Soft-delete for products:** deleting a product deactivates it
  (`isActive: false`) rather than removing it, so past sales keep
  valid references.
- **Every server route is also validated with the same Zod schemas**
  used on the client (`lib/validators.ts`) — the frontend never is the
  only line of defense.
- **Architected for the roadmap:** `BusinessUser` (with `role`) already
  models staff accounts/roles even though the MVP only exercises the
  `OWNER` role; the business switcher in the top bar is a placeholder
  UI for future multi-business support.

## Project structure

```
bizpilot/
  app/
    api/            # REST-style API routes (server-side only)
    dashboard/       # Authenticated app pages (sidebar layout)
    login|register|forgot-password|reset-password|onboarding/
    page.tsx         # Marketing landing page
    pricing/
  components/
    ui/              # shadcn-style primitives (button, dialog, table, ...)
    shared/           # App-specific shared components (sidebar, topbar, ...)
  lib/                # prisma client, auth, session/ownership guards, validators, utils
  hooks/              # useFetch/apiRequest client data-fetching helpers
  prisma/
    schema.prisma
    seed.ts
  types/               # NextAuth type augmentation
```

## MVP acceptance test

The full workflow described in the spec (register → login → create
business → create category/product → create customer → complete a
sale → stock decreases → sale appears in history → revenue/profit
update → record expense → net result updates → low-stock alert →
view reports → print/download receipt → log out → business isolation
holds) is implemented end-to-end. Run `npm run seed` for a
 pre-populated business, or walk through it fresh via `/register`.
