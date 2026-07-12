# DYLLU Operations Runbook

Practical "how do I…" guide for operating the live DYLLU stack. For an AI agent or
operator: find the task, copy the recipe, run it. Companion to
`docs/DEPLOYMENT-STATE.md` (architecture/state) and the specs/plans under
`docs/superpowers/`.

All commands assume repo root `/Users/abalmus/Projects/DYLLU` unless noted.

---

## 1. Systems at a glance

| System              | URL / Address                                | Auth                            | Notes                                                |
| ------------------- | -------------------------------------------- | ------------------------------- | ---------------------------------------------------- |
| Storefront          | https://dyllu.md                             | public                          | Cloudflare Worker `dyllu-storefront`                 |
| Backend API + Admin | https://api.dyllu.md, admin at `/backend`    | see §3                          | Medusa v2.14                                         |
| Media CDN           | https://cdn.dyllu.md                         | public read                     | R2 bucket `dyllu-media`                              |
| VPS (host)          | `root@138.199.235.8` (hostname `dyllu-prod`) | SSH key                         | Hetzner CX32                                         |
| Coolify             | http://138.199.235.8:8000                    | dashboard login                 | manages backend container                            |
| GitHub              | github.com/abalmush/dyllu                    | `gh` as **abalmush**            | never use abalmus-celonis                            |
| Cloudflare          | account `592732e1a9ae45cfe9cafce4228ebe2d`   | `wrangler` (abalmush@gmail.com) | zone `dyllu.md` = `f3c1a775580e4dd7d787f93bf3cb326e` |

### Well-known IDs (Medusa)

| Thing                               | Value                                                                 |
| ----------------------------------- | --------------------------------------------------------------------- | ---- |
| Region — Moldova (MDL)              | `reg_01KX6GW84R9BQFM6NGG6EY5K7R`                                      |
| Default Sales Channel               | `sc_01KX6GW7X1GP6C72YDCXD3GTVK`                                       |
| Stock location — Chisinau Warehouse | `sloc_01KX6GW87AQFS9YCFV7DM0F83D`                                     |
| Publishable API key (storefront)    | `pk_f8479e2f56fa610c2d51e0bbc5212bde3c17ac6e396dd5764fff8c7436ba1642` |
| Currency                            | `mdl` · Country                                                       | `md` |

> Price amounts are whole MDL (e.g. `amount: 1500` = 1500 MDL) — verified: setting
> 1500 yielded `calculated_amount: 1500` and a cart total of 1500. Confirm against
> an existing product before any bulk import.

---

## 2. Connecting to each system

### SSH to the VPS

```bash
ssh root@138.199.235.8        # hostname: dyllu-prod
```

Uses your Hetzner SSH key (already configured in this environment). The VPS runs
Coolify + Docker; the Medusa container, Postgres, and Redis are Coolify-managed.

### Coolify (backend container, env vars, logs, redeploy)

Open http://138.199.235.8:8000 → project `dyllu` → production → `dyllu-backend`.

- **Logs:** app → Logs (runtime). **Env:** app → Environment Variables.
- **Redeploy / Restart:** buttons top-right.
- **Terminal into container:** app → Terminal.

### Cloudflare / Wrangler (storefront worker, R2, D1, DNS)

```bash
cd apps/storefront
pnpm exec wrangler whoami            # abalmush@gmail.com
pnpm exec wrangler r2 bucket list
pnpm exec wrangler d1 list
pnpm exec wrangler tail dyllu-storefront   # live worker logs
```

Requires Node 22 (`nvm use 22`). Re-auth if needed: `pnpm exec wrangler login`.

### GitHub CLI

```bash
gh auth switch --user abalmush     # ALWAYS abalmush; never switch to celonis
gh run list
gh secret list --repo abalmush/dyllu
```

---

## 3. Getting an admin API token (needed for all `/admin/*` calls)

The store API (`/store/*`) uses the **publishable key** header. The admin API
(`/admin/*`) needs a **Bearer JWT**. Get one (valid ~24h):

```bash
curl -sX POST https://api.dyllu.md/auth/user/emailpass \
  -H 'content-type: application/json' \
  -d '{"email":"admin@dyllu.md","password":"<ADMIN_PASSWORD>"}'
# -> {"token":"eyJ..."}
```

Export it for the recipes below:

```bash
export TOKEN="eyJ..."            # from the call above
export API=https://api.dyllu.md
export PUBKEY=pk_f8479e2f56fa610c2d51e0bbc5212bde3c17ac6e396dd5764fff8c7436ba1642
export REGION=reg_01KX6GW84R9BQFM6NGG6EY5K7R
export SALES_CHANNEL=sc_01KX6GW7X1GP6C72YDCXD3GTVK
export STOCK_LOC=sloc_01KX6GW87AQFS9YCFV7DM0F83D
```

Where secrets live:

