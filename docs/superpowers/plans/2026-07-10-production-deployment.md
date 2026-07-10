# Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy DYLLU to production — storefront on Cloudflare Workers (OpenNext), Medusa backend + Postgres + Redis on Hetzner/Coolify, images on R2 with transformations — replacing the NAS deployment and its CI.

**Architecture:** Per spec `docs/superpowers/specs/2026-07-10-production-deployment-design.md`. Everything is proxied through Cloudflare (Chișinău PoP). Task 3 is the go/no-go gate: if the OpenNext spike fails, the storefront falls back to a container on the VPS (Approach B) and only Tasks 7/9 change.

**Tech Stack:** `@opennextjs/cloudflare`, `wrangler`, Cloudflare R2/D1/Durable Objects/Image Transformations, Hetzner CX32, Coolify, GHCR, GitHub Actions.

**Conventions for every task:**
- Every commit message MUST start with `DYLLU-000` (a global hook rejects commits without a ticket id).
- `dyllu.example` is a placeholder — substitute the real production domain everywhere. The Cloudflare zone for that domain must exist before Task 5.
- No comments in any code/config you write (project rule).
- Manual dashboard steps (Hetzner console, Coolify UI, Cloudflare dashboard) are marked **[manual]** — the executor should ask the user to perform them or confirm access to do them, then verify the result with the given command.

---

### Task 1: Storefront Workers-readiness cleanup

Remove Docker-era config and the dead `pg` dependency. Keep `apps/storefront/Dockerfile` and `docker-compose.prod.yml` for now — they are the Approach B fallback until Task 3 passes; they get deleted in Task 10.

**Files:**
- Modify: `apps/storefront/package.json` (dependency removal only, via pnpm)
- Modify: `apps/storefront/next.config.ts`

- [ ] **Step 1: Remove the unused `pg` dependency**

```bash
pnpm -F @dyllu/storefront remove pg
```

- [ ] **Step 2: Verify nothing imports it**

Run: `rg -n "from .pg.|require\(.pg.\)" apps/storefront/src/`
Expected: no output.

- [ ] **Step 3: Remove `output: "standalone"` from `next.config.ts`**

In `apps/storefront/next.config.ts` delete the line:

```ts
  output: "standalone",
```

Keep `outputFileTracingRoot` — the OpenNext build still needs correct monorepo file tracing. Keep `images.remotePatterns` for now; the whole block is deleted in Task 4 when the custom loader replaces the built-in optimizer.

- [ ] **Step 4: Verify the app still builds and passes checks**

```bash
pnpm -F @dyllu/storefront build && pnpm check
```

Expected: build succeeds, lint/typecheck pass.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/package.json pnpm-lock.yaml apps/storefront/next.config.ts
git commit -m "DYLLU-000 chore(storefront): drop dead pg dep and standalone output"
```

---

### Task 2: Install the OpenNext Cloudflare adapter and pass the bundle-size gate

**Files:**
- Modify: `apps/storefront/package.json` (deps + scripts)
- Create: `apps/storefront/open-next.config.ts`
- Create: `apps/storefront/wrangler.jsonc`
- Create: `apps/storefront/.dev.vars.example`
- Modify: `apps/storefront/next.config.ts` (dev-mode init hook)
- Modify: `apps/storefront/.gitignore`

- [ ] **Step 1: Install adapter and wrangler**

```bash
pnpm -F @dyllu/storefront add @opennextjs/cloudflare@latest
pnpm -F @dyllu/storefront add -D wrangler@latest
```

- [ ] **Step 2: Create `apps/storefront/open-next.config.ts`** (minimal — caching overrides land in Task 3)

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
```

- [ ] **Step 3: Create `apps/storefront/wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "dyllu-storefront",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-12-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    { "binding": "WORKER_SELF_REFERENCE", "service": "dyllu-storefront" }
  ]
}
```

- [ ] **Step 4: Add scripts to `apps/storefront/package.json`**

Add to `"scripts"`:

