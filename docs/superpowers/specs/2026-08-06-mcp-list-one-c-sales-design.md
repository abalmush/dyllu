# MCP capability: `list_one_c_sales`

## Problem

A manager refreshed the 1C feed through the DYLLU MCP and got 966 products,
884 matched to Medusa, 82 missing — but could not review or submit any
discounts, because no MCP tool exposes the stored 1C promotion price, SKU,
validity dates, or mapping status per product. `propose_sale_create` (submit
up to 100 variants) already exists and needs no changes.

## Root cause

The promo data is already parsed and stored per sync item:
`packages/medusa-plugin-one-c/src/api/read-model.ts` (`itemDto`) computes
`sale_price_mdl`, `sale_starts_at`, `sale_ends_at` from the 1C
`/pit_site_promo` feed and stores them in `dyllu_one_c_sync_item.normalized`.
The MCP-facing adapter `packages/medusa-plugin-one-c/src/access.ts`
(`listComparisons`) drops those three fields before handing data to the MCP
application layer. No new 1C parsing is required.

`transportTrusted: false` is expected, permanent behavior while 1C is
plain HTTP (see `docs/one-c-integration.md`) — informational only, and does
not block read-only proposal review.

## Design

1. **`packages/medusa-plugin-one-c/src/contracts.ts`** — add
   `listSales(input: { runId?: string; limit: number; offset: number }): Promise<unknown>`
   to `OneCSyncAccess`.
2. **`packages/medusa-plugin-one-c/src/access.ts`** — implement `listSales`:
   fetch all items for the run via `service.listAndCountOneCSyncItems` with
   `take: 10_000` (same full-scan pattern as the existing CSV/JSON export —
   DYLLU-brand-scoped feeds stay under 1,000 items), keep only items where
   `sale_price_mdl` is not null, map each to
   `{ sku, dyllu_variant_id, regular_price_mdl, sale_price_mdl, starts_at, ends_at, mapping_status }`
   (renaming `missing_medusa` → `missing_dyllu`, matching
   `list_one_c_product_mismatches`'s existing convention), then paginate the
   filtered list in-memory with `limit`/`offset`. Return
   `{ run_id, items, count, limit, offset }`.
3. **`packages/medusa-plugin-dyllu-mcp/src/application/product-change-application.ts`**
   — add `listOneCSales(context, input: { runId?, limit, offset })`, requiring
   the existing `one_c_sync.read` capability (no new capability), delegating
   to `this.requireOneCSync().listSales(input)`. Mirrors `listOneCComparisons`.
4. **`packages/medusa-plugin-dyllu-mcp/src/mcp/server.ts`** — register a new
   read-only tool `list_one_c_sales`:
   - input: `run_id?` (string), `limit` (1-100, default 20), `offset` (0-10000,
     default 0)
   - description: stored-snapshot only, does not call 1C
   - add one line to the server instructions: use `list_one_c_sales` before
     `propose_sale_create` to find stored 1C promotion prices, validity
     dates, and mapped Medusa variant IDs.
5. Unit tests: `access.ts` mapping/pagination behavior, and
   `product-change-application.ts` capability-gating + delegation, following
   the existing spec files in each package's `__tests__` directories.

## Out of scope

- No automatic/scheduled apply of 1C sale prices — proposals still require
  explicit manager review and `publish_sale_change` confirmation, unchanged.
- No new capability or permission type.
- No schema/migration changes — the data is already stored.