- **Admin password:** whatever was set via `medusa user` (ask the owner / password manager).
- **Coolify env** (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `S3_*`, `REVALIDATE_SECRET`): Coolify → dyllu-backend → Environment Variables.
- **CI secrets:** `gh secret list --repo abalmush/dyllu` (values are write-only).
- **R2 S3 keys:** Cloudflare dash → R2 → Manage R2 API Tokens (scoped to `dyllu-media`).

---

## 4. Task recipes

### 4a. Change a product's price

```bash
# find the variant id
curl -s "$API/store/products?handle=<HANDLE>&region_id=$REGION&fields=id,*variants" \
  -H "x-publishable-api-key: $PUBKEY" | python3 -m json.tool | grep -E '"id"|sku'

# set/replace the MDL price on the variant
curl -sX POST "$API/admin/products/<PRODUCT_ID>/variants/<VARIANT_ID>" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"prices":[{"amount":1500,"currency_code":"mdl"}]}'
```

Verify it reaches the store: the variant's `calculated_price.calculated_amount`
should be set (needed before add-to-cart works).

### 4b. Upload / update categories

Categories are **many-to-many** with products. The live 88-category tree came from
`apps/backend/src/data/category-tree.ts` via the **run-once** seed
(`src/migration-scripts/initial-data-seed.ts`) — editing that file does NOT reshape
the existing DB. To change live categories, use the admin API or a script.

Create a root category:

```bash
curl -sX POST "$API/admin/product-categories" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Scule electrice","handle":"scule-electrice","is_active":true}'
# -> returns { "product_category": { "id": "pcat_..." } }
```

Create a child (nest under a parent):

```bash
curl -sX POST "$API/admin/product-categories" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Bormașini","handle":"bormasini","parent_category_id":"pcat_...","is_active":true}'
```

Bulk: write a Medusa script under `apps/backend/src/scripts/` and run it with
`pnpm -F @dyllu/backend exec medusa exec ./src/scripts/<name>.ts` (see the
existing `ingco-*` scripts as templates). Delete: `DELETE /admin/product-categories/<id>`.

### 4c. Upload / create products

Minimum for a product to appear on the storefront: `status: published`, attached
to the **sales channel**, at least one variant with an **MDL price**, and (for
stock-managed variants) inventory.

```bash
curl -sX POST "$API/admin/products" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{
    "title": "Bormașină cu percuție DTID201",
    "handle": "bormasina-dtid201",
    "status": "published",
    "category_ids": ["pcat_..."],
    "sales_channels": [{"id": "'"$SALES_CHANNEL"'"}],
    "options": [{"title": "Variantă", "values": ["Standard"]}],
    "variants": [{
      "title": "Standard",
      "sku": "DTID201",
      "manage_inventory": false,
      "options": {"Variantă": "Standard"},
      "prices": [{"amount": 1899, "currency_code": "mdl"}]
    }]
  }'
```

- `manage_inventory: false` = always in stock (no inventory record needed).
- For stock-managed variants, also create inventory at `$STOCK_LOC`.
- Bulk import: a Medusa script is the right tool (idempotent by `handle` — see
  `apps/backend/src/scripts/ingco-ingest-merged.ts`). Import tooling currently
  lives outside the repo in `tmp/tools/scraper` and `../catalog-ai-pipeline`.

### 4d. Assign a product to a promo set (tags)

Promo groups (Woodworking, New Arrivals, seasonal…) are **product tags**, defined
in `apps/storefront/src/lib/promos.ts` and surfaced at `/c/<slug>` + the homepage
banner. Tag a product with the promo's `tag` value:

```bash
curl -sX POST "$API/admin/products/<PRODUCT_ID>" \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"tags":[{"value":"prelucrarea-lemnului"}]}'
```

It then appears at `https://dyllu.md/c/prelucrarea-lemnului`. To add a NEW promo:
edit `promos.ts` (add `{slug, tag, title, active, featured,...}`) and deploy the
storefront. `active` toggles visibility; `featured` puts it on the home page.

### 4e. Upload / replace product images (preferred: `tools/upload-images.py`)

Images live in R2 under `products/<name>-<contenthash>.png`, served immutably from
`cdn.dyllu.md`. The content hash means **replacing an image gives it a new URL
automatically** — no cache purge, never stale; re-uploading unchanged content is a
no-op (same hash). Use the helper:

```bash
export AWS_ACCESS_KEY_ID=...  AWS_SECRET_ACCESS_KEY=...   # R2 S3 token (scoped to dyllu-media)

# one or many
python tools/upload-images.py /path/DTAAC501.png
python tools/upload-images.py output/*.png --json

# name the object after a SKU (default = filename stem)
python tools/upload-images.py new-photo.png --name DTAAC501

# upload AND set it on a Medusa product (thumbnail + images) in one shot
export MEDUSA_ADMIN_TOKEN=$TOKEN
python tools/upload-images.py new-photo.png --name DTAAC501 --set-product prod_01...
```

