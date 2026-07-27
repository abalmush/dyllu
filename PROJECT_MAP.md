# PROJECT_MAP

High-level index of the DYLLU repository. Understand the project in a few minutes
without reading source. For AI-specific guidance start with
[AI_CONTEXT](AI_CONTEXT.md); for design rationale see [ARCHITECTURE](ARCHITECTURE.md).

## Purpose

Headless e-commerce for **DYLLU**, a Moldova-based power-tools store (catalog from
INGCO; reference design `ryobitools.com`, see [PROPOSAL.md](PROPOSAL.md)). A Medusa
v2 commerce backend serves a Next.js storefront; a separate internal tool prepares
and publishes the product catalog.

## Technology stack

- **Monorepo:** pnpm 10 workspaces + Turborepo 2. Node ≥ 22.12 (`.nvmrc` pins
  22.22.0; a `predev` guard fails fast below the floor).
- **Backend:** Medusa v2.17 (TypeScript), Postgres, Redis (prod), Jest tests.
  Hosted on Hetzner CX32 + Coolify. Live at `api.dyllu.md`.
- **Storefront:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 3,
  Zustand, Medusa JS SDK, Radix UI, Framer Motion. Deployed to **Cloudflare
  Workers** via `@opennextjs/cloudflare` (R2 + D1 + Durable Objects). Live at
  `dyllu.md`.
- **catalog-admin:** Next.js 16 + **SQLite (better-sqlite3) via Drizzle ORM**,
  shadcn/Base UI components, Vitest + Playwright. Local internal tool (port 4100).
- **Images:** Cloudflare R2 (`cdn.dyllu.md`).
- **Payments:** MAIB Checkout API — custom provider **deferred**.

## Repository structure

```
apps/
  backend/        @dyllu/backend  — Medusa v2 (see below)
  storefront/     @dyllu/storefront — Next.js store (see below)
  catalog-admin/  catalog-admin   — SQLite catalog prep + Medusa publisher
packages/         (empty — reserved for shared code)
tools/            Python catalog/spec pipeline scripts (specs QA, translation…)
docs/             Runbooks & specs (DEPLOYMENT-STATE, OPERATIONS, allium, superpowers)
scripts/          check-node.mjs (Node version guard)
images/           Source design/reference imagery
turbo.json        Turborepo task graph
pnpm-workspace.yaml
```

### apps/backend/src

```
api/            Custom REST routes (store + admin) + middlewares + _shared contracts
  _shared/      Zod contracts (contracts.ts) + logging helpers
  store/        compatible-accessories/route.ts
  admin/        ai-edit/{chat,apply}/route.ts (dev-only)
  ready/        route.ts (health)
config/         environment.ts (Zod-validated env, production-required keys)
scripts/        ingco-* ingest/classify/wipe, configure-shipping, stock, revalidate
modules/ workflows/ subscribers/ jobs/ links/   (README stubs — extension points)
admin/          Admin UI customizations (widgets, i18n)
migration-scripts/
```

### apps/storefront/src

```
app/
  (main)/       Public routes: home, products/[handle], categories, collections,
                c/[slug], cart, account (parallel @dashboard/@login), order/*,
                store, preview, + info pages (contact, livrare, termeni, …)
  (checkout)/   checkout/ (its own layout — no site chrome)
  api/          revalidate/, product-feed/ (route handlers)
  layout.tsx, sitemap.ts, robots.ts
components/     Design system: atoms/ molecules/ organisms/ templates/ (barrel index.ts each)
modules/        Feature domains: products, cart, checkout, order, account,
                categories, collections, store, layout, shipping, common, skeletons
lib/
  data/         Server-only Medusa fetchers (products, cart, regions, orders, …)
  util/         Pure helpers (money, product, image-loader, medusa-error, …)
  homepage/     Data-driven homepage block schema + config
  config.ts     Medusa JS SDK instance (locale header + 12s timeout wrapper)
  constants.tsx, site-content.tsx, seo/, hooks/, stores/, context/
middleware.ts   Edge: product redirects + _medusa_cache_id cookie
```

