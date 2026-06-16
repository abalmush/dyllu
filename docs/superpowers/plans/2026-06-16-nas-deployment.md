# NAS Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the DYLLU Medusa v2 backend and Next.js storefront to the Synology NAS with automated CI/CD, database migrations on every deploy, and public access via Cloudflare Tunnel.

**Architecture:** Two GitHub Actions workflows in the DYLLU repo build Docker images and push to GHCR, then SSH into the NAS via Tailscale to pull and restart containers. The nas-infra repo gains a `cloudflared` service that creates an outbound tunnel to Cloudflare, making `dyllu.inexlab.com` and `medusa.inexlab.com` publicly accessible without opening any firewall ports.

**Tech Stack:** Docker, GitHub Actions, Cloudflare Tunnel (cloudflared), Caddy (existing reverse proxy), pnpm monorepo, Next.js 16 standalone output, Medusa v2.14

---

## Files

### DYLLU repo (`~/Projects/DYLLU`)

| Action | Path                                      | Purpose                                           |
| ------ | ----------------------------------------- | ------------------------------------------------- |
| Modify | `apps/storefront/src/lib/config.ts`       | Add `NEXT_PUBLIC_MEDUSA_URL` client-side fallback |
| Modify | `apps/storefront/next.config.ts`          | Add `output: 'standalone'`                        |
| Create | `apps/storefront/Dockerfile`              | pnpm monorepo Next.js standalone build            |
| Create | `apps/backend/docker-compose.prod.yml`    | Medusa + Redis production compose                 |
| Create | `apps/storefront/docker-compose.prod.yml` | Storefront production compose                     |
| Create | `.github/workflows/deploy-backend.yml`    | Build + deploy + migrate backend                  |
| Create | `.github/workflows/deploy-storefront.yml` | Build + deploy storefront                         |

### nas-infra repo (`~/Projects/My/nas-infra`)

| Action | Path                             | Purpose                                                 |
| ------ | -------------------------------- | ------------------------------------------------------- |
| Modify | `caddy/Caddyfile`                | Add `dyllu.inexlab.com` and `medusa.inexlab.com` routes |
| Create | `cloudflared/docker-compose.yml` | Cloudflare Tunnel connector                             |
| Modify | `.github/workflows/deploy.yml`   | Add cloudflared deploy + health check steps             |

---

## Task 1: Fix storefront SDK config for production

The SDK's `baseUrl` reads `MEDUSA_BACKEND_URL` — a server-only env var. In the browser this is undefined, so client-side cart/checkout calls fall back to `http://localhost:9000` and fail in production. Fix: prefer the private internal URL server-side, fall back to the public `NEXT_PUBLIC_MEDUSA_URL` client-side.

**Files:**

- Modify: `apps/storefront/src/lib/config.ts`

- [ ] **Update config.ts**

Replace the current URL resolution logic:

```typescript
import { getLocaleHeader } from "@lib/util/get-locale-header";
import Medusa, { FetchArgs, FetchInput } from "@medusajs/js-sdk";

const MEDUSA_BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_URL ||
  "http://localhost:9000";

export const sdk = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
});

const originalFetch = sdk.client.fetch.bind(sdk.client);

sdk.client.fetch = async <T>(
  input: FetchInput,
  init?: FetchArgs
): Promise<T> => {
  const headers = init?.headers ?? {};
  let localeHeader: Record<string, string | null> | undefined;
  try {
    localeHeader = await getLocaleHeader();
    headers["x-medusa-locale"] ??= localeHeader["x-medusa-locale"];
  } catch {}

  const newHeaders = {
    ...localeHeader,
    ...headers,
  };
  init = {
    ...init,
    headers: newHeaders,
  };
  return originalFetch(input, init);
};
```

On the NAS:

- Server-side: `MEDUSA_BACKEND_URL=http://dyllu-backend:9000` (internal Docker, set at runtime in `.env`)
- Browser: `MEDUSA_BACKEND_URL` is undefined → uses `NEXT_PUBLIC_MEDUSA_URL=https://medusa.inexlab.com` (baked at build time)

