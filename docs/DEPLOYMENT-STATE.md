# DYLLU Production Deployment — Current State

Living handoff/status doc. Companion to the design spec
(`docs/superpowers/specs/2026-07-10-production-deployment-design.md`) and the
execution plan (`docs/superpowers/plans/2026-07-10-production-deployment.md`).
Last updated: 2026-07-10.

> All deployment work currently lives on branch
> `feat/catalog-master-consolidation` and is **not pushed to any remote**. It is
> tangled with unrelated in-progress storefront/catalog work. `main` has none of
> it. See "Known gaps" below.

## Architecture

- **Storefront** — Next.js 16 via `@opennextjs/cloudflare` on **Cloudflare
  Workers** (`dyllu-storefront`). Cache: R2 (`dyllu-next-cache`), D1 tag cache
  (`dyllu-tag-cache`, id `8bf378b6-0d2f-4755-b5b7-83afd2dd4a6b`), DO queue.
- **Backend** — Medusa v2.14 on **Hetzner CX32 + Coolify**, Postgres 16 + Redis
  7 as Coolify services. Image `ghcr.io/abalmush/dyllu-backend`.
- **Images** — Cloudflare R2 (`dyllu-media`) + Image Transformations, custom
  domain `cdn.dyllu.md` (not created yet).
- **Edge** — everything eventually proxied through Cloudflare, SSL mode
  **Full (strict)**.

## Live endpoints & infra

| Thing            | Value                                                               |
| ---------------- | ------------------------------------------------------------------- |
| VPS (Hetzner) IP | `138.199.235.8`                                                     |
| Coolify UI       | `http://138.199.235.8:8000`                                         |
| Backend admin    | `https://api.dyllu.md/backend` (live, real HTTPS)                   |
| Backend temp URL | `http(s)://hdte0fa76dlun3pgv9avcyjk.138.199.235.8.sslip.io/backend` |
| Storefront       | `*.workers.dev` (custom domain not wired yet)                       |

## DNS (Cloudflare zone `dyllu.md`)

- Nameservers delegated to Cloudflare: `galilea.ns.cloudflare.com`,
  `malcolm.ns.cloudflare.com` (registry whois lags; resolvers already use CF).
- `api` → A `138.199.235.8`, currently **DNS-only (grey)**. TODO: flip to
  **Proxied (orange)** + SSL/TLS **Full (strict)** once login is confirmed.
- Apex `dyllu.md`, `www`, `cdn` — **no records yet**.

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
| 6 R2 media + S3 file module                  | code done (`6169621`); R2 bucket/token/cdn domain + Coolify S3 env pending |
| 7 Storefront custom domain routing           | NOT done (no `routes` in `wrangler.jsonc`)                                 |
| 8 `deploy-backend.yml` CI                    | done (`52831cc`)                                                           |
| 9 `deploy-storefront.yml` CI                 | done (`c0c59fc`)                                                           |
| 10 Decommission NAS                          | NOT done                                                                   |
| Redis event bus + workflow engine (prod fix) | done (`f2d881e`)                                                           |

## Open items / next steps

1. **Log into admin** at `https://api.dyllu.md/backend`; create the **Moldova
   region** (currency MDL, country Moldova, payment provider **Manual**); copy
   the **Publishable API Key**.
2. Point the storefront at `api.dyllu.md` using that key; do **Task 7** (add the
   custom-domain `routes` block to `wrangler.jsonc`, redeploy) so `dyllu.md`
   serves the storefront.
3. Cloudflare: flip `api` to Proxied (orange) + SSL Full (strict); add apex/www
   (via `wrangler` custom_domain) and `cdn` (via R2 custom domain).
4. **Task 6 remainder**: create R2 bucket `dyllu-media` + scoped token + bind
   `cdn.dyllu.md`; add `S3_*` env in Coolify; redeploy; verify an admin image
   upload lands in R2 with a `cdn.dyllu.md` URL.
5. Nightly DB backups to R2 (`dyllu-backups`) — plan Task 5 Step 9.
6. **Task 10**: retire NAS containers/DNS; rewrite the stale `apps/backend/DEPLOY.md`;
   update `CLAUDE.md` (backend is deployed; storefront is on Cloudflare, not Vercel).

## Known gaps / risks

- **Nothing pushed to remote.** All deployment commits are local on
  `feat/catalog-master-consolidation`.
- **Backend image-build gap.** `deploy-backend.yml` only fires on push to
  `main`, but the work isn't on `main` — so the running image was built
  out-of-band. To ship backend changes: either land the work on `main` (fires
  CI → GHCR → Coolify webhook) or build+push the image manually and redeploy in
  Coolify.
- **`apps/backend/DEPLOY.md` is stale** — still describes the old Vercel +
  Coolify git-build setup. Rewrite in Task 10.
- **Branch hygiene.** Deployment commits are mixed with unrelated
  storefront/catalog changes in the working tree.