```json
"preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
"deploy:cf": "opennextjs-cloudflare build && opennextjs-cloudflare deploy",
"upload:cf": "opennextjs-cloudflare build && opennextjs-cloudflare upload",
"cf-typegen": "wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts"
```

- [ ] **Step 5: Create `apps/storefront/.dev.vars.example`**

```
NEXTJS_ENV=development
MEDUSA_BACKEND_URL=http://localhost:9000
REVALIDATE_SECRET=supersecret
```

Copy it to `.dev.vars` locally (gitignored) for wrangler preview runs.

- [ ] **Step 6: Append the dev init hook to `apps/storefront/next.config.ts`**

After the existing `export default nextConfig;` add:

```ts
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
```

- [ ] **Step 7: Extend `apps/storefront/.gitignore`**

Append:

```
.open-next/
.dev.vars
cloudflare-env.d.ts
.wrangler/
```

- [ ] **Step 8: Build with OpenNext (needs `NEXT_PUBLIC_*` at build time)**

```bash
cd apps/storefront
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_placeholder \
NEXT_PUBLIC_BASE_URL=https://dyllu.example \
MEDUSA_BACKEND_URL=https://medusa.inexlab.com \
pnpm exec opennextjs-cloudflare build
```

Expected: build completes, `.open-next/worker.js` exists. If it fails on a Next 16.2 feature, record the exact error — this is the first fallback trigger.

- [ ] **Step 9: BUNDLE-SIZE GATE — dry-run deploy and read the gzip size**

```bash
pnpm exec wrangler deploy --dry-run --outdir=.wrangler-dist
```

Expected output includes `Total Upload: X KiB / gzip: Y KiB`. **Gate: gzip must be < 10 MB** (Workers paid-plan limit). If over: inspect with `pnpm analyze`, then decide (trim server deps) or fall back to Approach B.

- [ ] **Step 10: Commit**

```bash
git add apps/storefront/package.json pnpm-lock.yaml apps/storefront/open-next.config.ts apps/storefront/wrangler.jsonc apps/storefront/.dev.vars.example apps/storefront/next.config.ts apps/storefront/.gitignore
git commit -m "DYLLU-000 feat(storefront): OpenNext Cloudflare adapter setup"
```

---

### Task 3: Wire OpenNext caching and pass the functional spike gate (GO/NO-GO)

Deploys to `workers.dev` against the still-running NAS backend (`https://medusa.inexlab.com`) so the spike exercises a real Medusa API with real data.

**Prerequisites:** Cloudflare account with Workers paid plan ($5/mo) enabled; `wrangler login` completed (or `CLOUDFLARE_API_TOKEN` exported).

**Files:**
- Modify: `apps/storefront/open-next.config.ts`
- Modify: `apps/storefront/wrangler.jsonc`

- [ ] **Step 1: Create the cache R2 bucket and D1 database**

```bash
cd apps/storefront
pnpm exec wrangler r2 bucket create dyllu-next-cache
pnpm exec wrangler d1 create dyllu-tag-cache
```

Expected: D1 create prints a `database_id` UUID — copy it for Step 3.

- [ ] **Step 2: Create the D1 `revalidations` table**

```bash
pnpm exec wrangler d1 execute dyllu-tag-cache --remote --command "CREATE TABLE IF NOT EXISTS revalidations (tag TEXT NOT NULL, revalidatedAt INTEGER NOT NULL, stale INTEGER, expire INTEGER); CREATE INDEX IF NOT EXISTS revalidations_tag_idx ON revalidations (tag)"
```

Expected: `Executed 2 commands` (or similar success output).

- [ ] **Step 3: Extend `apps/storefront/wrangler.jsonc` with caching bindings and spike vars**

