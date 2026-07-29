# Publish to Production — Design

**Date:** 2026-07-13
**Status:** Design (pending review)
**Scope:** A dashboard button to publish a product (and a whole category) from catalog-admin into the Medusa store, via a new backend endpoint that reuses the existing ingest workflows and adds an update path.

## Problem

Editors fix a product in catalog-admin (local SQLite SSOT). They then want to push
that product — or an entire category — to the Medusa store by clicking a button.
Today the only path is the bulk CLI `medusa exec ingco-ingest-merged`, which:

- is container-coupled (resolves sales channel, shipping profile, categories),
- is create-only (skips handles already in the DB — no update path),
- runs over all files at once, not per-product from a UI.

## Decisions (from review)

- **Architecture (REVISED):** **Admin-API-only.** catalog-admin publishes by calling
  Medusa's **standard Admin API** directly (admin API key auth). **No code is added to
  the Medusa backend** — not a custom `src/api` route, not a plugin. This keeps
  `apps/backend` pristine and upgradeable long-term. (An earlier draft proposed a
  custom backend endpoint; that was removed. See [[feedback_no_medusa_extension]].)
  Trade-off accepted: catalog-admin resolves sales-channel / shipping-profile /
  category IDs and builds the v2 product payload itself.
- **Test target:** local `apps/backend` Medusa first. No push to real production
  without the user's explicit go; the same button points at prod later via env.
- **Scope:** both single-product and whole-category publish.
- **Contract:** the endpoint accepts `MergedProduct[]` — the exact shape the ingest
  already understands — so catalog-admin only needs to produce that shape.
- **Version control:** build **uncommitted on `main`** working tree (no branch); do
  NOT commit until the user explicitly asks.
- **Categories are kept in sync with Medusa** (Medusa is the source of truth for the
  category tree). catalog-admin categories carry the Medusa category **handle**, so a
  product's category resolves to a Medusa handle with no fuzzy matching. A **"Sync
  categories from Medusa"** action pulls the live category tree (id/handle/name/parent)
  and upserts it into catalog-admin's `category` table.

## Architecture

```
catalog-admin (local tool)                 apps/backend (Medusa v2.17)
─────────────────────────                  ───────────────────────────
Publish button (editor / category)
   │  toMergedProduct(bundle)  ─ builds MergedProduct[]
   │  publishProducts() server action
   │      POST /admin/catalog/publish  ───▶  route: resolve container deps,
   │      Authorization: Bearer <token>       upsert each by handle:
   │      { products: MergedProduct[], dryRun }   handle exists → updateProductsWorkflow
   │                                              else          → createProductsWorkflow
   ◀── { results: [{handle, action: created|updated|skipped, id?, error?}] }
```

### Backend (`apps/backend`)

**No changes.** The backend is not touched — no route, no plugin, no refactor.
Medusa stays pristine and upgradeable.

### catalog-admin (all logic lives here)

- **Category sync:** add a `medusa_handle` column to catalog-admin's `category` table
  (Drizzle migration). A **"Sync categories from Medusa"** server action calls
  `GET /admin/product-categories` (standard Admin API) and upserts handle/name so the
  local tree mirrors Medusa. Product publish resolves its category to `medusa_handle`.
- `src/lib/medusaAdmin.ts` — env-gated Medusa **Admin API** client. Env:
  `CATALOG_MEDUSA_ADMIN_URL`, `CATALOG_MEDUSA_ADMIN_KEY` (admin API key). If unset →
  publish disabled with a clear "configure Medusa credentials" message (no fabrication).
  Auth header: `Authorization: Bearer <api key>` (or `x-medusa-access-token`). Methods:
  `listCategories()`, `getSalesChannel()`, `getShippingProfile()`, `findProductByHandle(handle)`,
  `createProduct(body)`, `updateProduct(id, body)` — all standard `/admin/*` endpoints.
- `src/lib/toMedusaProduct.ts` — pure: product bundle (+ resolved sales-channel id,
  shipping-profile id, category id) → the v2 `POST /admin/products` body: title, handle,
  status, description (built from content + specs), options `[{title: axis, values}]`,
  variants `[{title, sku, prices:[{currency_code:"mdl", amount}], options}]`, images
  `[{url}]`, `category_ids`, `sales_channels:[{id}]`, `shipping_profile_id`, metadata.
  Unit-tested.
- **Server actions:** `publishProduct(id, {dryRun})`, `publishCategory(categoryId, {dryRun})`
  — resolve ids via the client, check existence by handle, then dry-run (report intended
  create/update, no write) or create/update via the Admin API. Per-item results.
- **UI:**
  - Editor header: **Publish** button → confirm dialog that first runs a **dry-run**
    and shows what will happen (create vs update, fields, variant/price summary),
    then a "Publish to production" action. Result toast + per-item status.
  - Category publish: a **Publish category** action (on the category view / products
    list filtered by category) → dry-run summary (N products: X create, Y update) →
    confirm → batched publish with a per-product result list.

## Safety / guardrails

- **Dry-run first, always shown** before any live write in the UI.
- Live push is **explicit** (a second confirm) and clearly labels the target
  (env URL) so prod vs local is unmistakable.
- Backend never partial-fails silently: per-item results with errors surfaced.
- No credentials handled by the assistant; user sets env; the first real prod push
  is the user's action.

## Version-control note

Unlike catalog-admin (gitignored local tool), the backend endpoint is **tracked code**
in the DYLLU repo. Per project rules it will be developed on a **feature branch**, and
**not committed or pushed** until the user explicitly asks. DYLLU is currently on `main`.

## Out of scope (v1)

- Image upload/hosting to Medusa (uses existing `source_url`s; no re-upload).
- Deleting/unpublishing from prod.
- Scheduling / background queue (synchronous request, batched).

## Testing

- Backend: unit-test `merged-to-medusa` mapping; integration-test the route against a
  local Medusa with a temp product (create then update → assert upsert).
- catalog-admin: unit-test `toMergedProduct`; the publish server action with a mocked
  client (dry-run returns payload; live path calls fetch once).
- Manual: local backend running, publish one product (create), edit, publish again
  (update), then a small category.
