# Deploying the Medusa backend (Hetzner + Coolify)

The backend is deployed as a single Docker container on a Hetzner VPS managed
by [Coolify](https://coolify.io). The storefront deploys independently to
Vercel and calls this backend over HTTPS.

## Provisioning (one-time)

1. **Hetzner server** — create a **CX32** (4 vCPU / 8 GB / 80 GB, ~€8/mo) in
   Nuremberg or Falkenstein. Ubuntu 22.04 LTS. Add your SSH key.
2. **Install Coolify** on the server:
   ```bash
   curl -fsSL https://cdn.coolify.io/coolify/install.sh | sudo bash
   ```
   Takes ~10 minutes. Coolify UI becomes available at `http://<server-ip>:8000`.
3. **DNS** — point a subdomain like `api.<yourdomain>` at the server's IPv4.
   Coolify auto-issues Let's Encrypt SSL once DNS resolves.

## Coolify services (one-time)

In the Coolify project for DYLLU, add these dependencies **before** the app:

- **Postgres** — Coolify's built-in service template. Image `postgres:16`. Note
  the internal connection URL Coolify generates.
- **Redis** — Coolify's template with `redis:7`. Note its URL too.

Alternatively, use **Neon** (free Postgres) and **Upstash** (free Redis) if
you don't want Coolify-managed data services. Just plug the URLs into env.

## The app resource

**Add Resource → Application → Docker / Dockerfile.**

| Setting           | Value                        |
| ----------------- | ---------------------------- |
| Source            | This Git repo, branch `main` |
| Build context     | `/` (repo root)              |
| Dockerfile path   | `apps/backend/Dockerfile`    |
| Exposed port      | `9000`                       |
| Domain            | `api.<yourdomain>`           |
| Health check path | `/health`                    |

**Environment variables** — copy from `apps/backend/.env.production.example`
and fill real values. Critical ones:

- `DATABASE_URL` (from Coolify's Postgres service)
- `REDIS_URL` (from Coolify's Redis service)
- `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` — production domains
- `JWT_SECRET`, `COOKIE_SECRET` — `openssl rand -hex 64`
- `S3_*` — Cloudflare R2 bucket + API token (free tier: 10 GB/mo)

## Object storage (Cloudflare R2)

1. Create a Cloudflare account + R2 bucket.
2. **API Tokens → Create** with `Object Read & Write` scoped to the bucket.
3. Optional: bind a custom domain like `cdn.<yourdomain>` to the bucket for
   nicer image URLs (set it as `S3_FILE_URL`).

## First-deploy bootstrapping

After the Coolify deploy goes green:

1. Open a terminal on the container (Coolify UI: **Commands → Execute**) or
   SSH to the server and `docker exec` into the container.
2. Run migrations:
   ```bash
   pnpm db:migrate
   ```
   The bundled `src/migration-scripts/initial-data-seed.ts` runs automatically
   and creates the Default Sales Channel, a Publishable API Key, and a sample
   region / products.
3. Create an admin user:
   ```bash
   pnpm db:create-user -e admin@yourdomain.tld -p <strong-password>
   ```
4. Visit `https://api.<yourdomain>/backend`, log in, and copy the Default
   Publishable API Key into the storefront's Vercel env as
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

## Storefront env (Vercel — separate deploy)

In the Vercel project for `@dyllu/storefront`, set:

| Key                                  | Value                                           |
| ------------------------------------ | ----------------------------------------------- |
| `MEDUSA_BACKEND_URL`                 | `https://api.<yourdomain>`                      |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | from the backend admin                          |
| `NEXT_PUBLIC_BASE_URL`               | `https://<yourdomain>`                          |
| `NEXT_PUBLIC_DEFAULT_REGION`         | country code that exists in your Medusa regions |
| `REVALIDATE_SECRET`                  | `openssl rand -hex 32`                          |

## Regenerating regions for your market

The initial seed creates a **Europe** region only. For Moldova or other
markets, use the admin UI (`/backend` → Regions) or the Admin API to add
them before going live. Update `NEXT_PUBLIC_DEFAULT_REGION` in Vercel
accordingly.

## Rollback

Coolify keeps previous deployments; redeploy an earlier commit to roll the
app back. DB schema changes don't auto-rollback — write and commit a down
migration if the change is incompatible.

## Resource sizing

- **CX32** ($9/mo) is enough for MVP traffic + Postgres + Redis co-located.
- Scale to **CX42** ($17/mo) or separate the DB to Neon when you see sustained
  CPU pressure on the combined box.