- [ ] **Verify local dev still works**

```bash
pnpm -F @dyllu/storefront dev
```

Expected: storefront starts at http://localhost:4000, no SDK errors in console.

---

## Task 2: Add `output: 'standalone'` to next.config.ts

Required for Docker — produces a self-contained `server.js` with all traced dependencies included, eliminating the need to copy `node_modules` into the image.

**Files:**

- Modify: `apps/storefront/next.config.ts`

- [ ] **Add standalone output**

```typescript
import path from "node:path";
import type { NextConfig } from "next";
import checkEnvVariables from "./check-env-variables.js";

checkEnvVariables();

const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME;
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME;

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "ingcomoldova.md" },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https" as const,
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
};

export default nextConfig;
```

- [ ] **Verify build produces standalone output**

```bash
cd ~/Projects/DYLLU
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=placeholder pnpm -F @dyllu/storefront build
```

Expected: `apps/storefront/.next/standalone/` directory exists and contains `server.js`.

---

## Task 3: Create storefront Dockerfile

Multi-stage pnpm monorepo build. Build context must be the repo root so `pnpm-workspace.yaml` and `pnpm-lock.yaml` are available. `NEXT_PUBLIC_*` vars are baked into the JS bundle at build time via Docker build args.

**Files:**

- Create: `apps/storefront/Dockerfile`

- [ ] **Create Dockerfile**

```dockerfile
# syntax=docker/dockerfile:1.7
# Build context: repo root (same as apps/backend/Dockerfile)

FROM node:20-alpine AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY apps/storefront/package.json apps/storefront/package.json

RUN pnpm install --frozen-lockfile --filter=@dyllu/storefront...

COPY apps/storefront apps/storefront

ARG NEXT_PUBLIC_MEDUSA_URL=https://medusa.inexlab.com
ARG NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_MEDUSA_URL=$NEXT_PUBLIC_MEDUSA_URL
ENV NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN pnpm --filter=@dyllu/storefront build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /repo/apps/storefront/public ./public
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/storefront/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000 >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
```

- [ ] **Test build locally**

```bash
cd ~/Projects/DYLLU
docker build -f apps/storefront/Dockerfile \
  --build-arg NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=placeholder \
  -t dyllu-storefront:test .
```

Expected: build completes, image is ~200-400MB. If `server.js not found` error, the standalone path is nested — check with `docker run --rm dyllu-storefront:test find /app -name server.js`.

- [ ] **If server.js is nested, fix the CMD**

If `find` shows `/app/apps/storefront/server.js` instead of `/app/server.js`:

```dockerfile
CMD ["node", "apps/storefront/server.js"]
```

Update the Dockerfile accordingly.

- [ ] **Verify container starts**

```bash
docker run --rm -p 3000:3000 \
  -e NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=placeholder \
  dyllu-storefront:test
```

Expected: server starts on port 3000. GET http://localhost:3000 returns HTML (may show API errors since backend isn't running — that's fine).

- [ ] **Clean up test image**

```bash
docker rmi dyllu-storefront:test
```

---

## Task 4: Create backend docker-compose.prod.yml

Backend needs Redis (for Medusa jobs/events) and two external networks: `proxy` (for Caddy routing) and `postgres-net` (for `context-postgres`). Redis stays on its own default network — only the backend talks to it.

**Port note:** `dyllu-backend:9000` and `dyllu-redis:6379` are internal Docker ports only — no host binding. No conflict with existing containers.

**Files:**

- Create: `apps/backend/docker-compose.prod.yml`

- [ ] **Create compose file**

```yaml
services:
  dyllu-backend:
    image: ghcr.io/abalmush/dyllu-backend:latest
    container_name: dyllu-backend
    restart: unless-stopped
    env_file: .env
    depends_on:
      dyllu-redis:
        condition: service_healthy
    networks:
      - default
      - proxy
      - postgres-net
    deploy:
      resources:
        limits:
          memory: 1024M
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:9000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  dyllu-redis:
    image: redis:7-alpine
    container_name: dyllu-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - dyllu-redis-data:/data
    deploy:
      resources:
        limits:
          memory: 128M
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  dyllu-redis-data:

networks:
  proxy:
    external: true
  postgres-net:
    external: true
```