Full file content (replace `<D1_DATABASE_ID>` with the UUID from Step 1):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "dyllu-storefront",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-12-01",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  },
  "services": [
    { "binding": "WORKER_SELF_REFERENCE", "service": "dyllu-storefront" }
  ],
  "r2_buckets": [
    { "binding": "NEXT_INC_CACHE_R2_BUCKET", "bucket_name": "dyllu-next-cache" }
  ],
  "d1_databases": [
    {
      "binding": "NEXT_TAG_CACHE_D1",
      "database_name": "dyllu-tag-cache",
      "database_id": "<D1_DATABASE_ID>"
    }
  ],
  "durable_objects": {
    "bindings": [
      { "name": "NEXT_CACHE_DO_QUEUE", "class_name": "DOQueueHandler" }
    ]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["DOQueueHandler"] }],
  "vars": {
    "MEDUSA_BACKEND_URL": "https://medusa.inexlab.com"
  }
}
```

- [ ] **Step 4: Enable the caching overrides in `apps/storefront/open-next.config.ts`**

```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  queue: doQueue,
  tagCache: d1NextTagCache,
});
```

- [ ] **Step 5: Set the spike secret**

```bash
pnpm exec wrangler secret put REVALIDATE_SECRET
```

Paste the NAS backend's current `REVALIDATE_SECRET` (from GitHub secret `MEDUSA_REVALIDATE_SECRET`) so revalidation auth matches.

- [ ] **Step 6: Build and deploy to workers.dev**

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishable key from medusa.inexlab.com admin> \
NEXT_PUBLIC_BASE_URL=https://dyllu-storefront.<account-subdomain>.workers.dev \
MEDUSA_BACKEND_URL=https://medusa.inexlab.com \
pnpm run deploy:cf
```

Expected: deploy succeeds, prints the `workers.dev` URL.

- [ ] **Step 7: FUNCTIONAL GATE — verify the four critical behaviors**

1. **Home + PLP render:** open the workers.dev URL; product listing shows real products.
2. **PDP renders:** open any product page; images, price, variants present.
3. **Cart flow:** add an item; reload; cart persists (cookie `_medusa_cart_id` set, cart count survives reload).
4. **Tag revalidation:**

```bash
curl -s -X POST "https://dyllu-storefront.<account-subdomain>.workers.dev/api/revalidate" \
  -H "x-revalidate-secret: <REVALIDATE_SECRET>" \
  -H "content-type: application/json" \
  -d '{"tags":["products"]}'
```

Expected: `{"revalidated":["products"]}` and no 500s in `pnpm exec wrangler tail dyllu-storefront` while browsing afterward.

**If any check fails and can't be fixed within the OpenNext docs' known issues: STOP, report, and switch to Approach B** (storefront container on the VPS; Tasks 5, 6, 8, 10 proceed unchanged; Tasks 7 and 9 are replaced by their Approach B equivalents — do not improvise those without a plan update).

- [ ] **Step 8: Commit**

```bash
git add apps/storefront/wrangler.jsonc apps/storefront/open-next.config.ts
git commit -m "DYLLU-000 feat(storefront): OpenNext caching via R2, D1 tag cache, DO queue"
```

---

### Task 4: Custom `next/image` loader for Cloudflare Image Transformations

**Files:**
- Create: `apps/storefront/src/lib/util/image-loader.ts`
- Modify: `apps/storefront/next.config.ts`

- [ ] **Step 1: [manual] Enable transformations on the zone**

Cloudflare dashboard → zone `dyllu.example` → **Images → Transformations** → enable for the zone, and turn ON **"Resize images from any origin"** (marketing visuals still load from `images.unsplash.com` via `NEXT_PUBLIC_IMAGE_BASE`).

- [ ] **Step 2: Create `apps/storefront/src/lib/util/image-loader.ts`**

```ts
import type { ImageLoaderProps } from "next/image";

const isTransformEnabled =
  process.env.NEXT_PUBLIC_CF_IMAGE_TRANSFORMS === "on";

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: ImageLoaderProps): string {
  if (!isTransformEnabled) {
    return src;
  }
  const params = `width=${width},quality=${quality ?? 80},format=auto`;
  return `/cdn-cgi/image/${params}/${src}`;
}
```

`NEXT_PUBLIC_CF_IMAGE_TRANSFORMS=on` is set only in production CI builds (Task 9). Dev, tests, and workers.dev previews serve originals — `/cdn-cgi/image/` only exists on the custom-domain zone.

- [ ] **Step 3: Point `next.config.ts` at the loader and delete `remotePatterns`**

