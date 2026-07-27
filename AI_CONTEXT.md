# AI_CONTEXT

Read this first. It is the fastest path to acting correctly in this repo without
re-exploring it. For deeper detail follow the cross-links:
[PROJECT_MAP](PROJECT_MAP.md) · [ARCHITECTURE](ARCHITECTURE.md) ·
[COMPONENT_REGISTRY](COMPONENT_REGISTRY.md) · [DATA_FLOW](DATA_FLOW.md) ·
[API_MAP](API_MAP.md) · [CODING_CONVENTIONS](CODING_CONVENTIONS.md) ·
[DEPENDENCIES](DEPENDENCIES.md).

The authoritative human rules live in [CLAUDE.md](CLAUDE.md) and
[AGENTS.md](AGENTS.md) — this file never overrides them.

## What this repo is

DYLLU — headless e-commerce for a Moldova-based power-tools storefront (reference
design: `ryobitools.com`; catalog sourced from INGCO). pnpm + Turborepo monorepo,
**three** apps:

| App                  | Package             | Stack                            | Port | Role                                                                  |
| -------------------- | ------------------- | -------------------------------- | ---- | --------------------------------------------------------------------- |
| `apps/backend`       | `@dyllu/backend`    | Medusa v2.17, Postgres, Redis    | 9000 | Commerce engine + bundled admin at `/backend`                         |
| `apps/storefront`    | `@dyllu/storefront` | Next.js 16, React 19, Tailwind 3 | 4000 | Public store; deployed to Cloudflare Workers via OpenNext             |
| `apps/catalog-admin` | `catalog-admin`     | Next.js 16, SQLite + Drizzle     | 4100 | **Internal** catalog-prep tool; publishes to Medusa via its Admin API |

`packages/` is empty (reserved for future shared code).

> **Doc drift already present:** root `README.md` still describes a _Shopify_
> storefront and Tailwind 4 — that is stale; the project migrated to **Medusa**
> and the storefront uses **Tailwind 3**. Trust this file and the source, not the
> README.

## Business concepts & terminology

- **Region** — Medusa construct driving currency (MDL), tax, and available
  payment/shipping methods. Pricing is region-scoped; product data fetches pass a
  `region_id`. Moldova is the only live market.
- **Publishable API key** — attaches the storefront to a Medusa Sales Channel;
  required on every store request (`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`).
- **Product UI type taxonomy** — the PDP renders differently per product shape,
  derived at runtime by `getProductUiType()` in
  `apps/storefront/src/modules/products/lib/product-presentation.ts`:
  `kit` / `set` / `combo` / standard (variant). Each has its own template.
- **Platform / power source** — battery-tool ecosystem metadata (e.g. a battery
  platform shared across tools). Drives compatible-accessory matching.
- **Compatible accessories** — batteries/chargers/etc. matched to a tool by
  platform, served by a custom store API and cross-linked on the PDP.
- **Catalog master (catalog-admin)** — a local SQLite DB (`data/catalog.db`) that
  is the _authoring_ source of truth for product content, specs, taxonomy, and
  bundles before anything is pushed into Medusa. Medusa is the _runtime_ source of
  truth the storefront reads.
- **Specifications pipeline** — Python tools in `/tools` normalize, translate
  (RO), and QA raw spec data inside the catalog DB (see catalog-admin scripts).

## Preferred implementation approaches (do these by default)

- **Storefront data fetching:** always go through `apps/storefront/src/lib/data/*`
  modules, which call the shared SDK in `src/lib/config.ts`. Never call Medusa via
  ad-hoc `fetch()`. Server Components only for reads; mutations are `"use server"`
  actions (see `src/lib/data/cart.ts`).
- **New backend store/admin endpoint:** add a folder under
  `apps/backend/src/api/{store,admin}/…/route.ts`, define its Zod contract in
  `src/api/_shared/contracts.ts`, and wire validation/auth/security in
  `src/api/middlewares.ts`. Do not scatter validation into the route body.
- **New storefront UI:** compose from existing atoms → molecules → organisms in
  `src/components/*` before creating new primitives. Feature/domain logic lives in
  `src/modules/<feature>/`. Keep `"use client"` islands small and at the leaves.
- **Publishing catalog data to Medusa:** use catalog-admin's existing Admin-API
  bridge (`src/lib/medusaAdmin.ts`) — never add publish code inside the Medusa
  backend (keeps Medusa upgradeable). See `apps/catalog-admin/PUBLISH.md`.

## Files usually modified together

- Backend endpoint ⇒ `src/api/**/route.ts` **+** `src/api/_shared/contracts.ts`
  **+** `src/api/middlewares.ts`.
- Storefront data shape change ⇒ `src/lib/data/<x>.ts` **+** the consuming
  Server Component **+** possibly `src/lib/util/*` transformers.
