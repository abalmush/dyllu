# DYLLU Product Catalog Pipeline — Design

**Date:** 2026-07-06
**Status:** Approved (design), pending implementation plan

## Goal

Produce a production-ready Medusa v2 product catalog for the DYLLU storefront, where
every product has:

1. **Clean images** — one curated hero image per product (plus extras where useful)
2. **Clean descriptions** — Romanian, three layers: specifications, why-it's-good, SEO/GEO text
3. **Connected products** — accessories/consumables linked to parent tools, plus related-in-category
4. **Variant grouping** — SKUs grouped into products with a clear variant axis (Medusa Product ↔ Variant)

The work is **AI-proposes / human-approves**: an internal review console gates every phase, and
nothing reaches the website until it is approved.

## Scope

- **Phase-1 scope: the 888 storefront products** (currently listed on ingcomoldova.md, already enriched).
- The 166 manufacturer-only togroup SKUs are **out of scope for now**; they can be curated in later
  as additions using the same pipeline.
- Customer-facing language: **Romanian only.** All internal working data (grouping keys, variant
  axes, product_type, links) is **English**.

## Current data inputs

| File                                | Count | Contents                                                                                                                                                           |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `data/products_enriched.json`       | 888   | sku, name/name_ro/name_en, product_type, function_en, variant_key, power_source, correct_category, category_path, group_id_ai, group_name_en, price_mdl, image_url |
| `data/togroup/product_details.json` | 959   | manufacturer specs (description bullets), images, has_video, category_breadcrumb                                                                                   |
| `data/images/manifest.json`         | 888   | local downloaded image per SKU + source (togroup / ingcomoldova fallback)                                                                                          |
| `data/groups.json`                  | 276   | existing AI variant groups + curation state                                                                                                                        |

Known gaps: 61 togroup details unfetched (login-gated; see `data/togroup/RESUME.md`), which leaves
74 products on fallback images (36 fetch-pending + 38 genuinely not in togroup).

## Architecture

### One master, idempotent passes

- **`catalog_master.json`** — single source of truth, keyed by SKU. Consolidates all inputs and holds
  every derived field. Each pipeline phase reads it, writes its output back, and is **resumable**
  (a phase re-run skips already-completed items). This eliminates the scattered-file problem and the
  reboot-loss problem experienced earlier.
- **Approval state** — per phase, per unit (product-group or SKU): `pending | approved | rejected`,
  with optional human edits stored alongside the AI proposal. Stored in `catalog_master.json` (or a
  sibling `review_state.json` referenced by it). An item is exportable only when all phases are approved.

### Field ownership

- **Internal (EN):** `product_type`, `group_id`, `variant_axis` (option name), `variant_value`,
  `links` (accessory/related).
- **Customer-facing (RO):** `name_ro`, `specifications`, `why_good`, `seo_text`, `meta_title`,
  `meta_description`, `keywords`.

## Pipeline

Ordered by data dependency. Grouping precedes descriptions/images/links so that content is authored
**per product (~300)** rather than per SKU (888).

### Phase 0 — Consolidate

- Build `catalog_master.json` from the four inputs, keyed by SKU.
- Finish the 61 togroup fetches (upgrades 36 fallback images). Login-gated — uses the browser snippet
  in `data/togroup/`.
- Output: one normalized master with per-phase approval scaffolding.

### Phase 1 — Variant grouping (backbone)

- Seed from existing `group_id_ai` / `groups.json`.
- Each group becomes a Medusa **Product**; each member SKU a **Variant**.
- Derive the **variant axis** (option name, e.g. "Voltage", "Size", "Capacity") and each variant's
  **value** from `variant_key`.
- Review in console: approve / split / merge / rename groups; confirm the axis.
- Output: every SKU assigned to an approved product-group with an option name + value.

### Phase 2 — Clean images (per product)

- Select the hero image per product (prefer togroup manufacturer shot; fall back to ingcomoldova).
- Resolve the 74 fallbacks (finish 61 fetch; decide per remaining 38).
- Optional normalization: square canvas, white background, consistent max dimension.
- Upload approved images to Cloudflare R2; record stable URLs in master.
- Review in console: eyeball the chosen image per product; replace/flag.

### Phase 3 — Clean descriptions (per product, RO)

AI pass converts English manufacturer specs → three RO layers:

- **`specifications`** — normalized spec table. Shared specs at product level; the differing dimension
  stays at variant level.
- **`why_good`** — concise benefit/value copy.
- **`seo_text`** — structured, question-answering RO copy tuned for search **and** generative engines
  (GEO/AEO), plus `meta_title`, `meta_description`, `keywords`. Storefront additionally emits JSON-LD
  Product schema (storefront-side task, noted for the export/integration phase).

Review in console: read/edit each product's three layers; approve.

### Phase 4 — Connected products

- **Accessory/consumable ↔ parent tool** (e.g. discs → grinders, chains → chainsaws).
- **Related-in-category** suggestions.
- AI proposes candidate links with rationale; human confirms in console.
- Output: `links` on each product, ready to map to Medusa.

### Phase 5 — Export to Medusa

- Transform approved master → Medusa v2 import: products, variants, product options, categories,
  images, and relations (variant options natively; accessory/related via tags/collections or a small
  custom link — decided at implementation time).