In `apps/storefront/next.config.ts`, replace the entire `images: { remotePatterns: [...] }` block with:

```ts
  images: {
    loader: "custom",
    loaderFile: "./src/lib/util/image-loader.ts",
  },
```

Also delete the now-unused `S3_HOSTNAME` / `S3_PATHNAME` consts at the top of the file.

- [ ] **Step 4: Verify locally**

```bash
pnpm -F @dyllu/storefront dev
```

Open `http://localhost:4000` — images render (loader bypasses, returns `src`). Then production-shape check:

```bash
cd apps/storefront
NEXT_PUBLIC_CF_IMAGE_TRANSFORMS=on \
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_placeholder \
NEXT_PUBLIC_BASE_URL=https://dyllu.example \
pnpm exec next build
```

Expected: build passes with the custom loader.

- [ ] **Step 5: Run checks and commit**

```bash
pnpm check
git add apps/storefront/src/lib/util/image-loader.ts apps/storefront/next.config.ts
git commit -m "DYLLU-000 feat(storefront): Cloudflare image transformations loader"
```

---

### Task 5: Provision Hetzner VPS + Coolify + backend stack

Mostly **[manual]** console/UI work; every step has a verification command.

- [ ] **Step 1: [manual] Create the server**

Hetzner Cloud console → New Server: **CX32** (4 vCPU / 8 GB / 80 GB), location **Falkenstein**, image **Ubuntu 24.04 LTS**, add your SSH key. Note the public IPv4.

Verify: `ssh root@<VPS_IP> 'echo ok'` → `ok`.

- [ ] **Step 2: Install Coolify**

```bash
ssh root@<VPS_IP> 'curl -fsSL https://cdn.coolify.io/coolify/install.sh | bash'
```

Verify: open `http://<VPS_IP>:8000`, create the Coolify admin account. **[manual]** In Coolify Settings set the instance domain so Coolify's own UI gets TLS (e.g. `coolify.dyllu.example`, DNS A record → VPS IP, **DNS-only/grey cloud** for the Coolify UI host).

- [ ] **Step 3: [manual] Cloudflare DNS + TLS for the API**

Zone `dyllu.example`: add **A record `api` → `<VPS_IP>`, Proxied (orange cloud)**. SSL/TLS → Overview → mode **Full (strict)**.

- [ ] **Step 4: [manual] Coolify: Postgres and Redis services**

Coolify → Project `dyllu` → production environment:
- **+ New → Database → PostgreSQL** (image `postgres:16`). Copy the internal connection URL.
- **+ New → Database → Redis** (image `redis:7`). Copy the internal URL.

Verify both show **Running**.

- [ ] **Step 5: [manual] GHCR pull access**

The `ghcr.io/abalmush/dyllu-backend` package is private. Either make the package public (GitHub → package → settings → Change visibility), or create a GitHub PAT (classic, `read:packages`) and add it in Coolify → **Settings → Docker Registries** (`ghcr.io`, username `abalmush`, PAT as password).

- [ ] **Step 6: [manual] Coolify: backend app resource**

**+ New → Docker Image** → `ghcr.io/abalmush/dyllu-backend:latest`.
- Port: `9000`; Domain: `https://api.dyllu.example`; Health check path: `/health`.
- Environment variables (from `apps/backend/.env.production.example`):

```
NODE_ENV=production
DATABASE_URL=<Coolify Postgres internal URL>
REDIS_URL=<Coolify Redis internal URL>
STORE_CORS=https://dyllu.example
ADMIN_CORS=https://api.dyllu.example
AUTH_CORS=https://dyllu.example,https://api.dyllu.example
BACKEND_URL=https://api.dyllu.example
STOREFRONT_URL=https://dyllu.example
JWT_SECRET=<openssl rand -hex 64>
COOKIE_SECRET=<openssl rand -hex 64>
REVALIDATE_SECRET=<openssl rand -hex 32 — reuse in Task 7 storefront secret>
```

Deploy. The container CMD runs `medusa db:migrate && medusa start` (migrations + initial seed run automatically on first boot).