Output is `<name>\t<url>` lines (or `--json`). To replace an image: run the same
command with the new file — you get a new hashed URL; pass `--set-product` (or paste
the URL into the product/manifest) to point at it. R2/CDN config is overridable via
env (`R2_ENDPOINT`, `R2_BUCKET`, `CDN_BASE`); creds come from standard `AWS_*` env.

R2 S3 credentials: Cloudflare dash → R2 → **Manage R2 API Tokens** (scope to
`dyllu-media`), or reuse the backend's `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY`
from Coolify. Endpoint: `https://592732e1a9ae45cfe9cafce4228ebe2d.r2.cloudflarestorage.com`.

Alternatives: Admin UI (product → Media) uploads through Medusa (adds a ULID suffix
instead of a content hash). Bulk sync of many files: `aws s3 sync <dir>/
s3://dyllu-media/products/ --endpoint-url <R2_ENDPOINT> --content-type image/png
--cache-control "public, max-age=31536000, immutable"` (but the helper is preferred
because it does the content-hash naming).

### 4f. Create the admin user (first time / new operator)

```bash
# in Coolify -> dyllu-backend -> Terminal:
node_modules/.bin/medusa user -e someone@dyllu.md -p '<strong-password>'
```

### 4g. Add a region / currency

Admin UI → Settings → Regions, or `POST /admin/regions`
(`{"name","currency_code","countries":["..."],"payment_providers":["pp_system_default"]}`).
Update `NEXT_PUBLIC_DEFAULT_REGION` in storefront CI env if the default changes.

---

## 5. Deploy & CI

Both apps **auto-deploy on push to `main`** (path-filtered).

```bash
# storefront changes -> apps/storefront/**  ; backend -> apps/backend/**
git push origin main            # triggers the matching workflow(s)

gh run list --limit 5
gh run watch <run-id>
```

Manual dispatch: `gh workflow run deploy-storefront.yml` /
`gh workflow run deploy-backend.yml`.

Local build-gate before pushing to live (recommended for big diffs):

```bash
cd apps/storefront && nvm use 22
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$PUBKEY NEXT_PUBLIC_BASE_URL=https://dyllu.md \
NEXT_PUBLIC_DEFAULT_REGION=md MEDUSA_BACKEND_URL=https://api.dyllu.md \
pnpm exec opennextjs-cloudflare build
```

Manual storefront deploy (needs `wrangler login`, Node 22):

```bash
cd apps/storefront
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=$PUBKEY NEXT_PUBLIC_BASE_URL=https://dyllu.md \
NEXT_PUBLIC_DEFAULT_REGION=md NEXT_PUBLIC_CF_IMAGE_TRANSFORMS=on \
MEDUSA_BACKEND_URL=https://api.dyllu.md pnpm run deploy:cf
```

Backend redeploy without code change: Coolify → dyllu-backend → **Redeploy**
(re-pulls `ghcr.io/abalmush/dyllu-backend:latest`) or **Restart** (re-applies env).

Rollback: storefront → Cloudflare keeps worker versions (dashboard → Workers →
dyllu-storefront → Deployments → rollback). Backend → redeploy an earlier image
tag `ghcr.io/abalmush/dyllu-backend:<sha>` in Coolify.

---

## 6. Debugging

| Symptom                           | Where to look                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storefront 500 / runtime error    | `cd apps/storefront && pnpm exec wrangler tail dyllu-storefront` (bust edge cache with `?nc=$RANDOM`)                                                        |
| Backend error                     | Coolify → dyllu-backend → Logs (runtime). Errors are masked over HTTP as `unknown_error`; the real stack is in these logs                                    |
| Backend down                      | `curl -s https://api.dyllu.md/health` (200 = ok). From a datacenter IP use `--resolve api.dyllu.md:443:138.199.235.8` (Cloudflare bot-blocks datacenter IPs) |
| CI build fails on API fetch (403) | Cloudflare bot protection blocks GitHub runner IPs; build-time fetches must tolerate failure (already handled)                                               |
| Add-to-cart "unknown error"       | Variant has no MDL price in the region — see §4a                                                                                                             |
| Image 404                         | Must be a direct `cdn.dyllu.md` or `/images/...` URL; the `/cdn-cgi/image/` transform does NOT work behind the Worker                                        |

---

## 7. Conventions

- **Commits** must start with `DYLLU-000` (a global hook rejects commits/PRs without a ticket id).
- **GitHub** operations use the **abalmush** account only. Never switch to abalmus-celonis.
- **No code comments** except a single-line non-obvious WHY (see CLAUDE.md).
- **Never** put an admin/API token or password in a URL, commit, or the storefront bundle. Publishable keys (`pk_...`) are safe client-side; admin JWTs are not.
