# Apply 1C Updates to Medusa — Design

**Date:** 2026-08-06
**Status:** Design (approved by user, pending write-up self-review)
**Scope:** Write regular price, sale price, and stock balance from confirmed 1C↔Medusa
product mappings into the live Medusa catalog, from the existing `one-c-connection`
Admin page. Matching strategy and mapping storage already exist on `origin/main`; this
design covers the write path only.

## Context

The 1C sync plugin (`packages/medusa-plugin-one-c`) already receives, normalizes, and
compares DYLLU-brand 1C products against Medusa variants, and — as of `origin/main`
(PRs #45–#48, merged 2026-08-05, not yet on this local branch) — already has:

- A name-token matching suggestion (`suggestSku` in `compare-catalog.ts`): finds a
  Medusa SKU embedded as a whole token in the 1C product's name.
- A dedicated, persistent mapping table (`dyllu_one_c_product_mapping`:
  `external_id` ↔ `medusa_variant_id` ↔ `medusa_sku`, unique both ways, tracked by
  `actor_id`), populated via a bulk "Review exact mappings" flow and a per-item manual
  mapping endpoint.
- An MCP tool (`get_mapped_one_c_product`) that reads price/balance only through a
  confirmed mapping.
- A UI affordance for "Apply all reviewed prices" that is **already present but hard
  `disabled`**, with tooltip "Locked while 1C uses plain HTTP" — the write path was
  deliberately never built because the 1C feed is plain HTTP with no integrity
  protection (see `docs/one-c-integration.md`, "Open questions before automatic sync").

**Decision carried into this design:** the user has explicitly accepted the plain-HTTP
transport risk for this feature. Mitigation is via guardrails and audit (below), not by
blocking on HTTPS from 1C.

Local branch note: this local checkout (`codex/one-c-category-feed`) is 25 commits
behind `origin/main` and does not have the mapping infrastructure above. Implementation
work branches from `origin/main`, not from this local branch.

## Fields in scope

Per user decision, exactly three fields are written to Medusa for confirmed-mapped,
non-excluded (`matched`) sync items:

1. **Regular price** (`regular_price_mdl`) — 1C price type `05`.
2. **Sale price** (`salePriceMdl` + presence, from `/pit_site_promo`) — see model below.
3. **Stock balance** (`balance`) — single Medusa stock location (confirmed: this store
   has exactly one).

Name and description are explicitly **out of scope** — they are free text and the
higher-risk fields to trust from an unauthenticated plain-HTTP source; they remain
comparison-only, as today.

## Sale price model

Medusa v2's Price List `starts_at`/`ends_at` are **list-level fields, not per-price** —
one list's active window applies to every price inside it. Since different DYLLU
products can have different, overlapping 1C promo windows, a single shared list can't
rely on Medusa's own date engine to gate individual products.

**Decision:** one dedicated Price List ("1C sale prices", `type: "sale"`, no
`starts_at`/`ends_at`) holding a row per variant currently on sale. Presence is decided
entirely by our own apply-time logic against the 1C promo feed, not by Medusa's date
resolution:

- 1C's `/pit_site_promo` currently returns a promo entry for this product →
  upsert a sale-price row (variant, MDL amount) in the list.
- 1C's promo feed no longer has an entry for this product → remove its row.

Trade-off accepted explicitly by the user: the sale price is only as fresh as the last
manual "Receive fresh 1C data" + apply, exactly like price and stock in this same
design. This is consistent with the project's existing manual-only sync policy — nothing
in this system updates in real time regardless of field.

**Storefront:** no changes needed. `apps/storefront/src/lib/util/get-product-price.ts`
and `apps/storefront/src/components/molecules/price-block.tsx` already render
`calculated_price` vs `original_price` with a strikethrough + percentage badge whenever
a `sale`-type Price List resolves for a variant. Once the workflow populates the "1C
sale prices" list correctly, the PDP reflects it with no storefront code changes.

## Architecture

```
Admin clicks "Apply all reviewed prices" (bulk)      Admin clicks "Apply" on one row
   │  POST /admin/one-c-sync/runs/:id/apply             │  POST /admin/one-c-sync/runs/:id/items/:item_id/apply
   └──────────────────┬──────────────────────────────────┘
                       ▼
        load matched, mapped sync items for the run
                       │
                       ▼
        per item: compute proposed price / sale-price / stock diff
        against current Medusa state
                       │
                       ▼
        guardrail check (see below) ──► exceeds threshold ─► mark
                       │  within threshold                    needs_review, skip
                       ▼
        applyOneCUpdatesWorkflow.run({ variantId, price?, salePrice?, stock? })
                       │
         ┌─────────────┼─────────────────┐
         ▼             ▼                 ▼
  updateRegularPriceStep  updateSalePriceStep  updateStockStep
  (compensation: restore   (compensation: restore  (compensation: restore
   prior money amount)      prior list membership)   prior stocked_quantity)
                       │
                       ▼
        write dyllu_one_c_applied_change audit row(s)
        (before, after, actor_id, applied_at, status)
                       │
                       ▼
        return summary: { applied_count, flagged_count, failed_count }
```

### New Medusa Workflow: `applyOneCUpdatesWorkflow`

`packages/medusa-plugin-one-c/src/workflows/apply-one-c-updates.ts`. Three independent
steps, each with a Medusa workflow **compensation function**, so a failure partway
through (e.g. stock update fails after price and sale price already wrote) rolls back
what already succeeded instead of leaving a product half-updated:

- `updateRegularPriceStep` — updates the MDL money amount on the variant's existing
  base price (the price `id` is already captured today in `MedusaCatalogVariant.prices`).
  Compensation: restore the prior amount.
- `updateSalePriceStep` — upserts or removes the variant's row in the "1C sale prices"
  Price List per the model above. Compensation: restore prior list membership/amount.
- `updateStockStep` — updates the inventory level `stocked_quantity` for the variant's
  inventory item at the single stock location. Compensation: restore prior quantity.

Steps run only for the fields that actually changed for that item (a stock-only change
does not re-write an unchanged price).

### Guardrail

Before invoking the workflow for an item, compare proposed vs current value for price
and stock independently:

- `abs(proposed - current) / current > threshold` → flagged, not applied.
- `current` is `0` or `null` → always flagged (a percentage against zero/absent is
  meaningless; a brand-new price or stock figure on an already-matched product deserves
  a human look).
- Default threshold: **50%**, defined as a code constant (not a new production env var
  — per project policy, new production-required config isn't introduced casually; a
  constant can become an env-configurable value later behind a backward-compatible
  default if the threshold needs tuning without a deploy).
- Sale price uses the same percentage check against the proposed sale amount.
- Flagged items are marked via the existing `preparation_status` field on sync items
  (no new column) — reusing infrastructure already in place rather than adding a
  parallel status field.

Bulk apply skips flagged items automatically (they remain visible and individually
applicable). Per-item apply on a flagged item still runs the same guardrail check and
will refuse unless the admin is looking at that specific item (i.e. there is no bypass
path — flagging is a hard stop, not a warning, until addressed via the per-item
endpoint, which reports the flag back to the caller rather than silently overriding it).

### Two trigger surfaces, one code path

- **Bulk:** `POST /admin/one-c-sync/runs/:id/apply` — enables the existing UI button.
  Applies every eligible confirmed-mapped (`matched`) item in the run; returns counts of
  applied/flagged/failed.
- **Per-item:** `POST /admin/one-c-sync/runs/:id/items/:item_id/apply` — for a single
  row, whether flagged or not.

Both resolve to the same guardrail check + `applyOneCUpdatesWorkflow` call; there is one
implementation of "what does applying mean," not two.

### Audit model

New model in the plugin module (migration required):

```
dyllu_one_c_applied_change
  id            (prefix: onecapplied)
  run_id
  sync_item_id
  medusa_variant_id
  field           "regular_price_mdl" | "sale_price_mdl" | "balance"
  before          jsonb
  after           jsonb
  actor_id
  applied_at
  status          "applied" | "flagged" | "failed"
  error_message   nullable
```

One row per field per item per apply attempt (so a single item's price+stock apply
produces two audit rows). This gives a complete trail of who changed what and when, and
is the foundation for a future manual "revert" action (out of scope here — this design
only records the data needed to build one later).

### Admin UI changes

- Comparison table: extend the diff view to show sale price as **old → new**, with the
  1C promo's dates shown for context (display only — the dates are not written into
  Medusa, per the sale-price model above).