---

## Task 5: Create storefront docker-compose.prod.yml

Storefront only needs the `proxy` network — it talks to the backend via the public URL from the browser, and via `http://dyllu-backend:9000` server-side (set in runtime `.env`). But `dyllu-backend` is on the `proxy` network, so they can reach each other there.

**Port note:** `dyllu-storefront:3000` is internal Docker only. No conflict with `context-app:3000` or `market-data-frontend:3000` (different containers, different Docker network namespaces).

**Files:**

- Create: `apps/storefront/docker-compose.prod.yml`

- [ ] **Create compose file**

```yaml
services:
  dyllu-storefront:
    image: ghcr.io/abalmush/dyllu-storefront:latest
    container_name: dyllu-storefront
    restart: unless-stopped
    env_file: .env
    networks:
      - proxy
    deploy:
      resources:
        limits:
          memory: 512M
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:3000",
        ]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s

networks:
  proxy:
    external: true
```

---

## Task 6: Create deploy-backend.yml workflow

This workflow: builds the Docker image, SSHs into NAS via Tailscale, idempotently provisions the `medusa` database on `context-postgres`, deploys the container, runs migrations, and health-checks.

**Files:**

- Create: `.github/workflows/deploy-backend.yml`

- [ ] **Create workflow file**

```yaml
name: Deploy Backend to NAS

on:
  push:
    branches: [main]
    paths:
      - "apps/backend/**"
      - "pnpm-lock.yaml"
      - ".github/workflows/deploy-backend.yml"
  workflow_dispatch:

concurrency:
  group: deploy-dyllu-backend
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: abalmush/dyllu-backend
  DOCKER_PATH: /volume1/@appstore/ContainerManager/usr/bin

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/backend/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64

  deploy:
    needs: build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Connect to Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_CLIENT_SECRET }}
          tags: tag:ci

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.NAS_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          echo "Host *" > ~/.ssh/config
          echo "  StrictHostKeyChecking no" >> ~/.ssh/config
          echo "  UserKnownHostsFile /dev/null" >> ~/.ssh/config
          chmod 600 ~/.ssh/config

      - name: Provision database
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} << 'ENDSSH'
          export PATH=$PATH:${{ env.DOCKER_PATH }}
          docker network create postgres-net 2>/dev/null || true
          docker network connect postgres-net context-postgres 2>/dev/null || true
          docker exec context-postgres psql -U postgres -tc \
            "SELECT 1 FROM pg_database WHERE datname='medusa'" | grep -q 1 || \
          docker exec context-postgres psql -U postgres -c "CREATE DATABASE medusa"
          ENDSSH

      - name: Copy compose file
        run: |
          SSH="ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }}"
          $SSH "mkdir -p ~/dyllu-backend"
          cat apps/backend/docker-compose.prod.yml | $SSH "cat > ~/dyllu-backend/docker-compose.yml"

      - name: Write environment file
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
            "cat > ~/dyllu-backend/.env << 'EOF'
          DATABASE_URL=postgresql://postgres:${{ secrets.POSTGRES_PASSWORD }}@context-postgres:5432/medusa
          REDIS_URL=redis://dyllu-redis:6379
          STORE_CORS=https://dyllu.inexlab.com
          ADMIN_CORS=https://medusa.inexlab.com
          AUTH_CORS=https://dyllu.inexlab.com,https://medusa.inexlab.com
          JWT_SECRET=${{ secrets.MEDUSA_JWT_SECRET }}
          COOKIE_SECRET=${{ secrets.MEDUSA_COOKIE_SECRET }}
          STOREFRONT_URL=https://dyllu.inexlab.com
          REVALIDATE_SECRET=${{ secrets.MEDUSA_REVALIDATE_SECRET }}
          NODE_ENV=production
          EOF"

      - name: Deploy
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} << ENDSSH
          export PATH=\$PATH:${{ env.DOCKER_PATH }}
          cd ~/dyllu-backend
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker pull ghcr.io/${{ env.IMAGE_NAME }}:latest
          docker compose up -d --force-recreate
          docker image prune -f
          ENDSSH

      - name: Run migrations
        run: |
          echo "Waiting for backend to be ready..."
          sleep 15
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
            "export PATH=\$PATH:${{ env.DOCKER_PATH }} && \
             docker exec dyllu-backend sh -c 'node_modules/.bin/medusa db:migrate'"

      - name: Health check
        run: |
          for i in $(seq 1 10); do
            if ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
              ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
              "export PATH=\$PATH:${{ env.DOCKER_PATH }} && \
               docker exec dyllu-backend wget -qO- http://localhost:9000/health"; then
              echo "Backend healthy"
              exit 0
            fi
            echo "Attempt $i/10 — waiting..."
            sleep 5
          done
          echo "Health check failed"
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
            "export PATH=\$PATH:${{ env.DOCKER_PATH }} && docker logs dyllu-backend --tail 50"
          exit 1

      - name: Cleanup SSH
        if: always()
        run: rm -f ~/.ssh/deploy_key
```

