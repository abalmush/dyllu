# Production Deployment Architecture

**Date:** 2026-07-10
**Status:** Approved direction (Approach A), pending implementation
**Supersedes:** `2026-06-16-nas-deployment-design.md` (NAS deployment is retired)

## Goal

Host the DYLLU storefront, Medusa backend + admin, Postgres, Redis, and product
images on production-grade infrastructure that is fast for users in Moldova and
cheap enough for a starting business (~€13/mo). Replace the Synology NAS
deployment and its GitHub Actions pipeline entirely.

The production domain is referred to as `dyllu.example` in this doc; substitute
the real apex domain when provisioning. All DNS lives in Cloudflare.

## Decision summary

| Piece | Where | Why |
| --- | --- | --- |
| Storefront (Next.js 16) | Cloudflare Workers via OpenNext adapter | SSR at the edge; static assets and cached pages served from Cloudflare's Chișinău PoP |
| Backend + admin (Medusa v2) | Hetzner CX32 (Falkenstein) managed by Coolify | ~30 ms from Chișinău; best reliability-per-euro; admin bundled at `/backend` |
| Postgres 16 + Redis 7 | Docker services on the same VPS (Coolify templates) | Zero-latency to backend; managed DB deferred until load demands it |
| Images | Cloudflare R2 + custom domain + Image Transformations | Free egress, edge-cached in Moldova, on-the-fly resize/crop/WebP/AVIF |
| CDN / DNS / TLS | Cloudflare (proxy everything, SSL mode Full (strict)) | Single edge layer in front of both origins |
| CI/CD | GitHub Actions → GHCR + Coolify webhook (backend); GitHub Actions → wrangler (storefront) | No Tailscale, no SSH-into-NAS |

Rejected: Vercel Pro (+$20/mo for no Moldova latency win — nearest region is
Frankfurt, same as Hetzner), everything-on-VPS (Approach B — kept as fallback),
Cloudflare Containers for Medusa (immature, no persistent disk).

## Architecture

```
Moldovan user
   │
   ▼
Cloudflare edge (Chișinău PoP) ── cached HTML, static assets, images
   │
   ├── dyllu.example ──────────► Worker (OpenNext storefront, Node runtime)
   │                                │  R2: incremental cache
   │                                │  DO: revalidation queue
   │                                │  D1: tag cache
   │                                ▼
   ├── api.dyllu.example ─────► Hetzner CX32 · Coolify (Traefik TLS)
   │                                ├─ medusa-backend :9000 (admin at /backend)
   │                                ├─ postgres:16 (Docker volume)
   │                                └─ redis:7
   │
   └── cdn.dyllu.example ─────► R2 bucket (product images)
                                    └─ /cdn-cgi/image/… transformations
```

## Components

### Storefront — Cloudflare Workers

- `@opennextjs/cloudflare` adapter (officially supports all Next.js 16
  minor/patch versions), deployed with `wrangler`. Workers **paid plan
  ($5/mo)** — the free plan's 3 MB bundle limit will not fit.
- Caching wiring (required because the app uses fetch tags +
  `revalidateTag` via `src/app/api/revalidate/route.ts`):
  - **R2 bucket** `dyllu-next-cache` — incremental cache
  - **Durable Object** — revalidation queue
  - **D1 database** — tag cache
- `next/image` gets a custom loader targeting Cloudflare Image
  Transformations (`/cdn-cgi/image/...` on the zone). The built-in optimizer
  does not exist on Workers.
- Code changes in `apps/storefront`:
  - remove dead `pg` dependency
  - remove `output: "standalone"` and `outputFileTracingRoot` (Docker-era)
  - prune starter-era `images.remotePatterns` (unsplash, picsum, cloudinary,
    ingcomoldova.md); keep only `cdn.dyllu.example` + localhost
  - add `open-next.config.ts` + `wrangler.jsonc`
- Env (Workers secrets/vars): `MEDUSA_BACKEND_URL=https://api.dyllu.example`,
  `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL`,
  `NEXT_PUBLIC_DEFAULT_REGION`, `REVALIDATE_SECRET`.

### Backend — Hetzner + Coolify

- **CX32** (4 vCPU / 8 GB / 80 GB, ~€8/mo), Falkenstein, Ubuntu 22.04 LTS,
  Coolify installed per `apps/backend/DEPLOY.md`.
- App resource deploys the **prebuilt GHCR image**
  (`ghcr.io/abalmush/dyllu-backend`) — CI builds, the VPS only pulls. Container
  CMD keeps migrate-on-boot (`medusa db:migrate && medusa start`).