- New homepage section ⇒ add a block variant to `src/lib/homepage/types.ts`,
  handle it in `src/components/templates/homepage-renderer.tsx`, add the organism,
  and register content in `src/lib/homepage/home.config.ts`.
- Cache invalidation ⇒ if you add a new cached tag on the storefront, update the
  `ALLOWED_TAGS` allowlist in `src/app/api/revalidate/route.ts` **and** whatever
  triggers revalidation.
- catalog-admin schema change ⇒ `drizzle/schema.ts` **+** a migration script in
  `drizzle/` **+** the querying `src/lib/*.ts`.

## Files/areas that should RARELY change — treat with care

- **`apps/backend/medusa-config.ts`** and **`src/config/environment.ts`** — startup
  config. Env changes to production are governed by hard rules in
  [AGENTS.md](AGENTS.md) (“Production safety”). Never invent env vars; never make a
  new prod var required in one rollout.
- **`apps/storefront/src/middleware.ts`** — runs on the edge on every request
  (product redirects + cache-id cookie). It intentionally is _not_ renamed to
  `proxy.ts` (OpenNext/Cloudflare adapter limitation — see the in-file comment).
- **`apps/storefront/wrangler.jsonc`** — live Cloudflare bindings (R2, D1, DO) and
  the production domain. Contains a real D1 `database_id`.
- **`next.config.ts` / `medusa-config.ts` security headers**, CORS, JWT/cookie
  secrets — security-relevant, changes need justification.

## Dangerous areas (get it wrong and production breaks or data corrupts)

- **Production env & deploy** — backend runs live at `api.dyllu.md` (Hetzner +
  Coolify). Follow [AGENTS.md](AGENTS.md) to the letter: inspect read-only,
  present facts + rollback, wait for approval before mutating anything
  production-affecting.
- **Catalog data & migrations** — `data/catalog.db`, backend seed/ingest scripts
  (`src/scripts/ingco-*`), and Drizzle migrations mutate real catalog data. Out of
  scope unless the user explicitly puts data work in scope (AGENTS.md). Any bulk
  record op (search/modify/migrate/normalize/delete) MUST follow the **Bulk & batch
  data operations** rules in [CODING_CONVENTIONS](CODING_CONVENTIONS.md): plan in the
  AI, execute via queries/workflows/scripts, count→dryRun→batch→verify, and never
  load the full dataset into context.
- **The revalidate secret path** — `REVALIDATE_SECRET`/`ORDER_ACCESS_SECRET` gate
  cache invalidation and order-transfer access; the compare is constant-time on
  purpose. Don't weaken it.
- **AI-edit routes** (`src/api/admin/ai-edit/*`) — hard-disabled in production
  (return 503). Keep that guard.

## Generated / vendored — do not hand-edit, do not read for logic

- `apps/storefront/.open-next/`, `.next/`, `.wrangler/`, `.turbo/`
- `apps/backend/.medusa/` (excluded from the pnpm workspace)
- `apps/catalog-admin/.next/`, `data/backups/`, `.pytest_cache/`
- `pnpm-lock.yaml`, `cloudflare-env.d.ts` (`pnpm cf-typegen`), generated types

## Next.js 16 caveat (critical)

This is **not** the Next.js in your training data. Before writing any
Next-specific code (route handlers, metadata, caching, async `params`, proxy),
consult `apps/storefront/node_modules/next/dist/docs/`. Known local facts: `params`
are async; `src/middleware.ts` is the working convention here (not `proxy.ts`); the
`eslint` key was removed from `next.config`.

## House rules that bite most often (full list in CODING_CONVENTIONS)

- **Zero comments** except a single-line non-obvious _why_. No JSDoc blocks. Strip
  stale Medusa-starter comments when you touch a file.
- **`any` and `@ts-ignore` are banned** (`@ts-expect-error` + reason only).
- Server Components by default; narrow `"use client"`.
- Commits/PRs must carry a Jira-style id — prefix `DYLLU-000` (a git hook enforces
  it). Use the `abalmush` GitHub account for all git/gh operations.
- `pnpm check` before every commit.

## Migration / state notes

- Backend is **live** at `api.dyllu.md`; storefront deploys to Cloudflare Workers
  (`dyllu.md`). Images on Cloudflare R2 (`cdn.dyllu.md`). See `docs/DEPLOYMENT-STATE.md`
  and `docs/OPERATIONS.md` for the current operational runbook.
- MAIB (Moldova Agroindbank) payment provider is **deferred** — not yet
  implemented; checkout uses manual/test payment flows.
- Vitest unit tests were removed in the Shopify→Medusa migration; storefront tests
  are currently Playwright e2e. Backend uses Jest.