- Enable the existing "Apply all reviewed prices" button, wired to the bulk endpoint.
- Add a per-item "Apply" action on each matched row.
- Visually distinguish `needs_review`/flagged items from normal matched items.

## Out of scope

- Name/description write-back (comparison-only, unchanged).
- Automatic/scheduled apply — this remains a manual, admin-triggered action per run,
  consistent with the project's existing "no automatic mutations" policy.
- A "revert" UI action (the audit table lays the groundwork; building the revert flow
  itself is separate follow-up work).
- Mirroring the 1C id onto Medusa variant metadata for visibility — raised during
  design, deferred; the existing dedicated mapping table remains the sole source of
  truth for now.
- Multiple stock locations (confirmed: this store has exactly one).

## Testing

- Unit: guardrail threshold logic (boundary cases: exactly at threshold, current = 0,
  current = null, negative proposed values).
- Unit: sale-price upsert/remove decision logic against a fake current-list-membership
  state and a fake promo-feed state.
- Workflow test: compensation actually restores prior values when a later step fails
  (simulate stock step throwing after price step succeeds).
- Integration: bulk apply against a local Medusa with seeded variants/prices/stock —
  assert applied items match expected before/after, flagged items are untouched, audit
  rows are correct.
- Manual: one bulk apply run against local dev Medusa; verify storefront PDP shows the
  sale strikethrough with no storefront code changes.