### apps/catalog-admin/src

```
app/            Pages: products, products/[id] (tabbed editor), categories, bulk,
                specs-dictionary, specs-normalization/*, sale-readiness, problems,
                links, settings  + server actions (actions.ts) + bulk/export route
  _components/  AppShell, NavItem
db/client.ts    better-sqlite3 + Drizzle (data/catalog.db, WAL)
lib/            medusaAdmin (Admin-API bridge), toMedusaProduct, spec*/normalization*,
                saleReadiness, taxonomyOverview, queries, validation, powerSupply
components/ui/  shadcn primitives
drizzle/        schema.ts + migrate-*.ts scripts
```

## Entry points

- **Backend:** `medusa develop` (dev) / `medusa start` (prod); config in
  `medusa-config.ts`. Admin UI served at `/backend`.
- **Storefront:** `next dev --turbopack -p 4000`; prod worker entry
  `.open-next/worker.js` (see `wrangler.jsonc`). Root layout `src/app/layout.tsx`.
- **catalog-admin:** `next dev -p 4100`; root layout `src/app/layout.tsx`.

## Routing

- Storefront uses **App Router route groups**: `(main)` (site chrome) and
  `(checkout)` (bare). Dynamic segments: `products/[handle]`,
  `categories/[...category]`, `collections/[handle]`, `c/[slug]`,
  `order/[id]/…`, `account/@dashboard|@login` (parallel routes). Edge middleware
  applies legacy product-handle 301s and sets a cache-id cookie.
- Backend routes are file-based under `src/api/**/route.ts`; cross-cutting concerns
  (auth, validation, security headers) are declared centrally in
  `src/api/middlewares.ts`. Full list in [API_MAP](API_MAP.md).

## Build system

Turborepo orchestrates per-workspace tasks (`turbo.json`): `build` (`^build`
ordered, outputs `.next/**`, `dist/**`, `.medusa/**`), `dev` (persistent), plus
`lint`, `typecheck` (after `^build`), `test`, `test:e2e`, `check`, `codegen`,
`db:migrate`, `seed`. Run everything from repo root via `pnpm <script>`.

Storefront production build path: `opennextjs-cloudflare build` → `.open-next/` →
`wrangler deploy` (`pnpm -F @dyllu/storefront deploy:cf`).

## Testing strategy

- **Backend:** Jest — `test:unit`, `test:integration:http`,
  `test:integration:modules`. Integration tests hit a real dev backend (do not mock
  Medusa).
- **Storefront:** Playwright e2e (`test` = chromium project, `test:e2e` = full).
  Vitest unit tests were removed in the Medusa migration and are being re-added.
- **catalog-admin:** Vitest (`test`) + Playwright (`test:e2e`).

## Configuration files

| File                                     | Purpose                                                 |
| ---------------------------------------- | ------------------------------------------------------- |
| `turbo.json`                             | Task graph & caching                                    |
| `pnpm-workspace.yaml`                    | Workspaces (`apps/*`, `packages/*`; excludes `.medusa`) |
| `apps/backend/medusa-config.ts`          | Medusa core: DB, Redis, CORS, S3/R2, admin path         |
| `apps/backend/src/config/environment.ts` | Zod env schema + production-required keys               |
| `apps/storefront/next.config.ts`         | Security headers, custom image loader, tracing root     |
| `apps/storefront/wrangler.jsonc`         | Cloudflare bindings (R2/D1/DO), domain, secrets         |
| `apps/storefront/check-env-variables.js` | Validates required storefront env at build              |
| `apps/catalog-admin/drizzle.config.ts`   | Drizzle → `data/catalog.db` (sqlite)                    |
| `.nvmrc` / `scripts/check-node.mjs`      | Node version floor guard                                |
| `.husky/` + `.lintstagedrc.mjs`          | Pre-commit format/lint                                  |