- Import into the Moldova region via a seed script / admin API.
- Only fully-approved products are exported.

## Ongoing stock & price sync (operational, post-launch)

Distinct from the one-time build above: **stock and price change continuously**, so once a live
data source exists they must be refreshed by an **automated, non-gated** job — no human approval per
run. This is not implemented yet; DYLLU currently builds from scraped snapshots and has **no live 1C
feed**. The rules below are lifted from the legacy pit.md `1C Sync for WooCommerce` plugin (the system
DYLLU replaces) and mapped to Medusa v2 modules, so the target design is settled when a feed is wired.

**Source shape (per SKU, from 1C feed item):**

- `Prices: [{ typeId, value }]` — typed price rows. `typeId="05"` retail, `typeId="03"` promo.
- `balance` — numeric stock level.
- `Temporary` — boolean flag that forces in-stock even at zero balance.

### Prices → Medusa Pricing module

| 1C source                                                 | Medusa v2 target                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Prices[typeId=05].value`                                 | Variant **base price** in MDL (price set on the variant)                                                     |
| Promo feed `discountPrice` + `Action.StartDate`/`EndDate` | **Price List** (`type: "sale"`) with `starts_at`/`ends_at`; auto-applies inside the window and reverts after |
| Main-feed `Prices[typeId=03]` (only if `03 < 05`)         | Sale price fallback, no dates — only if no promo feed                                                        |

- Medusa price lists **natively support date windows and override base prices**, replacing the
  WooCommerce `sale_price` + `pit_sync_balance_oos`-style meta hacks cleanly.
- Guards to carry over: promo applied only when strictly lower than retail; comma decimals normalized
  to dots at ingest; missing `typeId=05` → **leave existing price untouched**, never zero it.
- Currency is MDL. Tax-inclusive vs. exclusive is an open item (see below).

### Stock → Medusa Inventory module

Medusa v2 separates **Inventory** (`InventoryItem` + per-location `InventoryLevel`) from the product;
a variant links to an inventory item by SKU. The legacy plugin deliberately **never wrote a quantity**
— it toggled availability only. Two viable strategies:

- **Mirror legacy (availability-only):** variant `manage_inventory = false` normally (always
  purchasable); to force out-of-stock, flip `manage_inventory = true` with level `0` and no backorder.
- **Track quantity:** write `balance` to the location's `stocked_quantity` and let Medusa derive
  availability. More faithful to 1C but exposes exact counts.

Rules to preserve either way:

| 1C `balance`                    | Behavior                                                              |
| ------------------------------- | --------------------------------------------------------------------- |
| missing / empty / non-numeric   | **Leave availability untouched**                                      |
| `<= 0`                          | Out of stock — tag the item so the job only reverts states **it** set |
| `<= 0` **and** `Temporary=true` | Force in-stock (backorder-allowed, or `manage_inventory=false`)       |
| `> 0`                           | In stock — restore only if it was marked out-of-stock by this job     |

### Sync job mechanics

- **SKU-keyed idempotent upsert**, batched and resumable — a Medusa **scheduled job** (`src/jobs/`)
  wrapping a workflow (`updateProductVariantsWorkflow` + pricing/inventory module services).
- **Field-scoped runs:** support price-only or stock-only passes (the legacy field toggles), so a
  fast frequent stock refresh can run without touching prices/content.
- **Absent-SKU reconciliation:** a SKU that drops out of the feed → set the product/variant to a
  non-purchasable status (Medusa `draft`/archived), never hard-delete — mirrors legacy `draft_products_not_in_feed`.
- **Idempotency invariants:** only-undo-what-you-set, and missing-field = skip. These prevent a
  partial or empty feed from wiping live catalog data.

## Review console

Grows the existing Flask dashboard (`tools/scraper/server.py` + templates) into a phase-based
curation console:

- Phase tabs: **Groups → Images → Descriptions → Links → Export**.
- Per unit: AI proposal shown alongside approve / edit / reject controls.
- Per-phase progress meter (e.g. "Descriptions: 142/300 approved").
- Export tab lists only fully-approved products and triggers the Medusa import.
- Reuses the existing card/badge styling and the `/product-images/` serving route.

## Success criteria

- 100% of in-scope products (~300 grouped products covering the 888 SKUs) pass all five phases with
  human approval.
- Each product has: an approved image (R2 URL), RO specifications + why_good + seo_text + meta fields,
  a confirmed variant structure, and confirmed links.
- A repeatable, resumable export produces a clean Medusa import with zero manual post-fixup.

## Out of scope (for now)

- The 166 manufacturer-only products (future additions).
- Storefront UI work beyond emitting JSON-LD and consuming the imported catalog.
- Tax/region configuration beyond what the import requires. (Ongoing stock/price sync is designed
  above under "Ongoing stock & price sync" but not implemented in this phase — no live feed exists yet.)
- Additional languages (RU, EN) on the storefront.

## Open items to resolve during planning

- Exact storage split: single `catalog_master.json` vs. master + `review_state.json`.
- Medusa modeling of accessory/related links (tags/collections vs. custom link module).
- Image normalization: whether to standardize canvas/background or keep source images as-is.
- Ongoing sync: whether 1C `Prices` are tax-inclusive (affects Medusa region tax config), and whether
  stock sync tracks quantity or mirrors the legacy availability-only approach.
