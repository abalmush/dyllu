# DYLLU Production Deployment — Current State

Living handoff/status doc. Companion to the design spec
(`docs/superpowers/specs/2026-07-10-production-deployment-design.md`) and the
execution plan (`docs/superpowers/plans/2026-07-10-production-deployment.md`).
Last updated: 2026-07-10.

> All deployment work lives on branch `feat/catalog-master-consolidation` (now
> pushed to origin), **not on `main`**. It is tangled with unrelated in-progress
> storefront/catalog work in the working tree. See "Known gaps" below.

## Architecture

- **Storefront** — Next.js 16 via `@opennextjs/cloudflare` on **Cloudflare
  Workers** (`dyllu-storefront`). Cache: R2 (`dyllu-next-cache`), D1 tag cache
  (`dyllu-tag-cache`, id `8bf378b6-0d2f-4755-b5b7-83afd2dd4a6b`), DO queue.
- **Backend** — Medusa v2.14 on **Hetzner CX32 + Coolify**, Postgres 16 + Redis
  7 as Coolify services. Image `ghcr.io/abalmush/dyllu-backend`.
- **Images** — Cloudflare R2 (`dyllu-media`) + Image Transformations, custom
  domain `cdn.dyllu.md` (live).
- **Edge** — everything eventually proxied through Cloudflare, SSL mode
  **Full (strict)**.

## Live endpoints & infra

| Thing            | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| VPS (Hetzner) IP | `138.199.235.8`                                                     |
| Coolify UI       | `http://138.199.235.8:8000`                                         |
| Backend admin    | `https://api.dyllu.md/backend` (live, real HTTPS)                   |
| Backend temp URL | `http(s)://hdte0fa76dlun3pgv9avcyjk.138.199.235.8.sslip.io/backend` |
| Storefront       | `https://dyllu.md` + `www.dyllu.md` (live via Cloudflare Workers)   |

## DNS (Cloudflare zone `dyllu.md`)

- Nameservers delegated to Cloudflare: `galilea.ns.cloudflare.com`,
  `malcolm.ns.cloudflare.com` (registry whois lags; resolvers already use CF).
- `api` → A `138.199.235.8`, currently **DNS-only (grey)**. TODO: flip to
  **Proxied (orange)** + SSL/TLS **Full (strict)** (login confirmed working).
- Apex `dyllu.md` + `www` — auto-created by the Worker custom-domain deploy,
  proxied through Cloudflare (resolve to `104.21.42.200` / `172.67.210.12`).
- `cdn` → R2 custom domain bound to bucket `dyllu-media`, proxied; serving
  uploads (verified `https://cdn.dyllu.md/<object>` → 200 image/png).

## Deploy mechanisms

**Backend** — Coolify pulls the prebuilt image `ghcr.io/abalmush/dyllu-backend:latest`
(a Coolify _Docker Image_ resource, not a git build). TLS terminated by Coolify's
Traefik (Let's Encrypt). Container CMD runs `medusa db:migrate && medusa start`.

**Storefront** — `.github/workflows/deploy-storefront.yml`: OpenNext build →
`wrangler` deploy. `.github/workflows/deploy-backend.yml`: build+push GHCR image →
Coolify webhook → health check.

## Task status (vs. the execution plan)

| Task                                         | Status                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| 1 Storefront Workers cleanup                 | done (`6d5c2ab`)                                                           |
| 2 OpenNext adapter + bundle gate             | done (`09605e6`)                                                           |
| 3 OpenNext caching + spike (GO/Approach A)   | done (`5ed3f98`)                                                           |
| 4 Custom CF image loader                     | done (`e42bb4b`)                                                           |
| 5 Hetzner + Coolify backend                  | effectively done (running; manual, no commit)                              |
| 6 R2 media + S3 file module                  | **done** — bucket + cdn.dyllu.md + S3 env live; admin upload → R2 verified |
| 7 Storefront custom domain routing           | done (`e37eb6f`); deployed live to dyllu.md + www (version `8fc6aa7e`)     |
| 8 `deploy-backend.yml` CI                    | done (`52831cc`)                                                           |
| 9 `deploy-storefront.yml` CI                 | done (`c0c59fc`)                                                           |
| 10 Decommission NAS                          | NOT done                                                                   |
| Redis event bus + workflow engine (prod fix) | done (`f2d881e`)                                                           |

## Open items / next steps

1. ~~Log in, create Moldova region, copy publishable key.~~ **Done** — region
   `reg_01KX6GW84R9BQFM6NGG6EY5K7R` (MDL/md); key `pk_f847…1642`.
2. ~~Task 7: storefront custom-domain routing + deploy.~~ **Done** — live at
   `https://dyllu.md`.
3. **Populate the catalog** (separate workstream, `feat/catalog-master-consolidation`):
   backend has 88 categories but **0 products** in the sales channel — products
   must be created/imported, given MDL prices, published, and attached to the
   storefront's sales channel before anything shows on the PLP.
4. ~~Task 6: R2 media + S3 file module.~~ **Done** — admin uploads land in
   `dyllu-media` and serve from `https://cdn.dyllu.md/`.
5. **Populate the catalog** — the real blocker to a usable store (see item 3).
6. Cloudflare: flip `api` to Proxied (orange) + SSL Full (strict).
7. Set the storefront Worker `REVALIDATE_SECRET` secret (match backend) via
   `wrangler secret put` so on-demand revalidation works.
8. **Close the CI gap**: set `COOLIFY_WEBHOOK_URL` + `COOLIFY_API_TOKEN` repo
   secrets so `deploy-backend.yml` can auto-redeploy (currently the deploy step
   fails and redeploy is manual in Coolify).
9. Nightly DB backups to R2 (`dyllu-backups`) — plan Task 5 Step 9.
10. **Task 10**: retire NAS containers/DNS; rewrite the stale `apps/backend/DEPLOY.md`;
    update `CLAUDE.md` (backend is deployed; storefront is on Cloudflare, not Vercel).

## Known gaps / risks

- **Branch pushed, not on `main`.** `feat/catalog-master-consolidation` is now
  on origin, but `main` still has none of the deployment work.
- **Backend image-build gap (partially closed).** `deploy-backend.yml` builds +
  pushes the GHCR image fine when dispatched (`gh workflow run deploy-backend.yml
--ref feat/catalog-master-consolidation`), but its **Coolify deploy step fails**
  because `COOLIFY_WEBHOOK_URL` / `COOLIFY_API_TOKEN` repo secrets are unset — so
  after a build you must **Redeploy manually in Coolify**. Set those secrets to
  make it fully automatic. `main`-push auto-deploy still won't work until the
  work lands on `main`.
- **`apps/backend/DEPLOY.md` is stale** — still describes the old Vercel +
  Coolify git-build setup. Rewrite in Task 10.
- **Branch hygiene.** Deployment commits are mixed with unrelated
  storefront/catalog changes in the working tree.
