# Algolia Search Integration — Design

**Date:** 2026-08-06
**Status:** Design (approved by user, pending write-up self-review)
**Scope:** Index Medusa product data into Algolia and use it to power (1) a live
typeahead in the storefront's Cmd+K search palette and (2) a faceted/sortable PLP on
`/store`. Sync is a scheduled, diff-based reindex — not real-time event subscribers.
No coupling to the in-progress 1C-apply pipeline beyond timing rationale.

## Context

DYLLU's storefront currently has two search surfaces, both backed directly by Medusa's
Postgres product search:

- A Cmd+K command palette (`apps/storefront/src/components/organisms/search-command.tsx`)
  that redirects to `/store?q=<term>` on Enter — no live results, no typeahead.
- The `/store` page (`apps/storefront/src/app/(main)/store/page.tsx`), which filters via
  a `q` query param passed straight to Medusa's `/store/products` endpoint
  (`apps/storefront/src/lib/data/products.ts`), plus an `on_sale` toggle computed
  client-request-time from `calculated_price` vs `original_amount`. Price-sort and the
  on-sale filter fall back to an expensive full-catalogue scan (see Storefront section).

The user wants both surfaces upgraded to Algolia-backed search, including a proper
faceted/sortable PLP, and wants this shipped quickly without sacrificing correctness.

**Explicitly out of scope:** any dependency on `packages/medusa-plugin-one-c`. That
pipeline is mid-implementation on this branch (see
`docs/superpowers/plans/2026-08-06-one-c-apply-updates.md`) and only plans/diffs 1C
changes so far — it does not yet write to Medusa. This feature indexes **whatever is
currently in Medusa**, regardless of how it got there (1C apply, manual admin edit, CSV
catalog sync). The "once a day, aligned with 1C's cadence" framing below is only a
scheduling justification, not a code dependency.

## Decisions carried into this design

1. **Algolia is the full source for search results (not match-only).** Price and
   on-sale status are denormalized into the Algolia record so the PLP can facet/sort by
   them without a second round-trip to Medusa. Trade-off accepted by the user: search
   results can be stale by up to a day (or until a manual "Sync now") relative to a
   Medusa price change. Given price changes are infrequent (mainly 1C-driven, not
   real-time), this is acceptable.
2. **Sync is scheduled + diff-based, not real-time.** A daily cron job reindexes only
   products that changed since the last successful run. No `product.created` /
   `product.updated` / `product.deleted` subscribers. A manual "Sync now" admin button
   exists as a safety net for immediate reindex.
3. **Single region/currency (MDL) assumed.** DYLLU is Moldova-only, not yet in
   production. One price per product is indexed, from the store's default region.
4. **Metadata is indexed generically**, flattened to a searchable blob, rather than
   hardcoding a specific "1C id" key — the exact metadata key isn't fixed in this
   codebase yet. This makes "search by 1C id" work automatically once that key exists,
   with zero 1C-specific code in this feature.
5. Work happens in an isolated git worktree (per user instruction), not in the current
   `codex/one-c-apply-updates` checkout.

## Architecture

```
┌─────────────────────────┐   daily cron    ┌──────────────────┐
│ src/jobs/                │ ───────────────▶│ AlgoliaModuleSvc  │
│ algolia-reindex.ts       │                  │ (src/modules/     │
│  - diff changed products │                  │  algolia)         │
│  - diff deleted products │ ◀─── upsert/del ─│  - indexData()    │
└─────────────────────────┘                  │  - deleteFromIndex│
        ▲                                     │  - search()       │
        │ manual trigger                      └──────────────────┘
┌─────────────────────────┐                            │
│ Admin: Settings→Algolia  │                            ▼
│ "Sync now" button        │                     Algolia index
│ POST /admin/algolia/sync │                     "dyllu_products"
└─────────────────────────┘                       (+ 3 replicas
                                                    for sort orders)
                                                            ▲
                                                            │ search
┌──────────────────────────┐   POST   ┌──────────────────────────┐
│ Storefront: /store PLP    │─────────▶│ /store/products/search    │
│ (product-feed.ts), Cmd+K  │          │ (Medusa store API route,  │
│ palette — plain fetch,    │◀─────────│  proxies to Algolia,      │
│ no client Algolia SDK     │  results │  Search key server-side)  │
└──────────────────────────┘          └──────────────────────────┘
```

### Backend: `src/modules/algolia`

Standard Medusa module, following the pattern in the Medusa Algolia guide:

- `service.ts` — wraps the `algoliasearch` client. Methods: `indexData(products)`,
  `deleteFromIndex(ids)`, `search(query, options)`, plus `getLastSyncedAt()` /
  `setLastSyncedAt(date)` backed by a single-row model owned by this module
  (`algolia_sync_state`: `id`, `last_synced_at`). This is the only new DB state this
  feature introduces.
