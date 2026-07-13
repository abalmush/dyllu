# DYLLU Production Deployment — Current State

Living handoff/status doc. Companion to the design spec
(`docs/superpowers/specs/2026-07-10-production-deployment-design.md`) and the
execution plan (`docs/superpowers/plans/2026-07-10-production-deployment.md`).
Last updated: 2026-07-12.

> Deployment work landed on `main` and auto-deploys via GitHub Actions. Ongoing
> feature work continues on `feat/catalog-master-consolidation`.

## Status: LIVE — operator hardening required

The full stack is deployed and functional, but it is not production-ready until
the operator-only security and recovery blockers below are completed and
verified. Catalog data and storefront polish continue separately.

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

| Thing           | Value                                                    |
| --------------- | -------------------------------------------------------- |
| Storefront      | `https://dyllu.md` + `www.dyllu.md` (Cloudflare Workers) |
| Backend admin   | `https://api.dyllu.md/backend` (real HTTPS)              |
| Media CDN       | `https://cdn.dyllu.md` (R2 bucket `dyllu-media`)         |
| VPS management  | private VPN/management path only                         |
| Coolify UI      | protected HTTPS URL behind Access/VPN                    |
| Region          | Moldova `reg_01KX6GW84R9BQFM6NGG6EY5K7R` (MDL/md)        |
| Publishable key | `pk_f847…1642`                                           |

## DNS (Cloudflare zone `dyllu.md`)

- Nameservers delegated to Cloudflare (`galilea` / `malcolm.ns.cloudflare.com`);
  zone active.
- `api` → Cloudflare-proxied backend origin. The origin firewall must accept
  public HTTPS only from Cloudflare networks, or the service must use a
  Cloudflare Tunnel. Direct-origin access is forbidden.
- Apex `dyllu.md` + `www` → Worker custom domains (proxied).
- `cdn` → R2 custom domain on bucket `dyllu-media` (proxied, min TLS 1.2).

## Deploy mechanisms

Pull requests run build validation only. Pushes to `main` deploy after validation
and the GitHub `production` environment gate. That environment must be configured
with required reviewers, a main-only branch policy, and environment-scoped
production secrets.

**Backend** — `.github/workflows/deploy-backend.yml`: compile backend/admin →
build+push GHCR image → Coolify webhook → public health/admin smoke checks through
Cloudflare. Coolify pulls `ghcr.io/abalmush/dyllu-backend:latest` (a Docker Image
resource). TLS is terminated by Coolify Traefik behind Cloudflare.

**Storefront** — `.github/workflows/deploy-storefront.yml`: lint + typecheck +
OpenNext build → `wrangler` deploy → public storefront/backend smoke checks. PRs
do not receive Cloudflare deployment credentials or upload Worker versions.

### Deployment secrets

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `COOLIFY_WEBHOOK_URL`, `COOLIFY_API_TOKEN`.

Move production values to the protected GitHub `production` environment. Remove
retired NAS/Tailscale secrets and rotate any credential that has ever appeared in
source control.

## Known runtime gotchas (learned the hard way)

- **Cloudflare can reject build-time Medusa fetches from datacenter IPs.**
  `generateStaticParams` must tolerate unavailable catalog data. CI and operators
  must not bypass Cloudflare by resolving the public hostname to the origin.
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
2. Reintroduce image optimization (Worker-native) once catalog images are in.
3. Complete and verify every operator blocker below.
4. **Task 10**: retire NAS containers/DNS; rewrite the stale
   `apps/backend/DEPLOY.md`; update `CLAUDE.md` (backend deployed on
   Hetzner/Coolify; storefront on Cloudflare, not Vercel).

## Operator blockers before launch

1. Put Coolify behind a protected HTTPS URL with Cloudflare Access or an
   operator VPN. Firewall direct public access to port 8000 and invalidate any
   sessions or credentials previously used over plaintext HTTP.
2. Restrict backend-origin HTTPS to Cloudflare networks or move it behind a
   Cloudflare Tunnel. Keep SSH and all data-service ports on the private
   management path.
3. Create off-host nightly Postgres backups with retention and failure alerts.
   Complete and record a full restore drill; repeat it at least quarterly.
4. Protect `main` and configure the GitHub `production` environment with required
   reviewers, main-only deployments, and environment-scoped secrets.

## Known gaps / risks

- **`main` is the deploy branch.** It and the GitHub `production` environment
  remain launch blockers until their protection rules are enabled and verified.
- **`apps/backend/DEPLOY.md` is stale** — describes the old Vercel + Coolify
  git-build setup. Rewrite in Task 10.
- **Disaster recovery is unverified** until the first successful off-host backup
  has been restored into an isolated database and application checks pass.