Verify: `curl -s https://api.dyllu.example/health` → `OK`.

- [ ] **Step 7: Create the admin user**

Coolify → app → **Terminal**:

```bash
node_modules/.bin/medusa user -e admin@dyllu.example -p <strong-password>
```

Verify: log in at `https://api.dyllu.example/backend`.

- [ ] **Step 8: [manual] Region + publishable key**

In the admin UI: **Settings → Regions** → add **Moldova** (currency MDL, country MD). **Settings → Publishable API Keys** → copy the default key (attached to the Default Sales Channel) for Tasks 7/9.

- [ ] **Step 9: [manual] Nightly DB backups to R2**

Create private R2 bucket `dyllu-backups` + an R2 API token (Object Read & Write, scoped to it). Coolify → Postgres service → **Backups**: schedule daily, S3 destination = R2 endpoint `https://<cf-account-id>.r2.cloudflarestorage.com`, bucket `dyllu-backups`, retention 14.

Verify: trigger a manual backup run; object appears in the bucket.

---

### Task 6: R2 media bucket + Medusa S3 file module

**Files:**
- Modify: `apps/backend/medusa-config.ts`

- [ ] **Step 1: [manual] Create the media bucket + CDN domain + token**

- R2 → create bucket **`dyllu-media`**.
- Bucket → Settings → **Custom Domains** → connect `cdn.dyllu.example` (Cloudflare auto-creates the proxied DNS record).
- R2 API token: **Object Read & Write**, scoped to `dyllu-media`. Note Access Key ID / Secret.

Verify: upload any test object via dashboard; `curl -sI https://cdn.dyllu.example/<test-object>` → `200`.

- [ ] **Step 2: Add the S3 file module to `apps/backend/medusa-config.ts`**

Full new file content:

```ts
import { loadEnv, defineConfig } from "@medusajs/framework/utils";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    databaseDriverOptions: {
      connection: { ssl: false },
    },
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    path: "/backend",
  },
  modules: [
    ...(process.env.S3_BUCKET
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: process.env.S3_FILE_URL,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION,
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
});
```

The `S3_BUCKET` guard keeps local dev on the default local file provider.

- [ ] **Step 3: Verify local dev still boots without S3 env**

```bash
pnpm -F @dyllu/backend dev
```

Expected: boots clean on `http://localhost:9000` (Ctrl-C after).

- [ ] **Step 4: [manual] Add S3 env in Coolify and redeploy**

Add to the backend app env in Coolify, then redeploy:

```
S3_FILE_URL=https://cdn.dyllu.example
S3_ACCESS_KEY_ID=<from Step 1>
S3_SECRET_ACCESS_KEY=<from Step 1>
S3_REGION=auto
S3_BUCKET=dyllu-media
S3_ENDPOINT=https://<cf-account-id>.r2.cloudflarestorage.com
```

Verify end-to-end: admin UI → any product → upload an image → object appears in `dyllu-media` and the product image URL starts with `https://cdn.dyllu.example/`.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/medusa-config.ts
git commit -m "DYLLU-000 feat(backend): S3 file module for Cloudflare R2 media"
```

---

### Task 7: Production storefront deploy on the custom domain

**Files:**
- Modify: `apps/storefront/wrangler.jsonc`

- [ ] **Step 1: Add the custom domain and production vars to `wrangler.jsonc`**

Replace the `"vars"` block and add `"routes"`:

```jsonc
  "routes": [
    { "pattern": "dyllu.example", "custom_domain": true },
    { "pattern": "www.dyllu.example", "custom_domain": true }
  ],
  "vars": {
    "MEDUSA_BACKEND_URL": "https://api.dyllu.example"
  }