## Important scripts (run from repo root)

| Command                                           | Effect                                                   |
| ------------------------------------------------- | -------------------------------------------------------- |
| `pnpm dev`                                        | All dev servers via turbo                                |
| `pnpm dev:store`                                  | Backend + storefront only (excludes flaky catalog-admin) |
| `pnpm -F @dyllu/backend dev`                      | Backend only (admin at `:9000/backend`)                  |
| `pnpm -F @dyllu/storefront dev`                   | Storefront only (`:4000`)                                |
| `pnpm -F catalog-admin dev`                       | catalog-admin (`:4100`)                                  |
| `pnpm build` / `lint` / `typecheck` / `test`      | Fan out via turbo                                        |
| `pnpm check`                                      | lint + typecheck + test                                  |
| `pnpm format`                                     | Prettier write                                           |
| `pnpm -F @dyllu/backend db:migrate`               | Migrations + seed scripts                                |
| `pnpm -F @dyllu/backend db:create-user -e … -p …` | Create admin user                                        |
| `pnpm -F @dyllu/storefront deploy:cf`             | Build + deploy storefront to Cloudflare                  |
| `pnpm -F catalog-admin db:migrate*`               | Drizzle catalog migrations                               |
| `pnpm -F catalog-admin specs:*`                   | Python spec pipeline (QA/translate/normalize)            |

## Major design patterns

- **Server-first data access** — a thin `src/lib/data/*` layer over the Medusa SDK;
  mutations via `"use server"` actions. See [DATA_FLOW](DATA_FLOW.md).
- **Atomic design** — atoms → molecules → organisms → templates. See
  [COMPONENT_REGISTRY](COMPONENT_REGISTRY.md).
- **Data-driven homepage** — a typed block schema (`lib/homepage`) rendered by a
  single switch in `templates/homepage-renderer.tsx`.
- **Runtime PDP polymorphism** — one product feed, four PDP templates chosen by
  `getProductUiType()` (kit/set/combo/standard).
- **Central API contracts** — Zod schemas in one shared file; middleware wires
  validation + auth. See [API_MAP](API_MAP.md).
- **Catalog master → Medusa** — SQLite authoring DB, published to Medusa through its
  standard Admin API (no backend coupling).

## Common workflows

- **Add a product data field to the PDP:** extend the fetch `fields` in
  `lib/data/products.ts` → surface it via `modules/products/lib/product-presentation.ts`
  → render in the relevant PDP template/organism.
- **Add a store API:** route under `src/api/store/…` + contract in
  `_shared/contracts.ts` + wire in `middlewares.ts` → consume from a `lib/data/*`
  module. See [API_MAP](API_MAP.md).
- **Publish catalog to Medusa:** author in catalog-admin → set
  `CATALOG_MEDUSA_ADMIN_URL/KEY` → dry-run → confirm publish (`PUBLISH.md`).
- **Invalidate storefront cache:** POST `/api/revalidate` with `x-revalidate-secret`
  and allowed tags. See [DATA_FLOW](DATA_FLOW.md).

## Where to find everything

- Rules & conventions → [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md),
  [CODING_CONVENTIONS](CODING_CONVENTIONS.md)
- Architecture & trade-offs → [ARCHITECTURE](ARCHITECTURE.md)
- APIs → [API_MAP](API_MAP.md) · Components → [COMPONENT_REGISTRY](COMPONENT_REGISTRY.md)
- Flows/diagrams → [DATA_FLOW](DATA_FLOW.md) · Deps → [DEPENDENCIES](DEPENDENCIES.md)
- Ops/deploy → `docs/DEPLOYMENT-STATE.md`, `docs/OPERATIONS.md`,
  `apps/backend/DEPLOY.md`, `apps/catalog-admin/PUBLISH.md`
- Product proposal / spec → [PROPOSAL.md](PROPOSAL.md), [TODO.md](TODO.md)