- Postgres 16 and Redis 7 as Coolify service templates with named volumes.
  Keep `databaseDriverOptions: { connection: { ssl: false } }` in
  `medusa-config.ts` (local Postgres has no TLS).
- Coolify's Traefik terminates real Let's Encrypt TLS, so Medusa's secure
  session cookie works without header hacks. Cloudflare SSL mode: **Full
  (strict)**.
- `api.dyllu.example` proxied through Cloudflare. Admin UI at
  `https://api.dyllu.example/backend`.
- Medusa file module → S3 provider pointed at R2 (bucket `dyllu-media`,
  scoped API token, `S3_FILE_URL=https://cdn.dyllu.example`).

### Images — R2 + Transformations

- Bucket `dyllu-media`, custom domain `cdn.dyllu.example` (proxied → edge
  cached, free egress).
- Enable Image Transformations on the zone. Storefront requests variants via
  the custom `next/image` loader; originals stay untouched at full resolution.
- Free tier: 10 GB storage, 5,000 unique transformations/mo — expected to
  cover launch catalog; overage $0.50 per 1,000.

### Backups

- Nightly `pg_dump` from the Coolify Postgres service to a private R2 bucket
  (`dyllu-backups`) using Coolify's scheduled S3 backups. Retention: 14 daily.
- R2 media bucket needs no backup pipeline at launch (originals also exist in
  the repo/catalog pipeline), revisit when admin-uploaded media becomes the
  source of truth.

## CI/CD (GitHub Actions)

Both existing workflows lose all Tailscale/SSH/NAS steps.

- **`deploy-backend.yml`** — on push to `main` touching `apps/backend/**`:
  build image → push to GHCR (`:latest` + `:sha`) → `curl` Coolify's deploy
  webhook (`COOLIFY_WEBHOOK_URL` + `COOLIFY_API_TOKEN` secrets) → poll
  `https://api.dyllu.example/health` until green.
- **`deploy-storefront.yml`** — on push to `main` touching
  `apps/storefront/**`: `pnpm install` → `opennextjs-cloudflare build` →
  `wrangler deploy` (secret `CLOUDFLARE_API_TOKEN`, var
  `CLOUDFLARE_ACCOUNT_ID`). On pull requests: `wrangler versions upload` for a
  preview URL posted to the PR.
- Retired secrets: `NAS_*`, `TS_OAUTH_*`. GHCR auth stays (`GITHUB_TOKEN`).

## Migration plan (ordered)

1. **Spike (gate for everything else):** run `opennextjs-cloudflare build`
   locally; check bundle size < 10 MB gzipped; deploy to a `workers.dev`
   preview with R2/DO/D1 caching wired; verify PDP render, cart cookie flow,
   and `/api/revalidate` tag invalidation. If this fails → fall back to
   Approach B (storefront container on the VPS behind Cloudflare CDN); all
   other steps below are unchanged by that fallback.
2. Provision Hetzner CX32 + Coolify; add Postgres/Redis/backend resources;
   run migrations, create admin user, add Moldova region, copy publishable key.
3. Create R2 buckets + custom domain + Image Transformations; point Medusa's
   S3 file module at R2; add the custom `next/image` loader.
4. Storefront production deploy on Workers with real env.
5. Rewrite both GitHub Actions workflows; delete NAS secrets.
6. Cut DNS: apex → Worker route, `api.` → VPS, `cdn.` → R2.
7. Decommission NAS containers and `nas-infra` dyllu entries.

## Costs

| Item | €/mo |
| --- | --- |
| Hetzner CX32 | ~8 |
| Cloudflare Workers paid | ~4.6 ($5) |
| R2 + Transformations + D1 + DO | ~0 at launch volume |
| **Total** | **~€13** |

## Risks

- **Worker bundle > 10 MB** — measured in step 1 before anything is committed;
  fallback is Approach B at zero extra cost.
- **OpenNext edge cases on Next 16.2** (streaming, PPR-adjacent features) —
  the spike exercises the real app, not a hello-world.
- **Single VPS is a SPOF** for API/checkout (storefront + cached pages survive
  an outage). Accepted at this budget; Hetzner snapshots + nightly DB backups
  bound the damage. Revisit (managed Postgres, second node) when revenue
  justifies it.
- **Postgres co-located with backend** — memory pressure under load; CX32 has
  headroom, and the escape hatch (move `DATABASE_URL` to Neon/managed PG) needs
  no code changes.

## Out of scope

- MAIB payment provider implementation (separate spec when API docs are in hand)
- `/build` configurator page, catalog pipeline (existing specs)
- Multi-region/HA topology