---

## Task 7: Create deploy-storefront.yml workflow

Builds the storefront image with `NEXT_PUBLIC_MEDUSA_URL` and `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` baked in as build args, then deploys to NAS.

**Important:** This workflow will fail on first run until `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is set as a secret. Set it after the first successful backend deploy + seed (see Task 9).

**Files:**

- Create: `.github/workflows/deploy-storefront.yml`

- [ ] **Create workflow file**

```yaml
name: Deploy Storefront to NAS

on:
  push:
    branches: [main]
    paths:
      - "apps/storefront/**"
      - "pnpm-lock.yaml"
      - ".github/workflows/deploy-storefront.yml"
  workflow_dispatch:

concurrency:
  group: deploy-dyllu-storefront
  cancel-in-progress: true

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: abalmush/dyllu-storefront
  DOCKER_PATH: /volume1/@appstore/ContainerManager/usr/bin

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/storefront/Dockerfile
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          build-args: |
            NEXT_PUBLIC_MEDUSA_URL=https://medusa.inexlab.com
            NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=${{ secrets.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          platforms: linux/amd64

  deploy:
    needs: build
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Connect to Tailscale
        uses: tailscale/github-action@v3
        with:
          oauth-client-id: ${{ secrets.TS_OAUTH_CLIENT_ID }}
          oauth-secret: ${{ secrets.TS_OAUTH_CLIENT_SECRET }}
          tags: tag:ci

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.NAS_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          echo "Host *" > ~/.ssh/config
          echo "  StrictHostKeyChecking no" >> ~/.ssh/config
          echo "  UserKnownHostsFile /dev/null" >> ~/.ssh/config
          chmod 600 ~/.ssh/config

      - name: Copy compose file
        run: |
          SSH="ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }}"
          $SSH "mkdir -p ~/dyllu-storefront"
          cat apps/storefront/docker-compose.prod.yml | $SSH "cat > ~/dyllu-storefront/docker-compose.yml"

      - name: Write environment file
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
            "cat > ~/dyllu-storefront/.env << 'EOF'
          MEDUSA_BACKEND_URL=http://dyllu-backend:9000
          REVALIDATE_SECRET=${{ secrets.MEDUSA_REVALIDATE_SECRET }}
          EOF"

      - name: Deploy
        run: |
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} << ENDSSH
          export PATH=\$PATH:${{ env.DOCKER_PATH }}
          cd ~/dyllu-storefront
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker pull ghcr.io/${{ env.IMAGE_NAME }}:latest
          docker compose up -d --force-recreate
          docker image prune -f
          ENDSSH

      - name: Health check
        run: |
          for i in $(seq 1 10); do
            if ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
              ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
              "export PATH=\$PATH:${{ env.DOCKER_PATH }} && \
               docker exec dyllu-storefront wget -qO- http://localhost:3000"; then
              echo "Storefront healthy"
              exit 0
            fi
            echo "Attempt $i/10 — waiting..."
            sleep 5
          done
          echo "Health check failed"
          ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
            ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
            "export PATH=\$PATH:${{ env.DOCKER_PATH }} && docker logs dyllu-storefront --tail 50"
          exit 1

      - name: Cleanup SSH
        if: always()
        run: rm -f ~/.ssh/deploy_key
```

---

## Task 8: Set GitHub secrets on abalmush/dyllu

Set all secrets that are derivable right now. `TS_OAUTH_CLIENT_ID` and `TS_OAUTH_CLIENT_SECRET` must be provided manually by the user (Tailscale admin panel → Settings → OAuth clients). `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is set after first backend deploy.

**Files:** none — uses `gh` CLI

- [ ] **Switch to abalmush GitHub account**

```bash
gh auth switch --user abalmush
```

Expected: `Switched active account for github.com to abalmush`

- [ ] **Set infra secrets (values known from local config)**

```bash
gh secret set NAS_HOST --body "colonitahome.tail2bef8a.ts.net" --repo abalmush/dyllu
gh secret set NAS_PORT --body "2222" --repo abalmush/dyllu
gh secret set NAS_USER --body "deploy" --repo abalmush/dyllu
gh secret set NAS_SSH_KEY < ~/.ssh/synology-deploy --repo abalmush/dyllu
gh secret set POSTGRES_PASSWORD --body "ctx-pg-S3cur3-2026" --repo abalmush/dyllu
```

- [ ] **Generate and set Medusa secrets**

```bash
gh secret set MEDUSA_JWT_SECRET \
  --body "$(openssl rand -hex 32)" \
  --repo abalmush/dyllu

gh secret set MEDUSA_COOKIE_SECRET \
  --body "$(openssl rand -hex 32)" \
  --repo abalmush/dyllu

gh secret set MEDUSA_REVALIDATE_SECRET \
  --body "$(openssl rand -hex 32)" \
  --repo abalmush/dyllu
```

- [ ] **Verify all secrets are set (except Tailscale + publishable key)**

```bash
gh secret list --repo abalmush/dyllu
```

Expected output includes: `NAS_HOST`, `NAS_PORT`, `NAS_USER`, `NAS_SSH_KEY`, `POSTGRES_PASSWORD`, `MEDUSA_JWT_SECRET`, `MEDUSA_COOKIE_SECRET`, `MEDUSA_REVALIDATE_SECRET`

- [ ] **Set Tailscale OAuth credentials (user provides values)**

```bash
gh secret set TS_OAUTH_CLIENT_ID --body "<value from Tailscale admin>" --repo abalmush/dyllu
gh secret set TS_OAUTH_CLIENT_SECRET --body "<value from Tailscale admin>" --repo abalmush/dyllu
```

Get values from: Tailscale admin panel → Settings → OAuth clients → Create client (tag: `tag:ci`, scope: `devices:write`)

- [ ] **Switch back to work account**

```bash
gh auth switch --user abalmus-celonis
```

---

## Task 9: Commit and push DYLLU changes

- [ ] **Stage and commit all DYLLU changes**

```bash
cd ~/Projects/DYLLU
git add \
  apps/storefront/src/lib/config.ts \
  apps/storefront/next.config.ts \
  apps/storefront/Dockerfile \
  apps/backend/docker-compose.prod.yml \
  apps/storefront/docker-compose.prod.yml \
  .github/workflows/deploy-backend.yml \
  .github/workflows/deploy-storefront.yml

git commit -m "$(cat <<'EOF'
Add NAS deployment: Dockerfiles, compose files, CI/CD workflows

- Storefront: standalone Next.js Dockerfile (pnpm monorepo build)
- Backend: production compose with Redis and migration step
- Two GitHub Actions workflows: deploy on push to main
- Fix SDK config to use NEXT_PUBLIC_MEDUSA_URL client-side

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Push to remote**

```bash
gh auth switch --user abalmush
git push origin main
gh auth switch --user abalmus-celonis
```

Expected: push succeeds. Backend workflow triggers (because `apps/backend/**` changes). Storefront workflow triggers (because `apps/storefront/**` changes) but will fail on the build step because `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` is not yet set — this is expected.

- [ ] **Watch backend deploy in GitHub Actions**

```bash
gh auth switch --user abalmush
gh run watch --repo abalmush/dyllu
gh auth switch --user abalmus-celonis
```

Wait for the backend deploy job to complete successfully. This runs the initial Medusa seed (including category tree) via `db:migrate`.

- [ ] **Get the publishable API key from Medusa admin**

Once the backend is deployed and healthy, open `https://medusa.inexlab.com/backend` in a browser (via Tailscale). Log in and copy the Default Publishable API Key from Settings → API Keys.

- [ ] **Set the publishable key secret**

```bash
gh auth switch --user abalmush
gh secret set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY \
  --body "<key from Medusa admin>" \
  --repo abalmush/dyllu
gh auth switch --user abalmus-celonis
```

- [ ] **Re-trigger the storefront workflow**

```bash
gh auth switch --user abalmush
gh workflow run deploy-storefront.yml --repo abalmush/dyllu
gh auth switch --user abalmus-celonis
```

---

## Task 10: Update nas-infra Caddyfile

Add the two new routes. Caddy's `caddy:80` is reachable by the `cloudflared` container via the `proxy` network — it uses the `Host` header to route requests to the right container.

**Files:**

- Modify: `~/Projects/My/nas-infra/caddy/Caddyfile`

- [ ] **Add dyllu and medusa routes**

Open `~/Projects/My/nas-infra/caddy/Caddyfile` and add before the final `handle { respond "Not Found" 404 }` block:

```
:80 {
	@market host market.inexlab.com
	handle @market {
		reverse_proxy market-data-frontend:3000
	}

	@context host context.inexlab.com
	handle @context {
		reverse_proxy context-app:3000
	}

	@tradeforge host trade.inexlab.com
	handle @tradeforge {
		reverse_proxy tradeforge-backend:8000
	}

	@n8n host n8n.inexlab.com
	handle @n8n {
		reverse_proxy n8n:5678
	}

	@dsm host dsm.inexlab.com
	handle @dsm {
		reverse_proxy https://host.docker.internal:5001 {
			transport http {
				tls_insecure_skip_verify
			}
		}
	}

	@dyllu host dyllu.inexlab.com
	handle @dyllu {
		reverse_proxy dyllu-storefront:3000
	}

	@medusa host medusa.inexlab.com
	handle @medusa {
		reverse_proxy dyllu-backend:9000
	}

	handle {
		respond "Not Found" 404
	}
}
```

---

## Task 11: Add cloudflared service to nas-infra

Cloudflared runs as a Docker container on the `proxy` network. It connects outbound to Cloudflare using the tunnel token — no inbound ports needed. It routes `dyllu.inexlab.com` and `medusa.inexlab.com` to `caddy:80`.

Before running this task, create the tunnel in Cloudflare dashboard:

1. Go to Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel
2. Name it `nas-dyllu`
3. Copy the tunnel token
4. Add hostname `dyllu.inexlab.com` → service `http://caddy:80`
5. Add hostname `medusa.inexlab.com` → service `http://caddy:80`

**Files:**

- Create: `~/Projects/My/nas-infra/cloudflared/docker-compose.yml`

- [ ] **Add CLOUDFLARE_TUNNEL_TOKEN secret to nas-infra repo**

```bash
gh auth switch --user abalmush
gh secret set CLOUDFLARE_TUNNEL_TOKEN \
  --body "<token from Cloudflare dashboard>" \
  --repo abalmush/nas-infra
gh auth switch --user abalmus-celonis
```

- [ ] **Create cloudflared compose file**

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - proxy
    deploy:
      resources:
        limits:
          memory: 128M
    healthcheck:
      test:
        [
          "CMD",
          "wget",
          "--no-verbose",
          "--tries=1",
          "--spider",
          "http://localhost:2000/metrics",
        ]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 15s

networks:
  proxy:
    external: true
```

---

## Task 12: Update nas-infra deploy workflow

Add cloudflared deploy and health check steps after the existing Caddy deploy.

**Files:**

- Modify: `~/Projects/My/nas-infra/.github/workflows/deploy.yml`

- [ ] **Add cloudflared steps after the Caddy health check step**

After the `Caddy health check` step, add:

```yaml
- name: Copy cloudflared files
  run: |
    SSH="ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }}"
    $SSH "mkdir -p ~/cloudflared"
    cat cloudflared/docker-compose.yml | $SSH "cat > ~/cloudflared/docker-compose.yml"

- name: Create cloudflared environment file
  run: |
    echo "CLOUDFLARE_TUNNEL_TOKEN=${{ secrets.CLOUDFLARE_TUNNEL_TOKEN }}" | \
      ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
      ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} "cat > ~/cloudflared/.env"

- name: Deploy cloudflared
  run: |
    ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
      ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
      "export PATH=\$PATH:${{ env.DOCKER_PATH }} && \
       cd ~/cloudflared && \
       docker compose up -d --force-recreate && \
       docker image prune -f"

- name: cloudflared health check
  run: |
    sleep 10
    for i in $(seq 1 10); do
      if ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
        ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
        "export PATH=\$PATH:${{ env.DOCKER_PATH }} && \
         docker exec cloudflared wget -q --spider http://localhost:2000/metrics"; then
        echo "cloudflared healthy"
        exit 0
      fi
      echo "Attempt $i/10 — waiting..."
      sleep 3
    done
    echo "cloudflared health check failed"
    ssh -i ~/.ssh/deploy_key -p ${{ secrets.NAS_PORT }} \
      ${{ secrets.NAS_USER }}@${{ secrets.NAS_HOST }} \
      "export PATH=\$PATH:${{ env.DOCKER_PATH }} && docker logs cloudflared --tail 30"
    exit 1
```

---

## Task 13: Commit and push nas-infra changes

- [ ] **Stage and commit**

```bash
cd ~/Projects/My/nas-infra
git add \
  caddy/Caddyfile \
  cloudflared/docker-compose.yml \
  .github/workflows/deploy.yml

git commit -m "$(cat <<'EOF'
Add DYLLU routes to Caddy and deploy cloudflared tunnel

- Caddy: dyllu.inexlab.com → dyllu-storefront:3000
- Caddy: medusa.inexlab.com → dyllu-backend:9000
- New cloudflared service for public access without port forwarding

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Push to remote**

```bash
gh auth switch --user abalmush
git push origin main
gh auth switch --user abalmus-celonis
```

Expected: nas-infra deploy workflow triggers, deploys updated Caddy (with new routes) and cloudflared. Watch:

```bash
gh auth switch --user abalmush
gh run watch --repo abalmush/nas-infra
gh auth switch --user abalmus-celonis
```

---

## Task 14: Verify end-to-end

- [ ] **Test Medusa admin (Tailscale)**

Open `https://medusa.inexlab.com/backend` in a browser. Should load the Medusa admin login page.

- [ ] **Test storefront (Tailscale)**

Open `https://dyllu.inexlab.com` in a browser. Should load the DYLLU homepage.

- [ ] **Test public access (no Tailscale)**

Disconnect from Tailscale (or use a mobile hotspot / incognito on phone). Open `https://dyllu.inexlab.com`. Should load.

- [ ] **Test API public access**

```bash
curl https://medusa.inexlab.com/health
```

Expected: `{"status":"ok"}` or similar JSON.

- [ ] **Verify no port conflicts on NAS**

```bash
ssh synology-lan "export PATH=\$PATH:/volume1/@appstore/ContainerManager/usr/bin && docker ps --format '{{.Names}}: {{.Ports}}'"
```

Expected: only `caddy` shows `0.0.0.0:8080`. All other containers show internal ports only.