```

- [ ] **Step 2: Update the Worker secret to the production value**

```bash
cd apps/storefront
pnpm exec wrangler secret put REVALIDATE_SECRET
```

Paste the value set in Task 5 Step 6.

- [ ] **Step 3: Build and deploy with production build-time env**

```bash
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<key from Task 5 Step 8> \
NEXT_PUBLIC_BASE_URL=https://dyllu.example \
NEXT_PUBLIC_DEFAULT_REGION=md \
NEXT_PUBLIC_CF_IMAGE_TRANSFORMS=on \
MEDUSA_BACKEND_URL=https://api.dyllu.example \
pnpm run deploy:cf
```

Expected: deploy succeeds; Cloudflare provisions the custom domains (apex + www must not have conflicting DNS records — delete placeholder records first if present).

- [ ] **Step 4: Full production smoke test**

1. `https://dyllu.example` renders home with products from the Hetzner backend.
2. PDP → add to cart → cart page → reach checkout address step.
3. Rendered `<img>` tags contain `/cdn-cgi/image/` and images load (transformations active).
4. Revalidation:

```bash
curl -s -X POST https://dyllu.example/api/revalidate \
  -H "x-revalidate-secret: <REVALIDATE_SECRET>" \
  -d '{"tags":["products"]}'
```

Expected: `{"revalidated":["products"]}`.
5. Admin at `https://api.dyllu.example/backend` logs in (session cookie survives — Full (strict) TLS chain).

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/wrangler.jsonc
git commit -m "DYLLU-000 feat(storefront): production custom domain routing"
```

---

### Task 8: Rewrite `deploy-backend.yml` (GHCR build → Coolify webhook)

**Prerequisite [manual]:** Coolify → backend app → **Webhooks** → copy the deploy webhook URL. Coolify → **Keys & Tokens → API tokens** → create one. Add GitHub repo secrets `COOLIFY_WEBHOOK_URL` and `COOLIFY_API_TOKEN` (remember `gh auth switch --user abalmush` first, and switch back after):

```bash
gh auth switch --user abalmush
gh secret set COOLIFY_WEBHOOK_URL --repo abalmush/dyllu
gh secret set COOLIFY_API_TOKEN --repo abalmush/dyllu
gh auth switch --user abalmus-celonis
```

**Files:**
- Modify: `.github/workflows/deploy-backend.yml` (full replacement)

- [ ] **Step 1: Replace the file content**

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - "apps/backend/**"
      - "pnpm-lock.yaml"
      - ".github/workflows/deploy-backend.yml"
  workflow_dispatch:

env:
  IMAGE_NAME: ghcr.io/abalmush/dyllu-backend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push backend image
        uses: docker/build-push-action@v6
        with:
          context: .
          file: apps/backend/Dockerfile
          push: true
          platforms: linux/amd64
          tags: |
            ${{ env.IMAGE_NAME }}:latest
            ${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Trigger Coolify deploy
        run: |
          curl --fail -sS "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"

      - name: Health check
        run: |
          for i in $(seq 1 30); do
            if curl -fsS https://api.dyllu.example/health >/dev/null 2>&1; then
              echo "Backend healthy"
              exit 0
            fi
            echo "Attempt $i/30 failed, retrying in 10s..."
            sleep 10
          done
          echo "Backend failed health check"
          exit 1
```

(Substitute the real domain in the health-check URL.)

- [ ] **Step 2: Commit and verify via manual dispatch**

```bash
git add .github/workflows/deploy-backend.yml
git commit -m "DYLLU-000 ci: deploy backend via GHCR and Coolify webhook"
```

After this branch merges to `main`: `gh workflow run deploy-backend.yml` (as `abalmush`), watch the run go green and Coolify show a new deployment.

---

### Task 9: Rewrite `deploy-storefront.yml` (OpenNext build → wrangler)

**Prerequisite [manual]:** Cloudflare API token (dashboard → My Profile → API Tokens → template "Edit Cloudflare Workers", plus D1 edit permission on the account). Add repo secrets as `abalmush`:

```bash
gh auth switch --user abalmush
gh secret set CLOUDFLARE_API_TOKEN --repo abalmush/dyllu
gh secret set CLOUDFLARE_ACCOUNT_ID --repo abalmush/dyllu
gh secret set NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY --repo abalmush/dyllu
gh auth switch --user abalmus-celonis
```

(`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` now holds the production key from Task 5.)

