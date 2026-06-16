# DYLLU NAS Deployment Design

## Overview

Deploy the DYLLU Medusa v2 backend and Next.js storefront to the Synology NAS at `inexlab.com`, alongside the existing services (context, trade-forge, n8n, market-data). Public access to `dyllu.inexlab.com` and `api.dyllu.inexlab.com` is provided via a Cloudflare Tunnel — no port forwarding, no router changes. Tailscale-authenticated users (team/client) access all subdomains as before. Every push to `main` triggers an automated deploy including database migrations.

---

## Network Architecture

```
Public users
  → dyllu.inexlab.com / api.dyllu.inexlab.com
    → Cloudflare Edge (TLS terminated, Cloudflare cert)
      → cloudflared container (outbound tunnel, no open ports on NAS)
        → caddy:80 (routes by Host header, Docker proxy network)
          → dyllu-storefront:3000  |  dyllu-backend:9000

Tailscale users (team / client via node share)
  → *.inexlab.com → Tailscale → NAS → Caddy → same containers
```

---

## Subdomains

| Subdomain               | Container                    | Visibility                 |
| ----------------------- | ---------------------------- | -------------------------- |
| `dyllu.inexlab.com`     | `dyllu-storefront` port 3000 | Public (Cloudflare Tunnel) |
| `api.dyllu.inexlab.com` | `dyllu-backend` port 9000    | Public (Cloudflare Tunnel) |

Admin dashboard is at `api.dyllu.inexlab.com/backend` — publicly reachable but protected by Medusa's own authentication. No additional restriction needed.

---

## New Containers

| Container          | Image                                      | Networks            | Memory |
| ------------------ | ------------------------------------------ | ------------------- | ------ |
| `dyllu-storefront` | `ghcr.io/abalmush/dyllu-storefront:latest` | proxy               | 512M   |
| `dyllu-backend`    | `ghcr.io/abalmush/dyllu-backend:latest`    | proxy, postgres-net | 1024M  |
| `dyllu-redis`      | `redis:7-alpine`                           | dyllu-default       | 128M   |
| `cloudflared`      | `cloudflare/cloudflared:latest`            | proxy               | 128M   |

`dyllu-redis` stays on its own default network (only backend needs it). `cloudflared` joins the `proxy` network so it can reach `caddy:80` internally.

### Database

New `medusa` database on the existing `context-postgres` instance. Provisioned idempotently by the backend deploy workflow before first container start:

```sql
CREATE DATABASE medusa;  -- only if not exists
```

No separate Postgres container. Follows the same pattern as `tradeforge` and `n8n`.

---

## Docker Images

### Backend (`apps/backend/Dockerfile`)

Already exists. Standard Node.js multi-stage build. Verify it runs `node_modules/.bin/medusa` correctly at container start — no changes expected.

### Storefront (`apps/storefront/Dockerfile`) — new file

Multi-stage pnpm monorepo build. Key requirements:

- Build context is repo root (not `apps/storefront/`) to include `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json`
- `NEXT_PUBLIC_MEDUSA_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` passed as build args (baked into the JS bundle)
- `output: 'standalone'` must be set in `next.config.ts` (adds ~5MB runtime, eliminates node_modules in the image)
- `outputFileTracingRoot` already set to monorepo root in `next.config.ts` — standalone output path is `apps/storefront/.next/standalone`
- Final image runs `node apps/storefront/server.js`

---

## Production Compose Files

### `apps/backend/docker-compose.prod.yml`

```
dyllu-backend:
  image: ghcr.io/abalmush/dyllu-backend:latest
  container_name: dyllu-backend
  env_file: .env
  depends_on: dyllu-redis (healthy)
  networks: proxy, postgres-net
  memory: 1024M
  healthcheck: curl -f http://localhost:9000/health

dyllu-redis:
  image: redis:7-alpine
  container_name: dyllu-redis
  restart: unless-stopped
  memory: 128M
  healthcheck: redis-cli ping
```

### `apps/storefront/docker-compose.prod.yml`

```
dyllu-storefront:
  image: ghcr.io/abalmush/dyllu-storefront:latest
  container_name: dyllu-storefront
  env_file: .env
  networks: proxy
  memory: 512M
  healthcheck: wget --spider http://localhost:3000
```

---

## CI/CD Pipelines (DYLLU repo)

### `.github/workflows/deploy-backend.yml`

Trigger: push to `main`, paths `apps/backend/**`, `pnpm-lock.yaml`, `.github/workflows/deploy-backend.yml`, `workflow_dispatch`.

Steps:

1. Build image → push `ghcr.io/abalmush/dyllu-backend:latest` + SHA tag
2. Tailscale connect → SSH into NAS
3. **Provision** (all idempotent):
   - `docker network create postgres-net || true`
   - `docker network connect postgres-net context-postgres || true`
   - `docker exec context-postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname='medusa'" | grep -q 1 || docker exec context-postgres psql -U postgres -c "CREATE DATABASE medusa"`
