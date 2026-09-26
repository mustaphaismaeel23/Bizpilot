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

## Local development

### Prerequisites

- Node.js 20 LTS and npm
- PostgreSQL 15 or newer, either installed locally or running in Docker

### Setup

1. Install dependencies:

  ```powershell
  npm install
  ```

2. Copy the environment template and edit `.env`:

  ```powershell
  Copy-Item .env.example .env
  ```

  Set `DATABASE_URL` to your PostgreSQL database and replace
  `NEXTAUTH_SECRET` with a unique random value. Generate one with:

  ```powershell
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```

  Keep `.env` local; never commit database credentials or secrets.

3. If you need a local PostgreSQL container, start one with:

  ```powershell
  docker run --name bizpilot-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=bizpilot -p 5432:5432 -d postgres:16
  ```

4. Generate Prisma Client and apply the checked-in migrations:

  ```powershell
  npx prisma generate
  npx prisma migrate dev
  ```

5. Start the development server and create your own account at `/register`:

  ```powershell
  npm run dev
  ```

  Open `http://localhost:3000`. Registration and onboarding create your
  own user and business; the project does not include shared login
  credentials or pre-populated transaction data.

### Optional local account bootstrap

To create a local owner account without using the registration form, set
`DEV_SEED_EMAIL` and `DEV_SEED_PASSWORD` in `.env` (password must be at
least 12 characters), then run:

```powershell
npm run seed
```

The seed runs only with `NODE_ENV=development` and creates an account
and business without sample customers, products, sales, or expenses.
Use a unique local password; do not reuse production credentials.

### Development commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate Prisma Client and build the app |
| `npm start` | Start the production build locally |
| `npm run lint` | Run Next.js ESLint checks |
| `npm run prisma:migrate -- --name <change>` | Create and apply a development migration |
| `npm run prisma:deploy` | Apply existing migrations in a deployment environment |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run seed` | Create a configured local development account and business |

Password-reset links are returned only in development. Configure an email
delivery provider before enabling password reset in other environments.

Never expose `DATABASE_URL`, `NEXTAUTH_SECRET`, or other secrets in
client-side code. Server-side code reads them from environment variables.

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
    seed.ts             # Optional, environment-configured local account bootstrap
  types/               # NextAuth type augmentation
```

## Development workflow

Create a feature branch, make schema changes with a named development
migration, and validate changes with `npm run lint` and `npm run build`.
Use separate local database credentials for development and deployment.
