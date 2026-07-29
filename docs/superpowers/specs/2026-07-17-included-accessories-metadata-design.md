# Included Battery/Charger Accessories Metadata — Design

**Date:** 2026-07-17
**Status:** Design (pending review)
**Scope:** A one-off, re-runnable backend script that writes `metadata.included_accessories`
onto Medusa product variants, mapping cordless power tools to the exact battery/charger
(and other bundled) SKUs they physically ship with.

## Problem

Some cordless tools (e.g. `DTCD1B1285`, a 20V impact wrench) ship with batteries and a
charger included; others are sold bare and need a battery/charger bought separately. The
current Medusa metadata (`power_source`, `battery_included`, `charger_included`,
`battery_count`, `battery_capacity` — all set by `apps/backend/src/scripts/ingco-classify.ts`)
only captures aggregate facts ("this ships with 2 batteries of unknown-but-implied
capacity"). It does not record the **exact accessory SKU** included, so there's no way to
say "this product includes 2× `DTLBP550` and 1× `DTFCP540`" or link to those accessories'
own product pages.

Separately, `apps/catalog-admin/data/bundles.json` already contains this exact
information — pre-parsed from the supplier's master CSV
(`apps/catalog-admin/catalog-latest/*.csv`) "Include:" text — for 3,337 SKUs, including
correct entries like:

```json
{
  "sku": "DTCD1B12856",
  "is_bundle": true,
  "components": [
    { "qty": 2, "name": "5.0Ah battery pack", "component_sku": "DTLBP550" },
    { "qty": 1, "name": "charger", "component_sku": "DTFCP540" }
  ]
}
```

catalog-admin has a full DB/export pipeline that could eventually push this into Medusa,
but it's heavier than this task needs (SQLite tables, Drizzle migrations, an export UI).
This design bypasses that pipeline and reads `bundles.json` directly, once, from a
standalone backend script.

## Decisions

- **New metadata key:** `metadata.included_accessories`, JSON-stringified array of
  `{ sku, qty, type, name }`, written on the **variant** (existing storefront code reads
  variant metadata before product metadata elsewhere — same precedence here).
- **`type`** is derived from `component_sku` prefix, not stored in `bundles.json`:
  `DTLBP*` / `DTLBS*` → `"battery"`, `DTFCP*` → `"charger"`, anything else → `"other"`.
- **Every SKU-linked component**, not just batteries/chargers — `bundles.json`
  components with a `component_sku` also include a few non-battery/charger accessories
  (`type: "other"`), so those are included too rather than needing a second migration
  later. **Components without a `component_sku` are excluded**: 1,142 of 1,260 bundle
  components (90%) in `bundles.json` are loose descriptive text with no linkable SKU
  (e.g. `"2 x tubulare (27mm, 30mm)"`) — since this field exists specifically to map to
  exact products, an unlinked line doesn't belong in it. The 118 components that do have
  a `component_sku` are almost entirely batteries/chargers (88 of 118).
- **Source of truth for this script:** `apps/catalog-admin/data/bundles.json`, read-only.
  No changes to catalog-admin's DB, export pipeline, or UI.
- **Matching:** exact, case-insensitive SKU match between a Medusa variant's `sku` and a
  `bundles.json` entry's `sku`. Verified today: 765 of 888 current backend product SKUs
  (86%) match exactly.
- **No fuzzy matching.** The remaining ~123 SKUs (14%) — including the example product
  itself, live SKU `DTCD1B1285` vs. the CSV's `DTCD1B12856`, a different/newer supplier
  line item — are **skipped**, not guessed. Guessing risks merging two genuinely
  different products.
- **Unmatched SKUs are reported**, not silently dropped: the script writes a JSON report
  (unmatched variant SKU, product title, handle) for manual reconciliation against the
  source CSV.
- **Idempotent:** each run fully replaces `metadata.included_accessories` on matched
  variants. Safe to re-run whenever `bundles.json` is regenerated.
- **Platform-agnostic:** because this reads real parsed data rather than a hardcoded
  voltage→SKU lookup table, 12V products get correct data automatically if present in
  `bundles.json` — no extra work to extend beyond the 20V platform.
- **Out of scope:** storefront/PDP rendering of the new field. `product-presentation.ts`
  only surfaces metadata keys it explicitly reads — a future PDP change would add a
  getter for `included_accessories`, but that's a separate follow-up, not part of this
  script.

## Script

New file: `apps/backend/src/scripts/ingco-map-included-accessories.ts`, following the
same Medusa `ExecArgs` script pattern as `ingco-classify.ts`. Writes are **variant-level**
(via `updateProductVariantsWorkflow`), not product-level: `bundles.json` is keyed per
individual SKU, and a multi-variant product (e.g. a tool sold in 2Ah/4Ah/5Ah kit options,
each its own variant/SKU) can have different included accessories per variant.
`updateProductsWorkflow` (used by `ingco-classify.ts`) only writes product-level
metadata, so this script uses the variant-scoped workflow instead — confirmed available
as `updateProductVariantsWorkflow` in `@medusajs/medusa/core-flows`, taking
`{ product_variants: [{ id, metadata }] }`.

```
apps/backend                              apps/catalog-admin
───────────                               ──────────────────
ingco-map-included-accessories.ts
  1. read ../catalog-admin/data/bundles.json (read-only)
  2. build Map<uppercase sku, bundle entry>
  3. query all product variants: id, sku, metadata, product.title, product.handle
     (ContainerRegistrationKeys.QUERY, entity "product_variant")
  4. for each variant:
       entry = map.get(variant.sku.toUpperCase())
       if !entry:
         record { variantSku, productTitle, productHandle, reason: "no_sku_match" } as unmatched
         continue
       linkedComponents = entry.components.filter(c => c.component_sku)  // drop unlinked text (90% of components)
       if !entry.is_bundle || linkedComponents.length === 0:
         record { variantSku, productTitle, productHandle, reason: "no_linked_components" } as unmatched
         continue
       included_accessories = linkedComponents.map(c => ({
         sku: c.component_sku,
         qty: c.qty,
         type: deriveType(c.component_sku),   // prefix rules above
         name: c.name,
       }))
       updateProductVariantsWorkflow: product_variants: [{ id: variant.id,
         metadata: { ...variant.metadata, included_accessories: JSON.stringify(included_accessories) } }]
  5. write report: data/included-accessories-unmatched-report.json (grouped by reason)
  6. log summary counts (matched / unmatched by reason / total)
```

- Runs via `medusa exec ./src/scripts/ingco-map-included-accessories.ts`, same invocation
  style as `ingco-classify.ts`.
- No new dependencies; reuses `readFile` + `JSON.parse` for `bundles.json`, the existing
  query-graph pattern from `ingco-classify.ts`, and `updateProductVariantsWorkflow` (new
  to this script, but a standard, documented Medusa core workflow already available in
  the installed `@medusajs/medusa` version — no package changes needed).
- `deriveType()` is a small pure function.

## Testing

- Dry-run mode via a `dryRun` exec arg (matching the existing convention in
  `ingco-classify.ts` / `ingco-categorize.ts`: `medusa exec ./src/scripts/... dryRun=true`,
  parsed from `args` in `ExecArgs`) that logs intended writes and still produces the
  unmatched report, without calling `updateProductVariantsWorkflow`, so the match rate
  can be reviewed before any writes happen.
- Manual verification: `DTDS204285` (a cordless drywall screwdriver, handle
  `surubelnita-pentru-rigips-cu-acumulator-204285`) exists in both the live backend
  catalog and `bundles.json`, and its bundle has 4 components — 2 unlinked (a bit and a
  connector, no `component_sku`) and 2 linked (`DTLBP520` battery, `DTFCP502` charger).
  After a real run, spot-check its Medusa variant has `metadata.included_accessories` =
  `[{"sku":"DTLBP520","qty":1,"type":"battery","name":"2.0Ah battery pack"},
{"sku":"DTFCP502","qty":1,"type":"charger","name":"charger"}]` — exactly 2 entries, the
  unlinked bit/connector correctly excluded.
- Confirm re-running the script twice in a row produces identical output (idempotency).
