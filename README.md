# DYLLU

Headless e-commerce for **DYLLU** — a Moldova-based power-tools storefront
(catalog sourced from INGCO; reference design `ryobitools.com`). A **Medusa v2**
backend serves a **Next.js 16** storefront, with a separate internal tool for
preparing and publishing the product catalog.

## Documentation

Start here — an AI- and human-friendly knowledge base lives at the repo root:

| Doc                                            | Read it for                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [AI_CONTEXT.md](AI_CONTEXT.md)                 | Fastest orientation — concepts, patterns, do/don't, dangerous areas |
| [PROJECT_MAP.md](PROJECT_MAP.md)               | Repo index: structure, entry points, routing, scripts               |
| [ARCHITECTURE.md](ARCHITECTURE.md)             | Boundaries, rendering, state, caching, security, trade-offs         |
| [COMPONENT_REGISTRY.md](COMPONENT_REGISTRY.md) | Storefront design system + feature components                       |
| [DATA_FLOW.md](DATA_FLOW.md)                   | Read/write/publish/cache/event flows (diagrams)                     |
| [API_MAP.md](API_MAP.md)                       | Every API surface (Store, Admin, route handlers)                    |
| [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md) | The rules actually used here                                        |
| [DEPENDENCIES.md](DEPENDENCIES.md)             | Internal/external deps, rationale, upgrade cautions                 |

Rules & agent instructions: [CLAUDE.md](CLAUDE.md) + [AGENTS.md](AGENTS.md).
Product proposal: [PROPOSAL.md](PROPOSAL.md). Ops: `docs/DEPLOYMENT-STATE.md`,
`docs/OPERATIONS.md`.

## Monorepo (pnpm workspaces + Turborepo)

| App                  | Package             | Stack                                                                                     | Port |
| -------------------- | ------------------- | ----------------------------------------------------------------------------------------- | ---- |
| `apps/backend`       | `@dyllu/backend`    | Medusa v2.17, Postgres, Redis; admin at `/backend`                                        | 9000 |
| `apps/storefront`    | `@dyllu/storefront` | Next.js 16, React 19, Tailwind 3, Medusa JS SDK; deploys to Cloudflare Workers (OpenNext) | 4000 |
| `apps/catalog-admin` | `catalog-admin`     | Next.js 16, SQLite + Drizzle; publishes to Medusa via its Admin API                       | 4100 |

`packages/` is reserved for future shared code (currently empty).

## Stack

- **Backend:** Medusa v2.17 (TypeScript), Postgres, Redis (prod), Jest.
  Hosted on Hetzner + Coolify — live at `api.dyllu.md`.
- **Storefront:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 3,
  Zustand, Radix UI, Framer Motion. Deployed to Cloudflare Workers (R2 + D1 +
  Durable Objects) — live at `dyllu.md`.
- **catalog-admin:** Next.js 16 + SQLite (better-sqlite3/Drizzle), shadcn/Base UI,
  Vitest + Playwright. Internal, local-only.
- **Images:** Cloudflare R2 (`cdn.dyllu.md`).
- **Payments:** MAIB Checkout API — custom Medusa provider, **deferred**.

## Getting started

**Prerequisites:** Node ≥ 22.12 (`.nvmrc` pins 22.22.0 — run `nvm use`), Docker
(Postgres), pnpm 10+.

```bash
pnpm install

# Start Postgres (port 5433 to avoid conflicts)
docker compose -f apps/backend/docker-compose.yml up -d

# First-time: migrate + create an admin user
pnpm -F @dyllu/backend db:migrate
pnpm -F @dyllu/backend db:create-user -e admin@dyllu.local -p "<password>"

# Storefront env: copy the template, then paste the Publishable API Key
# from the admin (Settings) into NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
cp apps/storefront/.env.local.example apps/storefront/.env.local

pnpm dev          # all apps
# or
pnpm dev:store    # backend + storefront only (excludes catalog-admin)
```

Admin: `http://localhost:9000/backend` · Storefront: `http://localhost:4000` ·
catalog-admin: `http://localhost:4100`.

## Scripts (run from repo root; Turborepo fans out)

| Command                                         | Effect                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| `pnpm dev` / `pnpm dev:store`                   | All dev servers / backend + storefront only                         |
| `pnpm -F <pkg> dev`                             | Single app (`@dyllu/backend`, `@dyllu/storefront`, `catalog-admin`) |
| `pnpm build` / `lint` / `typecheck` / `test`    | Fan out across workspaces                                           |
| `pnpm check`                                    | Lint + typecheck + test                                             |
| `pnpm format` / `format:check`                  | Prettier                                                            |
| `pnpm -F @dyllu/backend db:migrate`             | Migrations + seed scripts                                           |
| `pnpm -F @dyllu/storefront deploy:cf`           | Build + deploy storefront to Cloudflare                             |
| `pnpm -F catalog-admin db:migrate*` / `specs:*` | Catalog migrations / spec pipeline                                  |

Full script and workflow reference: [PROJECT_MAP.md](PROJECT_MAP.md).

## Environment variables

- `apps/backend/.env.example` — local backend dev
- `apps/backend/.env.production.example` — documented production env
- `apps/storefront/.env.local.example` — storefront
- `apps/catalog-admin/.env.local.example` — catalog-admin (Medusa Admin publish)

Backend env is Zod-validated (`apps/backend/src/config/environment.ts`) and rejects
placeholder secrets. **Production env/config changes follow the hard rules in
[AGENTS.md](AGENTS.md).**

## Deployment

- **Backend** → Hetzner + Coolify. See `apps/backend/DEPLOY.md`,
  `docs/DEPLOYMENT-STATE.md`.
- **Storefront** → Cloudflare Workers via OpenNext (`wrangler.jsonc`).
- **catalog-admin** → local only; publishes catalog to Medusa (`apps/catalog-admin/PUBLISH.md`).

## Notes

- **Next.js 16** has breaking changes vs. training data — read
  `apps/storefront/node_modules/next/dist/docs/` before writing Next-specific code.
- **Server Components by default**; keep `"use client"` islands small.
- Storefront data access goes **only** through `src/lib/data/*` over the Medusa SDK
  (`src/lib/config.ts`) — no ad-hoc `fetch`.
- Commits/PRs require a `DYLLU-000` ticket prefix (git hook). Run `pnpm check`
  before committing.