- `index.ts` — module registration, exported as `ALGOLIA_MODULE`.
- Registered in `medusa-config.ts` with `appId` / `apiKey` (Admin key, server-only) /
  `productIndexName` from env.

### Sync job: `src/jobs/algolia-reindex.ts`

Medusa scheduled job, `schedule: "0 3 * * *"` (daily, off-peak; adjust once real traffic
patterns are known):

1. Read `last_synced_at` from the module's state (defaults to epoch on first run, which
   forces a full initial reindex).
2. Query products (`published` status only) via `useQueryGraphStep`/query module,
   including `variants.updated_at`, `variants.prices.updated_at`, `product.updated_at`,
   `product.deleted_at` (`withDeleted: true`).
3. For each product, compute `changedAt = max(product.updated_at, all variant.updated_at,
all price.updated_at)`. Products where `changedAt > last_synced_at` → upsert.
4. Products where `deleted_at` is set and `deleted_at > last_synced_at` → delete from
   index by id.
5. If no products matched either bucket, log "no changes, skipping reindex" and exit —
   no Algolia calls made.
6. On success, update `last_synced_at` to "now" (captured at job start, not end, to
   avoid missing changes that land mid-run).
7. Batch upserts/deletes (50 per Algolia call, matching the guide's pattern) to stay
   within payload limits.

Change detection reuses the same "latest changed timestamp across product/variant/price"
approach already implemented for 1C's read side in
`packages/medusa-plugin-one-c/src/infrastructure/medusa-adapters.ts` (`MedusaOneCCatalogReader`,
lines ~102-119) — same idea, reimplemented locally in the `algolia` module so this
feature has no import dependency on the 1C package.

### Manual trigger

- `POST /admin/algolia/sync` — runs the same logic as the scheduled job (diff-based, not
  a forced full reindex — a full reindex is available as a separate explicit option if
  ever needed, e.g. after an index settings change, but is not the default button
  behavior).
- Admin UI page `src/admin/routes/settings/algolia/page.tsx` — "Sync now" button, shows
  last synced time and a success/error toast, calling the route above via the Medusa
  Admin JS SDK.

### Algolia record shape (`dyllu_products` index)

| Field            | Source                                                                                                       | Notes                                                                                                                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `objectID`       | `product.id`                                                                                                 |                                                                                                                                                          |
| `title`          | `product.title`                                                                                              |                                                                                                                                                          |
| `description`    | `product.description`                                                                                        |                                                                                                                                                          |
| `handle`         | `product.handle`                                                                                             |                                                                                                                                                          |
| `thumbnail`      | `product.thumbnail`                                                                                          |                                                                                                                                                          |
| `skus`           | `variants[].sku`                                                                                             | array, searchable                                                                                                                                        |
| `variant_titles` | `variants[].title`                                                                                           | array, searchable                                                                                                                                        |
| `category_names` | `categories[].name`                                                                                          | searchable text                                                                                                                                          |
| `category_ids`   | `categories[].id`                                                                                            | facet — matches the Medusa category IDs already used by `/categories/[...category]` today, so existing category-page filtering needs no contract changes |
| `tags`           | `tags[].value`                                                                                               | facet                                                                                                                                                    |
| `metadata`       | flattened `product.metadata`                                                                                 | searchable text blob, no hardcoded keys                                                                                                                  |
| `price`          | `min(variants[].calculated_price.calculated_amount)` (default region)                                        | numeric "from" price, for sort/facet                                                                                                                     |
| `original_price` | `original_amount` of the same variant selected for `price`                                                   | numeric — kept paired so strikethrough math stays consistent                                                                                             |
| `on_sale`        | computed: `true` if the **same cheapest variant** used for `price` has `original_amount > calculated_amount` | boolean facet — tied to the displayed variant, not scanned across all variants, so the badge never disagrees with the shown price                        |
| `created_at`     | `product.created_at`                                                                                         | for "newest" sort                                                                                                                                        |

`title`/`description` get the same `ingco` → `DYLLU` text substitution the storefront
already applies via `normalizeCatalogBrand`
(`apps/storefront/src/lib/util/catalog-brand.ts`) — duplicated as a ~3-line pure
function on the backend side (trivial regex, not worth a shared package for) so search
results and typeahead never show the raw "Ingco" name.

Index settings: `searchableAttributes` = title, description, skus, variant_titles,
category_names, metadata blob (in that priority order). `attributesForFaceting` =
category_ids, tags, on_sale. Three replica indices for non-relevance sort:
`dyllu_products_price_asc`, `dyllu_products_price_desc`, `dyllu_products_newest`.

## Storefront

**Revised after reading the actual PLP code** (`apps/storefront/src/modules/store/lib/product-feed.ts`):
the storefront already has a complete filter/sort/pagination system — category routing,
an on-sale toggle, a price/newest sort dropdown (`SortOptions` already includes
`price_asc` / `price_desc` / `created_at`), infinite-scroll grid, filter sheet. Its own
code comments admit the gap this feature should close: whenever sort is price-based or
`onSale` is true, `fetchFullScanPage()` pulls the _entire_ catalogue and sorts/filters
it in memory, "because calculated price isn't a sortable/filterable column" in Postgres.
That's precisely what Algolia's indexed `price`/`on_sale` fields fix. So instead of
installing `react-instantsearch` and rebuilding the filter UI, this feature replaces
`fetchFullScanPage()`'s implementation with an Algolia-backed one and leaves every
existing UI component (`PlpShell`, `RefinementList`, `SortProducts`,
`InfiniteProductsGrid`) untouched. No `react-instantsearch` dependency, no new widgets,
no `NEXT_PUBLIC_ALGOLIA_*` env vars — **all** Algolia traffic (indexing and search)
stays server-side inside Medusa.

### `/store/products/search` (Medusa store API route)

- `POST`, body `{ query?, categoryIds?, onSale?, sort: "relevance" | "price_asc" | "price_desc" | "created_at", page, hitsPerPage }`
  (validated with zod, mirroring the existing storefront validation pattern).
- Resolves `ALGOLIA_MODULE`, calls `search()` against the base index (relevance/default)
  or the matching replica (`price_asc` / `price_desc` / `created_at` sort), applying
  `categoryIds`/`onSale` as `facetFilters`. Returns hits + `nbHits` + pagination as-is.
- This is the only place any Algolia key is used — called server-side both by the
  storefront's RSC data layer (PLP) and, via the same route, on each palette keystroke.

### `/store` PLP: swap the full-scan path for Algolia

- `product-feed.ts`: add `fetchAlgoliaPage(request)`, used wherever `usesBoundedFetch()`
  is currently `false` (i.e. whenever `query`, `onSale`, or a price sort is requested) —
  replacing `fetchFullScanPage()` entirely. Calls the search route above, passing
  `categoryIds`/`onSale`/`sort`/pagination straight through from the already-normalized
  request.
- `to-plp-product.ts`: add `toPlpProductFromHit(hit)`, a sibling to the existing
  `toPlpProduct()`, mapping an Algolia hit directly to the same `ProductFeedItem` shape
  (reusing `convertToLocale` + `getPercentageDiff` for the `price` sub-object, since
  Algolia hits carry raw numbers, not Medusa's `calculated_price` object).
- Everything above `product-feed.ts` (`StoreTemplate`, `PaginatedProducts`, grid,
  refinement list, sort dropdown) is unchanged — they already send exactly the request
  shape (`categoryIds`, `onSale`, `sortBy`, `query`) this needs.

### Cmd+K palette

- `search-command.tsx` gets a live-results section: as the user types (debounced),
  `POST /store/products/search` with `{ query, sort: "relevance", hitsPerPage: 5 }`,
  render hits (thumbnail, title, price) linking straight to the PDP, replacing the
  current static "Populare"/quick-links-only behavior for non-empty queries. Static
  quick links and recent-search history remain for the empty-query state.

## Error handling

- Sync job: Algolia API failures (network, rate limit) abort the run without advancing
  `last_synced_at`, so the next run retries the same diff window. Logged via Medusa's
  standard logger; no partial-success state persisted.
- Search route: Algolia errors return a `502` with an empty-results shape the frontend
  already knows how to render as "no results" (fails soft — search errors never crash
  the PLP).
- Storefront search client: network failure falls back to an inline "search
  unavailable" state, not a page crash.

## Testing

- Unit tests for the diff-detection logic in the `algolia` module (given fake
  product/variant/price timestamps and a `last_synced_at`, assert correct
  upsert/delete/skip buckets) — mirrors the existing test style in
  `packages/medusa-plugin-one-c/src/**/__tests__`.
- Unit tests for the Algolia record mapping function (product → index record), including
  the flattened-metadata and on-sale computation.
- Manual verification (per this project's testing policy — no mocking Medusa):
  run the job against local dev Medusa + a real (or Algolia sandbox) index, confirm
  correct upserts, then exercise both storefront surfaces in a browser.

## Rollout

1. Build in an isolated git worktree/branch.
2. Local dev: real Algolia app, throwaway index name to avoid touching anything
   production-adjacent.
3. Manual "Sync now" run against local Medusa data, verify index contents in the Algolia
   dashboard.
4. Verify both storefront surfaces locally (palette typeahead, `/store` facets/sort).
5. This backend isn't deployed yet (local dev only, per project state) — no production
   rollout step needed for now; ship to `main` once verified locally.

## Open assumptions to flag if wrong

- Single region/currency (MDL) — no multi-region price handling.
- Daily cron time (03:00) is a placeholder; no real traffic data yet to tune it.
- No real-time subscribers — new products / urgent price edits wait for the next daily
  run or a manual "Sync now" click.
