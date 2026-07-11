# DYLLU Production Deployment — Current State

Living handoff/status doc. Companion to the design spec
(`docs/superpowers/specs/2026-07-10-production-deployment-design.md`) and the
execution plan (`docs/superpowers/plans/2026-07-10-production-deployment.md`).
Last updated: 2026-07-11.

> Deployment work landed on `main` and auto-deploys via GitHub Actions. Ongoing
> feature work continues on `feat/catalog-master-consolidation`.

## Status: LIVE

Full stack is deployed and functional. Remaining work is catalog data
(products/categories) and polish, not infrastructure.

## Architecture

- **Storefront** — Next.js 16 via `@opennextjs/cloudflare` on **Cloudflare
  Workers** (`dyllu-storefront`). Cache: R2 (`dyllu-next-cache`), D1 tag cache
  (`dyllu-tag-cache`, id `8bf378b6-0d2f-4755-b5b7-83afd2dd4a6b`), DO queue.
- **Backend** — Medusa v2.14 on **Hetzner CX32 + Coolify**, Postgres 16 + Redis
  7 as Coolify services. Image `ghcr.io/abalmush/dyllu-backend`.
- **Images** — Cloudflare R2 (`dyllu-media`) served via `cdn.dyllu.md` (live).
- **Edge** — Cloudflare account `592732e1a9ae45cfe9cafce4228ebe2d`, zone
  `dyllu.md` id `f3c1a775580e4dd7d787f93bf3cb326e`.

## Live endpoints & infra

| Thing            | Value                                                    |
| ---------------- | -------------------------------------------------------- |
| Storefront       | `https://dyllu.md` + `www.dyllu.md` (Cloudflare Workers) |
| Backend admin    | `https://api.dyllu.md/backend` (real HTTPS)              |
| Media CDN        | `https://cdn.dyllu.md` (R2 bucket `dyllu-media`)         |
| VPS (Hetzner) IP | `138.199.235.8`                                          |
| Coolify UI       | `http://138.199.235.8:8000`                              |
| Region           | Moldova `reg_01KX6GW84R9BQFM6NGG6EY5K7R` (MDL/md)        |
| Publishable key  | `pk_f847…1642`                                           |

## DNS (Cloudflare zone `dyllu.md`)

- Nameservers delegated to Cloudflare (`galilea` / `malcolm.ns.cloudflare.com`);
  zone active.
- `api` → A `138.199.235.8`, **Proxied (orange)**. Note: Cloudflare bot
  protection 403s datacenter IPs — see CI notes below.
- Apex `dyllu.md` + `www` → Worker custom domains (proxied).
- `cdn` → R2 custom domain on bucket `dyllu-media` (proxied, min TLS 1.2).

## Deploy mechanisms (both auto-deploy on push to `main`)

**Backend** — `.github/workflows/deploy-backend.yml`: build+push GHCR image →
Coolify webhook (deploy) → health check. Path-filtered to `apps/backend/**`.
Coolify pulls `ghcr.io/abalmush/dyllu-backend:latest` (a Docker Image resource).
TLS terminated by Coolify Traefik (Let's Encrypt). Health check resolves
`api.dyllu.md` to the origin IP to bypass Cloudflare bot protection.

**Storefront** — `.github/workflows/deploy-storefront.yml`: OpenNext build →
`wrangler` deploy. Path-filtered to `apps/storefront/**`.

### CI secrets (repo abalmush/dyllu — all set)

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `COOLIFY_WEBHOOK_URL`, `COOLIFY_API_TOKEN`.

## Known runtime gotchas (learned the hard way)

- **Cloudflare bot protection 403s datacenter IPs.** Build-time Medusa fetches
  and the backend health check fail from GitHub runners even though browsers and
  the runtime Worker succeed. Fixes: `generateStaticParams` must catch fetch
  errors; the backend health check uses `curl --resolve` to the origin IP.
- **ISR path fails in the Worker.** `generateStaticParams` detail routes
  (product/category/collection) 500'd in production (fine in dev) via the
  on-demand ISR cache write. All three are now `export const dynamic =
"force-dynamic"` — correct anyway for live pricing/stock.
- **Image `/cdn-cgi/image/` transforms don't work behind a Worker.** The custom
  next/image loader now returns `src` directly (images unoptimized but
  R2/CF-cached). Reintroduce optimization via a Worker-native approach later.
- **Unpriced variants can't be added to cart.** A variant needs an MDL price in
  the Moldova region or add-to-cart returns a masked "unknown error".

## Catalog state

- **Categories:** 88-category tree seeded from `apps/backend/src/data/category-tree.ts`
  via the once-only `initial-data-seed.ts` migration script (INGCO sample tree).
- **Products:** effectively empty (one priced test product). Real catalog is the
  next major workstream.
- **Promo sets:** tag-based merchandising via `apps/storefront/src/lib/promos.ts`
  (extensible registry) → `/c/[slug]` landing pages + homepage `PromoBanner`.
  Products are grouped by Medusa **product tags** (many-to-many), NOT
  collections (single-membership). Categories are also many-to-many — use
  categories/tags for cross-cutting groups, collections only for exclusive sets.

## Open items / next steps

1. **Build the catalog** — new category structure + products (map categories,
   MDL prices, publish, attach sales channel, upload images to R2). Import
   tooling lives outside the repo (`tmp/tools/scraper`, `catalog-ai-pipeline`).
2. **Strip `apps/backend/data/ingco`** (~32 MB sample data committed to the repo
   → baked into every backend image); gitignore it.
3. Set the storefront Worker `REVALIDATE_SECRET` secret (match backend) via
   `wrangler secret put` so on-demand revalidation works.
4. Reintroduce image optimization (Worker-native) once catalog images are in.
5. Nightly DB backups to R2 (`dyllu-backups`) — plan Task 5 Step 9.
6. **Task 10**: retire NAS containers/DNS; rewrite the stale
   `apps/backend/DEPLOY.md`; update `CLAUDE.md` (backend deployed on
   Hetzner/Coolify; storefront on Cloudflare, not Vercel).

## Known gaps / risks

- **`main` is the deploy branch** but feature work continues on
  `feat/catalog-master-consolidation`; keep them reconciled.
- **`apps/backend/DEPLOY.md` is stale** — describes the old Vercel + Coolify
  git-build setup. Rewrite in Task 10.
- **`data/ingco` sample data** still committed (see open item 2).