4. Copy `apps/backend/docker-compose.prod.yml` → `~/dyllu-backend/docker-compose.yml`
5. Write `.env` from secrets
6. `docker pull ghcr.io/abalmush/dyllu-backend:latest`
7. `docker compose up -d --force-recreate`
8. **Run migrations**: `docker exec dyllu-backend node_modules/.bin/medusa db:migrate`
   - If this exits non-zero → workflow fails, deploy blocked. Manual fix required.
9. Health check loop (10 retries × 5s)

### `.github/workflows/deploy-storefront.yml`

Trigger: push to `main`, paths `apps/storefront/**`, `pnpm-lock.yaml`, `.github/workflows/deploy-storefront.yml`, `workflow_dispatch`.

Steps:

1. Build image with build args `NEXT_PUBLIC_MEDUSA_URL=https://api.dyllu.inexlab.com` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` → push to GHCR
2. Tailscale connect → SSH into NAS
3. Copy `apps/storefront/docker-compose.prod.yml` → `~/dyllu-storefront/docker-compose.yml`
4. Write `.env` from secrets
5. `docker pull` + `docker compose up -d --force-recreate`
6. Health check loop

---

## Migration Strategy

- Migrations run as step 8 of the backend deploy — after new container starts, before the workflow is marked successful
- Medusa uses Postgres transactions internally; a failed migration rolls back cleanly
- A failed migration fails the GitHub Actions deploy visibly — no silent partial states
- Fix the migration code, push again — no manual NAS intervention
- Schema changes must be backwards-compatible with the running storefront until the storefront deploy completes (deploy backend first, then storefront)

---

## Infrastructure Changes (nas-infra repo)

### `caddy/Caddyfile` — two new routes

```
@dyllu host dyllu.inexlab.com
handle @dyllu {
    reverse_proxy dyllu-storefront:3000
}

@dyllu-api host api.dyllu.inexlab.com
handle @dyllu-api {
    reverse_proxy dyllu-backend:9000
}
```

### `cloudflared/docker-compose.yml` — new file

```
cloudflared:
  image: cloudflare/cloudflared:latest
  container_name: cloudflared
  restart: unless-stopped
  command: tunnel --no-autoupdate run
  environment:
    - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
  networks:
    - proxy
  memory: 128M
  healthcheck: wget --spider http://localhost:2000/metrics  (cloudflared metrics endpoint)
```

### `nas-infra/.github/workflows/deploy.yml` — two new steps

After the Caddy deploy step:

- **Deploy cloudflared**: copy compose file, write `.env` with `CLOUDFLARE_TUNNEL_TOKEN`, `docker compose up -d --force-recreate`
- **cloudflared health check**

---

## Secrets

### DYLLU repo (`abalmush/dyllu`)

| Secret                               | Source                                       |
| ------------------------------------ | -------------------------------------------- |
| `NAS_HOST`                           | SSH config: `colonitahome.tail2bef8a.ts.net` |
| `NAS_PORT`                           | SSH config: `2222`                           |
| `NAS_USER`                           | SSH config: `deploy`                         |
| `NAS_SSH_KEY`                        | `~/.ssh/synology-deploy`                     |
| `POSTGRES_PASSWORD`                  | Same value as other repos                    |
| `TS_OAUTH_CLIENT_ID`                 | Tailscale admin panel                        |
| `TS_OAUTH_CLIENT_SECRET`             | Tailscale admin panel                        |
| `MEDUSA_JWT_SECRET`                  | Generated (random 64-char hex)               |
| `MEDUSA_COOKIE_SECRET`               | Generated (random 64-char hex)               |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Set after first seed run                     |

### nas-infra repo (`abalmush/nas-infra`)

| Secret                    | Source                                      |
| ------------------------- | ------------------------------------------- |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare dashboard → Zero Trust → Tunnels |

---

## One-Time Manual Steps

These are done once and never again:

1. **Create Cloudflare Tunnel** in Cloudflare dashboard (Zero Trust → Access → Tunnels → Create tunnel) → copy the tunnel token → add as `CLOUDFLARE_TUNNEL_TOKEN` secret in nas-infra repo
2. **Configure tunnel hostnames** in Cloudflare dashboard: `dyllu.inexlab.com` → `http://caddy:80`, `api.dyllu.inexlab.com` → `http://caddy:80`
3. **DNS CNAMEs** auto-created by Cloudflare when you configure tunnel hostnames (if `inexlab.com` is on Cloudflare — it is)
4. **Add Tailscale OAuth credentials** to DYLLU repo secrets
5. **After first deploy**: copy publishable API key from Medusa admin → add as `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` secret → re-deploy storefront

---

## Deploy Order (first time)

1. Merge nas-infra changes → Caddy + cloudflared deploy automatically
2. Merge DYLLU backend changes → provisions DB, starts Medusa, runs seed + migrations
3. Grab publishable API key from admin → add secret
4. Merge DYLLU storefront changes → storefront deploys with correct key

---

## What Is Not Covered

- MAIB payment provider (deferred, per existing plan)
- Vercel deployment (replaced by NAS for now)
- Cloudflare WAF / rate limiting (can be added in Cloudflare dashboard later)
- Redis persistence (AOF) for dyllu-redis — not needed until cart abandonment recovery matters