**Files:**
- Modify: `.github/workflows/deploy-storefront.yml` (full replacement)

- [ ] **Step 1: Replace the file content**

```yaml
name: Deploy Storefront

on:
  push:
    branches: [main]
    paths:
      - "apps/storefront/**"
      - "pnpm-lock.yaml"
      - ".github/workflows/deploy-storefront.yml"
  pull_request:
    paths:
      - "apps/storefront/**"
  workflow_dispatch:

env:
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY }}
  NEXT_PUBLIC_BASE_URL: https://dyllu.example
  NEXT_PUBLIC_DEFAULT_REGION: md
  NEXT_PUBLIC_CF_IMAGE_TRANSFORMS: on
  MEDUSA_BACKEND_URL: https://api.dyllu.example

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up pnpm
        uses: pnpm/action-setup@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build with OpenNext
        working-directory: apps/storefront
        run: pnpm exec opennextjs-cloudflare build

      - name: Deploy to production
        if: github.event_name != 'pull_request'
        working-directory: apps/storefront
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: pnpm exec opennextjs-cloudflare deploy

      - name: Upload preview version
        if: github.event_name == 'pull_request'
        working-directory: apps/storefront
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: pnpm exec opennextjs-cloudflare upload
```

Note: PR previews via `upload` create a new Worker **version** with a preview URL printed in the log (they do not affect production traffic).

- [ ] **Step 2: Commit and verify**

```bash
git add .github/workflows/deploy-storefront.yml
git commit -m "DYLLU-000 ci: deploy storefront via OpenNext and wrangler"
```

After merge to `main`: `gh workflow run deploy-storefront.yml` → green run → `https://dyllu.example` serves the new deploy (check the `x-opennext` / response headers change or a visible change ships).

---

### Task 10: Decommission the NAS path

Only after Tasks 7–9 are verified green in production.

**Files:**
- Delete: `apps/storefront/Dockerfile`, `apps/storefront/docker-compose.prod.yml`, `apps/backend/docker-compose.prod.yml`
- Modify: `apps/backend/DEPLOY.md`, `CLAUDE.md`

- [ ] **Step 1: Delete Docker-era files**

```bash
git rm apps/storefront/Dockerfile apps/storefront/docker-compose.prod.yml apps/backend/docker-compose.prod.yml
```

(`apps/backend/Dockerfile` stays — Coolify deploys that image.)

- [ ] **Step 2: Update `apps/backend/DEPLOY.md`**

Rewrite to describe the live setup: Coolify deploys the GHCR image via webhook from CI; Postgres/Redis as Coolify services; R2 via the S3 file module; backups per Task 5 Step 9; rollback = redeploy previous image tag (`ghcr.io/abalmush/dyllu-backend:<sha>`) from the Coolify UI.

- [ ] **Step 3: Update `CLAUDE.md`**

In the Project Overview and Deployment sections: backend is **deployed** on Hetzner + Coolify (drop "not yet deployed — local dev only"); storefront hosted on **Cloudflare Workers (OpenNext)**, not Vercel; images on R2 (`cdn.dyllu.example`).

- [ ] **Step 4: [manual] Stop NAS containers and clean up**

On the NAS (via Tailscale SSH): `docker rm -f dyllu-backend dyllu-storefront dyllu-redis`. Remove the dyllu entries from `nas-infra` Caddyfile and the Cloudflare tunnel published routes for `dyllu.inexlab.com` / `medusa.inexlab.com`.

- [ ] **Step 5: [manual] Remove dead GitHub secrets**

```bash
gh auth switch --user abalmush
for s in NAS_HOST NAS_PORT NAS_USER NAS_SSH_KEY TS_OAUTH_CLIENT_ID TS_OAUTH_CLIENT_SECRET POSTGRES_PASSWORD MEDUSA_JWT_SECRET MEDUSA_COOKIE_SECRET MEDUSA_REVALIDATE_SECRET; do
  gh secret delete "$s" --repo abalmush/dyllu || true
done
gh auth switch --user abalmus-celonis
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "DYLLU-000 chore: retire NAS deployment path"
```
