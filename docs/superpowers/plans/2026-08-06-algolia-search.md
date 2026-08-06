# Algolia Search Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Index Medusa product data into Algolia via a daily diff-based reindex, and use it to power a live Cmd+K typeahead and the `/store` PLP's price-sort/on-sale path (replacing an existing full-catalogue-scan fallback), without any Algolia SDK or key ever reaching the browser.

**Architecture:** A new `algolia` Medusa module (backend) owns the Algolia client, a one-row sync-state table, and pure functions for change-detection and record-mapping. A daily scheduled job (+ a manual admin "Sync now" button) diffs and upserts. A single store API route (`/store/products/search`) proxies all search traffic; the storefront's existing `product-feed.ts` and the Cmd+K palette both call it — no new storefront dependency, no UI rewrite.

**Tech Stack:** `algoliasearch` v5 JS client (backend only), Medusa v2 modules/jobs/scripts, Vitest for unit tests.

**Runs in an isolated git worktree** (per user instruction) — set up via the `superpowers:using-git-worktrees` skill at execution time, not as a task below.

---

## Spec reference

Full design: `docs/superpowers/specs/2026-08-06-algolia-search-design.md`. Read it once before starting; this plan implements it task-by-task.

## File map

**Backend (`apps/backend`):**

- `src/config/environment.ts` — modify: add optional `algolia` env group
- `.env.example` — modify: document new vars
- `src/modules/algolia/models/sync-state.ts` — create
- `src/modules/algolia/models/index.ts` — create
- `src/modules/algolia/lib/normalize-brand.ts` — create (duplicated ~3-line rebrand regex)
- `src/modules/algolia/lib/build-record.ts` — create (product → Algolia record, pure)
- `src/modules/algolia/lib/build-record.unit.spec.ts` — create
- `src/modules/algolia/lib/plan-reindex.ts` — create (diff-detection, pure)
- `src/modules/algolia/lib/plan-reindex.unit.spec.ts` — create
- `src/modules/algolia/service.ts` — create
- `src/modules/algolia/index.ts` — create
- `medusa-config.ts` — modify: register module conditionally
- `src/jobs/algolia-reindex.ts` — create
- `src/api/_shared/contracts.ts` — modify: add search + sync schemas
- `src/api/store/products/search/route.ts` — create
- `src/api/admin/algolia/sync/route.ts` — create
- `src/api/middlewares.ts` — modify: register both routes
- `src/admin/routes/settings/algolia/page.tsx` — create
- `src/scripts/algolia-configure-index.ts` — create (one-time index settings script)

**Storefront (`apps/storefront`):**

- `src/lib/data/algolia-search.ts` — create (server-only fetch wrapper)
- `src/modules/store/lib/product-feed.ts` — modify: replace `fetchFullScanPage`
- `src/modules/store/lib/to-plp-product.ts` — modify: add `toPlpProductFromHit`
- `src/app/api/search/route.ts` — create (typeahead endpoint)
- `src/components/organisms/search-command.tsx` — modify: live results

---

### Task 1: Environment config for Algolia

**Files:**

- Modify: `apps/backend/src/config/environment.ts`
- Modify: `apps/backend/.env.example`

- [ ] **Step 1: Add the four Algolia keys to the raw schema and a grouped, optional `AlgoliaEnvironment` type**

In `apps/backend/src/config/environment.ts`, add to `rawEnvironmentSchema`'s object (after `DYLLU_MCP_BOOTSTRAP_USER_IDS: optionalString,`):

```ts
    ALGOLIA_APP_ID: optionalString,
    ALGOLIA_ADMIN_API_KEY: optionalString,
    ALGOLIA_SEARCH_API_KEY: optionalString,
    ALGOLIA_PRODUCT_INDEX_NAME: optionalString,
```

Add near the `S3Environment` type:

```ts
export type AlgoliaEnvironment = {
  appId: string;
  adminApiKey: string;
  searchApiKey: string;
  indexName: string;
};
```

Add `algolia?: AlgoliaEnvironment;` to `BackendEnvironment` (next to `s3?: S3Environment;`).

- [ ] **Step 2: Validate the group as "required together", mirroring the existing Resend block**

After the `hasAnyResendValue` block (before `if (issues.length > 0)`), add:

```ts
const ALGOLIA_KEYS = [
  "ALGOLIA_APP_ID",
  "ALGOLIA_ADMIN_API_KEY",
  "ALGOLIA_SEARCH_API_KEY",
  "ALGOLIA_PRODUCT_INDEX_NAME",
] as const;
const hasAnyAlgoliaValue = ALGOLIA_KEYS.some((key) => Boolean(env[key]));
if (hasAnyAlgoliaValue) {
  for (const key of ALGOLIA_KEYS) {
    if (!env[key])
      issues.push(`${key} is required when Algolia search is configured`);
  }
}
```

- [ ] **Step 3: Build the grouped value in the return statement**

Next to `resend: hasAnyResendValue ? {...} : undefined,` add:

```ts
    algolia: hasAnyAlgoliaValue
      ? {
          appId: env.ALGOLIA_APP_ID!,
          adminApiKey: env.ALGOLIA_ADMIN_API_KEY!,
          searchApiKey: env.ALGOLIA_SEARCH_API_KEY!,
          indexName: env.ALGOLIA_PRODUCT_INDEX_NAME!,
        }
      : undefined,
```

This is deliberately optional and NOT added to `PRODUCTION_REQUIRED_KEYS` — Algolia search is an additive feature; the backend must boot fine without it configured (per this project's production-safety rule against mandatory new env vars in a one-step rollout).

- [ ] **Step 4: Document the vars in `.env.example`**

Append to `apps/backend/.env.example`:

```
# Algolia search (optional — omit all four to leave search disabled)
# ALGOLIA_APP_ID=
# ALGOLIA_ADMIN_API_KEY=
# ALGOLIA_SEARCH_API_KEY=
# ALGOLIA_PRODUCT_INDEX_NAME=dyllu_products
```

- [ ] **Step 5: Typecheck and commit**

Run: `pnpm --filter @dyllu/backend exec tsc --noEmit`
Expected: no new errors.

```bash
git add apps/backend/src/config/environment.ts apps/backend/.env.example
git commit -m "DYLLU-000 Add optional Algolia environment config"
```

---

### Task 2: `algolia` module scaffold — sync-state model

**Files:**

- Create: `apps/backend/src/modules/algolia/models/sync-state.ts`
- Create: `apps/backend/src/modules/algolia/models/index.ts`
- Create: `apps/backend/src/modules/algolia/index.ts`
- Create: `apps/backend/src/modules/algolia/service.ts` (model registration only for now — client methods come in Task 5)

- [ ] **Step 1: Install the Algolia client**

Run: `pnpm --filter @dyllu/backend add algoliasearch`
Expected: `apps/backend/package.json` gains an `algoliasearch` dependency.

- [ ] **Step 2: Define the sync-state model**

`apps/backend/src/modules/algolia/models/sync-state.ts`:

```ts
import { model } from "@medusajs/framework/utils";

export const AlgoliaSyncState = model.define("dyllu_algolia_sync_state", {
  id: model.id({ prefix: "algsync" }).primaryKey(),
  last_synced_at: model.dateTime().nullable(),
});
```

`apps/backend/src/modules/algolia/models/index.ts`:

```ts
export * from "./sync-state";
```

- [ ] **Step 3: Module service and registration**

`apps/backend/src/modules/algolia/service.ts`:

```ts
import { MedusaService } from "@medusajs/framework/utils";

import { AlgoliaSyncState } from "./models";

class AlgoliaModuleService extends MedusaService({
  AlgoliaSyncState,
}) {
  async getLastSyncedAt(): Promise<Date | null> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    return state?.last_synced_at ?? null;
  }

  async recordSyncCompleted(at: Date): Promise<void> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    if (state) {
      await this.updateAlgoliaSyncStates({
        id: state.id,
        last_synced_at: at,
      });
    } else {
      await this.createAlgoliaSyncStates({ last_synced_at: at });
    }
  }
}

export default AlgoliaModuleService;
```

`apps/backend/src/modules/algolia/index.ts`:

```ts
import { Module } from "@medusajs/framework/utils";

import AlgoliaModuleService from "./service";

export const ALGOLIA_MODULE = "algolia";

export default Module(ALGOLIA_MODULE, {
  service: AlgoliaModuleService,
});
```

- [ ] **Step 4: Register the module in `medusa-config.ts`, gated on env presence**

In `apps/backend/medusa-config.ts`, inside the `modules: [` array (after the closing `]` of the Redis-conditional block, as a sibling entry), add:

```ts
    ...(environment.algolia
      ? [
          {
            resolve: "./src/modules/algolia",
            options: environment.algolia,
          },
        ]
      : []),
```

- [ ] **Step 5: Generate the migration**

Run: `pnpm --filter @dyllu/backend exec medusa db:generate algolia`
Expected: a new file under `apps/backend/src/modules/algolia/migrations/Migration<timestamp>.ts` creating `dyllu_algolia_sync_state`. Inspect it — it should contain `create table` for that one table with `id`, `last_synced_at`, plus Medusa's standard `created_at`/`updated_at`/`deleted_at`.

- [ ] **Step 6: Run the migration locally**

Run: `pnpm --filter @dyllu/backend db:migrate`
Expected: migration applies without error (requires local Postgres running — `docker compose -f apps/backend/docker-compose.yml up -d` if not already up).

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm --filter @dyllu/backend exec tsc --noEmit`

```bash
git add apps/backend/package.json apps/backend/pnpm-lock.yaml apps/backend/src/modules/algolia apps/backend/medusa-config.ts
git commit -m "DYLLU-000 Scaffold algolia module with sync-state tracking"
```

---

### Task 3: Brand text normalization (backend copy)

**Files:**

- Create: `apps/backend/src/modules/algolia/lib/normalize-brand.ts`
- Test: `apps/backend/src/modules/algolia/lib/normalize-brand.unit.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { normalizeCatalogBrand } from "./normalize-brand";

describe("normalizeCatalogBrand", () => {
  it("replaces ingco with DYLLU case-insensitively", () => {
    expect(normalizeCatalogBrand("Ingco Impact Drill")).toBe(
      "DYLLU Impact Drill"
    );
    expect(normalizeCatalogBrand("INGCO 20V Set")).toBe("DYLLU 20V Set");
  });

  it("leaves unrelated text untouched", () => {
    expect(normalizeCatalogBrand("Burghiu SDS+")).toBe("Burghiu SDS+");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia/lib/normalize-brand.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export function normalizeCatalogBrand(value: string): string {
  return value.replace(/ingco/gi, "DYLLU");
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia/lib/normalize-brand.unit.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/algolia/lib/normalize-brand.ts apps/backend/src/modules/algolia/lib/normalize-brand.unit.spec.ts
git commit -m "DYLLU-000 Add backend copy of catalog brand normalization"
```

---

### Task 4: Diff-detection (`plan-reindex`)

**Files:**

- Create: `apps/backend/src/modules/algolia/lib/plan-reindex.ts`
- Test: `apps/backend/src/modules/algolia/lib/plan-reindex.unit.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import { planReindex, type ReindexInput } from "./plan-reindex";

const base: ReindexInput = {
  id: "prod_1",
  updatedAt: new Date("2026-08-01T00:00:00Z"),
  deletedAt: null,
  variants: [
    {
      updatedAt: new Date("2026-08-01T00:00:00Z"),
      prices: [{ updatedAt: new Date("2026-08-01T00:00:00Z") }],
    },
  ],
};

describe("planReindex", () => {
  it("upserts a product whose product.updated_at is newer than last sync", () => {
    const { toUpsert, toDelete } = planReindex(
      [base],
      new Date("2026-07-31T00:00:00Z")
    );
    expect(toUpsert.map((p) => p.id)).toEqual(["prod_1"]);
    expect(toDelete).toEqual([]);
  });

  it("upserts a product whose only change is a price timestamp", () => {
    const product: ReindexInput = {
      ...base,
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      variants: [
        {
          updatedAt: new Date("2026-07-01T00:00:00Z"),
          prices: [{ updatedAt: new Date("2026-08-02T00:00:00Z") }],
        },
      ],
    };
    const { toUpsert } = planReindex(
      [product],
      new Date("2026-08-01T00:00:00Z")
    );
    expect(toUpsert.map((p) => p.id)).toEqual(["prod_1"]);
  });

  it("skips a product with no changes since last sync", () => {
    const { toUpsert, toDelete } = planReindex(
      [base],
      new Date("2026-08-02T00:00:00Z")
    );
    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual([]);
  });

  it("deletes a product soft-deleted after last sync, and does not also upsert it", () => {
    const product: ReindexInput = {
      ...base,
      deletedAt: new Date("2026-08-02T00:00:00Z"),
    };
    const { toUpsert, toDelete } = planReindex(
      [product],
      new Date("2026-08-01T00:00:00Z")
    );
    expect(toUpsert).toEqual([]);
    expect(toDelete.map((p) => p.id)).toEqual(["prod_1"]);
  });

  it("ignores a product deleted before the last sync (already handled)", () => {
    const product: ReindexInput = {
      ...base,
      deletedAt: new Date("2026-07-01T00:00:00Z"),
    };
    const { toUpsert, toDelete } = planReindex(
      [product],
      new Date("2026-08-01T00:00:00Z")
    );
    expect(toUpsert).toEqual([]);
    expect(toDelete).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia/lib/plan-reindex.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export type ReindexInput = {
  id: string;
  updatedAt: Date;
  deletedAt: Date | null;
  variants: {
    updatedAt: Date;
    prices: { updatedAt: Date }[];
  }[];
};

export type ReindexPlan<T extends ReindexInput> = {
  toUpsert: T[];
  toDelete: T[];
};

export function planReindex<T extends ReindexInput>(
  products: T[],
  lastSyncedAt: Date
): ReindexPlan<T> {
  const toUpsert: T[] = [];
  const toDelete: T[] = [];

  for (const product of products) {
    if (product.deletedAt) {
      if (product.deletedAt > lastSyncedAt) toDelete.push(product);
      continue;
    }

    const timestamps = [
      product.updatedAt,
      ...product.variants.map((v) => v.updatedAt),
      ...product.variants.flatMap((v) => v.prices.map((p) => p.updatedAt)),
    ];
    const changedAt = timestamps.reduce((latest, current) =>
      current > latest ? current : latest
    );

    if (changedAt > lastSyncedAt) toUpsert.push(product);
  }

  return { toUpsert, toDelete };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia/lib/plan-reindex.unit.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/algolia/lib/plan-reindex.ts apps/backend/src/modules/algolia/lib/plan-reindex.unit.spec.ts
git commit -m "DYLLU-000 Add diff-detection for Algolia reindex"
```

---

### Task 5: Record mapping (`build-record`)

**Files:**

- Create: `apps/backend/src/modules/algolia/lib/build-record.ts`
- Test: `apps/backend/src/modules/algolia/lib/build-record.unit.spec.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";

import { buildAlgoliaRecord, type ProductForIndexing } from "./build-record";

const product: ProductForIndexing = {
  id: "prod_1",
  title: "Ingco Impact Drill",
  description: "Powerful Ingco drill",
  handle: "impact-drill",
  thumbnail: "https://cdn.dyllu.md/thumb.jpg",
  status: "published",
  created_at: "2026-01-01T00:00:00Z",
  metadata: { one_c_external_id: "51542", note: "featured" },
  tags: [{ value: "power-tools" }],
  categories: [{ id: "pcat_1", name: "Scule electrice" }],
  variants: [
    {
      sku: "SKU-1",
      title: "Default",
      calculated_price: { calculated_amount: 900, original_amount: 1200 },
    },
    {
      sku: "SKU-2",
      title: "Kit",
      calculated_price: { calculated_amount: 1500, original_amount: 1500 },
    },
  ],
};

describe("buildAlgoliaRecord", () => {
  it("normalizes the brand in title and description", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.title).toBe("DYLLU Impact Drill");
    expect(record.description).toBe("Powerful DYLLU drill");
  });

  it("picks the minimum-price variant for price/original_price, paired", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.price).toBe(900);
    expect(record.original_price).toBe(1200);
  });

  it("flags on_sale true if any variant is discounted", () => {
    expect(buildAlgoliaRecord(product).on_sale).toBe(true);
  });

  it("flags on_sale false if no variant is discounted", () => {
    const noSale: ProductForIndexing = {
      ...product,
      variants: [
        {
          sku: "SKU-1",
          title: "Default",
          calculated_price: { calculated_amount: 900, original_amount: 900 },
        },
      ],
    };
    expect(buildAlgoliaRecord(noSale).on_sale).toBe(false);
  });

  it("flattens metadata into a searchable string, including arbitrary keys like a 1C id", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.metadata).toContain("51542");
    expect(record.metadata).toContain("featured");
  });

  it("collects skus, variant titles, category names and ids", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.skus).toEqual(["SKU-1", "SKU-2"]);
    expect(record.variant_titles).toEqual(["Default", "Kit"]);
    expect(record.category_names).toEqual(["Scule electrice"]);
    expect(record.category_ids).toEqual(["pcat_1"]);
  });

  it("uses the product id as objectID", () => {
    expect(buildAlgoliaRecord(product).objectID).toBe("prod_1");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia/lib/build-record.unit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { normalizeCatalogBrand } from "./normalize-brand";

export type ProductForIndexing = {
  id: string;
  title: string;
  description: string | null;
  handle: string;
  thumbnail: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  tags: { value: string }[];
  categories: { id: string; name: string }[];
  variants: {
    sku: string | null;
    title: string;
    calculated_price: {
      calculated_amount: number;
      original_amount: number;
    } | null;
  }[];
};

export type AlgoliaProductRecord = {
  objectID: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string | null;
  skus: string[];
  variant_titles: string[];
  category_names: string[];
  category_ids: string[];
  tags: string[];
  metadata: string;
  price: number | null;
  original_price: number | null;
  on_sale: boolean;
  created_at: number;
};

function flattenMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  return Object.values(metadata)
    .filter(
      (value): value is string | number =>
        typeof value === "string" || typeof value === "number"
    )
    .map(String)
    .join(" ");
}

export function buildAlgoliaRecord(
  product: ProductForIndexing
): AlgoliaProductRecord {
  const pricedVariants = product.variants.filter(
    (
      v
    ): v is typeof v & {
      calculated_price: NonNullable<typeof v.calculated_price>;
    } => v.calculated_price !== null
  );

  const cheapest = pricedVariants.reduce<
    (typeof pricedVariants)[number] | null
  >(
    (lowest, variant) =>
      !lowest ||
      variant.calculated_price.calculated_amount <
        lowest.calculated_price.calculated_amount
        ? variant
        : lowest,
    null
  );

  return {
    objectID: product.id,
    title: normalizeCatalogBrand(product.title),
    description: normalizeCatalogBrand(product.description ?? ""),
    handle: product.handle,
    thumbnail: product.thumbnail,
    skus: product.variants
      .map((v) => v.sku)
      .filter((sku): sku is string => Boolean(sku)),
    variant_titles: product.variants.map((v) => v.title),
    category_names: product.categories.map((c) => c.name),
    category_ids: product.categories.map((c) => c.id),
    tags: product.tags.map((t) => t.value),
    metadata: flattenMetadata(product.metadata),
    price: cheapest?.calculated_price.calculated_amount ?? null,
    original_price: cheapest?.calculated_price.original_amount ?? null,
    on_sale: pricedVariants.some(
      (v) =>
        v.calculated_price.original_amount >
        v.calculated_price.calculated_amount
    ),
    created_at: new Date(product.created_at).getTime(),
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia/lib/build-record.unit.spec.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/algolia/lib/build-record.ts apps/backend/src/modules/algolia/lib/build-record.unit.spec.ts
git commit -m "DYLLU-000 Add product-to-Algolia-record mapping"
```

---

### Task 6: Algolia client wrapper on the module service

**Files:**

- Modify: `apps/backend/src/modules/algolia/service.ts`

- [ ] **Step 1: Add client methods**

Extend `AlgoliaModuleService` (from Task 2) with a client and three methods. Replace the full file:

```ts
import { algoliasearch, type SearchClient } from "algoliasearch";
import { MedusaService } from "@medusajs/framework/utils";

import { AlgoliaSyncState } from "./models";
import type { AlgoliaProductRecord } from "./lib/build-record";

type ModuleOptions = {
  appId: string;
  adminApiKey: string;
  searchApiKey: string;
  indexName: string;
};

type SearchArgs = {
  query?: string;
  categoryIds?: string[];
  onSale?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "created_at";
  page?: number;
  hitsPerPage?: number;
};

class AlgoliaModuleService extends MedusaService({
  AlgoliaSyncState,
}) {
  private adminClient: SearchClient;
  private searchClient: SearchClient;
  private indexName: string;

  constructor(container: unknown, options: ModuleOptions) {
    super(container, options);
    this.adminClient = algoliasearch(options.appId, options.adminApiKey);
    this.searchClient = algoliasearch(options.appId, options.searchApiKey);
    this.indexName = options.indexName;
  }

  async getLastSyncedAt(): Promise<Date | null> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    return state?.last_synced_at ?? null;
  }

  async recordSyncCompleted(at: Date): Promise<void> {
    const [state] = await this.listAlgoliaSyncStates({}, { take: 1 });
    if (state) {
      await this.updateAlgoliaSyncStates({
        id: state.id,
        last_synced_at: at,
      });
    } else {
      await this.createAlgoliaSyncStates({ last_synced_at: at });
    }
  }

  async indexData(records: AlgoliaProductRecord[]): Promise<void> {
    if (records.length === 0) return;
    const batches = chunk(records, 50);
    for (const batch of batches) {
      await this.adminClient.saveObjects({
        indexName: this.indexName,
        objects: batch,
      });
    }
  }

  async deleteFromIndex(objectIDs: string[]): Promise<void> {
    if (objectIDs.length === 0) return;
    const batches = chunk(objectIDs, 50);
    for (const batch of batches) {
      await this.adminClient.deleteObjects({
        indexName: this.indexName,
        objectIDs: batch,
      });
    }
  }

  async search({
    query,
    categoryIds,
    onSale,
    sort = "relevance",
    page = 0,
    hitsPerPage = 20,
  }: SearchArgs) {
    const indexName =
      sort === "relevance" ? this.indexName : `${this.indexName}_${sort}`;

    const facetFilters: string[][] = [];
    if (categoryIds?.length) {
      facetFilters.push(categoryIds.map((id) => `category_ids:${id}`));
    }
    if (onSale) {
      facetFilters.push(["on_sale:true"]);
    }

    const { results } = await this.searchClient.search([
      {
        indexName,
        query: query ?? "",
        params: { page, hitsPerPage, facetFilters },
      },
    ]);

    const [result] = results;
    return result;
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

export default AlgoliaModuleService;
```

- [ ] **Step 2: Verify the installed `algoliasearch` API matches**

Run: `grep -n "saveObjects\|deleteObjects\|export function search\b" node_modules/.pnpm/algoliasearch@*/node_modules/algoliasearch/dist/node.d.ts 2>/dev/null | head -20`
(path may vary by pnpm layout — if not found, run `pnpm --filter @dyllu/backend exec node -e "console.log(Object.keys(require('algoliasearch').algoliasearch('x','y')))"` instead)
Expected: `saveObjects`, `deleteObjects`, and `search` (or `searchSingleIndex`) appear. If the installed version exposes `searchSingleIndex` instead of a multi-query `search`, adjust the `search()` method to call `this.searchClient.searchSingleIndex({ indexName, searchParams: { query, page, hitsPerPage, facetFilters } })` and return that result directly (same field usage).

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @dyllu/backend exec tsc --noEmit`
Expected: no errors. Fix any signature mismatch found in Step 2 before proceeding.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/algolia/service.ts
git commit -m "DYLLU-000 Wire Algolia client into module service"
```

---

### Task 7: Scheduled reindex job

**Files:**

- Create: `apps/backend/src/jobs/algolia-reindex.ts`

- [ ] **Step 1: Implement the job**

```ts
import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { ALGOLIA_MODULE } from "../modules/algolia";
import type AlgoliaModuleService from "../modules/algolia/service";
import { buildAlgoliaRecord } from "../modules/algolia/lib/build-record";
import {
  planReindex,
  type ReindexInput,
} from "../modules/algolia/lib/plan-reindex";

const PRODUCT_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "thumbnail",
  "status",
  "created_at",
  "updated_at",
  "deleted_at",
  "metadata",
  "tags.value",
  "categories.name",
  "categories.handle",
  "variants.sku",
  "variants.title",
  "variants.updated_at",
  "variants.calculated_price.calculated_amount",
  "variants.calculated_price.original_amount",
  "variants.prices.updated_at",
];

export default async function algoliaReindexJob(container: MedusaContainer) {
  let algoliaModule: AlgoliaModuleService;
  try {
    algoliaModule = container.resolve(ALGOLIA_MODULE);
  } catch {
    // Algolia isn't configured (no ALGOLIA_* env vars) — module was never registered.
    return;
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const logger = container.resolve("logger");

  const lastSyncedAt = (await algoliaModule.getLastSyncedAt()) ?? new Date(0);
  const runStartedAt = new Date();

  const { data: products } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { status: ["published"] },
    withDeleted: true,
  });

  const reindexInputs: (ReindexInput & { raw: (typeof products)[number] })[] =
    products.map((product) => ({
      id: product.id,
      updatedAt: new Date(product.updated_at),
      deletedAt: product.deleted_at ? new Date(product.deleted_at) : null,
      variants: (product.variants ?? []).map((variant) => ({
        updatedAt: new Date(variant.updated_at),
        prices: (variant.prices ?? []).map((price) => ({
          updatedAt: new Date(price.updated_at),
        })),
      })),
      raw: product,
    }));

  const { toUpsert, toDelete } = planReindex(reindexInputs, lastSyncedAt);

  if (toUpsert.length === 0 && toDelete.length === 0) {
    logger.info("[algolia-reindex] no changes since last sync, skipping");
    return;
  }

  const records = toUpsert.map(({ raw }) =>
    buildAlgoliaRecord({
      id: raw.id,
      title: raw.title,
      description: raw.description,
      handle: raw.handle,
      thumbnail: raw.thumbnail,
      status: raw.status,
      created_at: raw.created_at,
      metadata: raw.metadata,
      tags: raw.tags ?? [],
      categories: raw.categories ?? [],
      variants: (raw.variants ?? []).map((v) => ({
        sku: v.sku,
        title: v.title,
        calculated_price: v.calculated_price
          ? {
              calculated_amount: v.calculated_price.calculated_amount,
              original_amount: v.calculated_price.original_amount,
            }
          : null,
      })),
    })
  );

  await algoliaModule.indexData(records);
  await algoliaModule.deleteFromIndex(toDelete.map((p) => p.id));
  await algoliaModule.recordSyncCompleted(runStartedAt);

  logger.info(
    `[algolia-reindex] upserted ${toUpsert.length}, deleted ${toDelete.length}`
  );
}

export const config = {
  name: "algolia-reindex",
  schedule: "0 3 * * *",
};
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @dyllu/backend exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification against local dev**

With local Postgres up, a `.env` configured with real Algolia dev credentials (throwaway index name, e.g. `dyllu_products_dev`), and at least one published product locally:

Run: `pnpm --filter @dyllu/backend exec medusa exec ./src/jobs/algolia-reindex.ts`
Expected: log line `[algolia-reindex] upserted N, deleted 0`. Check the Algolia dashboard for the index — confirm the record's `title`/`price`/`on_sale` look right for a known product.

Run the same command again immediately.
Expected: `[algolia-reindex] no changes since last sync, skipping` — confirms diff-detection and `last_synced_at` persistence both work.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/jobs/algolia-reindex.ts
git commit -m "DYLLU-000 Add daily diff-based Algolia reindex job"
```

---

### Task 8: Store search route

**Files:**

- Modify: `apps/backend/src/api/_shared/contracts.ts`
- Create: `apps/backend/src/api/store/products/search/route.ts`
- Modify: `apps/backend/src/api/middlewares.ts`

- [ ] **Step 1: Add the request schema**

In `apps/backend/src/api/_shared/contracts.ts`, add (near the other schemas, using the same `z` import already in that file):

```ts
export const ProductSearchBodySchema = z.object({
  query: z.string().trim().max(120).optional(),
  categoryIds: z.array(z.string()).max(50).optional(),
  onSale: z.boolean().optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "created_at"])
    .default("relevance"),
  page: z.number().int().min(0).max(1000).default(0),
  hitsPerPage: z.number().int().min(1).max(50).default(20),
});
```

- [ ] **Step 2: Implement the route**

`apps/backend/src/api/store/products/search/route.ts`:

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { ALGOLIA_MODULE } from "../../../../modules/algolia";
import type AlgoliaModuleService from "../../../../modules/algolia/service";
import type { ProductSearchBodySchema } from "../../../_shared/contracts";
import type { z } from "@medusajs/framework/zod";

type Body = z.infer<typeof ProductSearchBodySchema>;

export async function POST(
  req: MedusaRequest<Body>,
  res: MedusaResponse
): Promise<void> {
  let algoliaModule: AlgoliaModuleService;
  try {
    algoliaModule = req.scope.resolve(ALGOLIA_MODULE);
  } catch {
    res.status(200).json({ hits: [], nbHits: 0, page: 0, nbPages: 0 });
    return;
  }

  try {
    const result = await algoliaModule.search(req.validatedBody);
    res.status(200).json(result);
  } catch (error) {
    req.scope.resolve("logger").error("[store/products/search] failed", error);
    res.status(502).json({ hits: [], nbHits: 0, page: 0, nbPages: 0 });
  }
}
```

- [ ] **Step 3: Register the route in middlewares**

In `apps/backend/src/api/middlewares.ts`, add `ProductSearchBodySchema` to the import from `./_shared/contracts`, and add this entry to the `routes` array (near the other `/store/*` entries):

```ts
    {
      matcher: "/store/products/search",
      methods: ["POST"],
      bodyParser: { sizeLimit: "4kb" },
      middlewares: [validateAndTransformBody(ProductSearchBodySchema)],
    },
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @dyllu/backend exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

With the dev server running (`pnpm -F @dyllu/backend dev`) and the index populated (Task 7, Step 4):

Run: `curl -s -X POST http://localhost:9000/store/products/search -H "Content-Type: application/json" -H "x-publishable-api-key: $PUBLISHABLE_KEY" -d '{"query":"burghiu"}'`
Expected: JSON with a `hits` array containing matching products.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/_shared/contracts.ts apps/backend/src/api/store/products/search/route.ts apps/backend/src/api/middlewares.ts
git commit -m "DYLLU-000 Add store search route proxying to Algolia"
```

---

### Task 9: Admin manual sync — route + UI

**Files:**

- Create: `apps/backend/src/api/admin/algolia/sync/route.ts`
- Modify: `apps/backend/src/api/middlewares.ts`
- Create: `apps/backend/src/admin/routes/settings/algolia/page.tsx`

- [ ] **Step 1: Implement the admin route**

Reuses the job's logic by importing and calling it directly (same diff-based behavior, per spec — not a forced full reindex).

`apps/backend/src/api/admin/algolia/sync/route.ts`:

```ts
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import algoliaReindexJob from "../../../../jobs/algolia-reindex";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  try {
    await algoliaReindexJob(req.scope);
    res.status(200).json({ success: true });
  } catch (error) {
    req.scope.resolve("logger").error("[admin/algolia/sync] failed", error);
    res.status(500).json({ success: false });
  }
}
```

- [ ] **Step 2: Register the route with admin auth**

In `apps/backend/src/api/middlewares.ts`, add:

```ts
    {
      matcher: "/admin/algolia/sync",
      methods: ["POST"],
      middlewares: [adminAuthentication],
    },
```

- [ ] **Step 3: Admin UI page**

`apps/backend/src/admin/routes/settings/algolia/page.tsx`:

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { MagnifyingGlass } from "@medusajs/icons";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useMutation } from "@tanstack/react-query";

async function triggerSync(): Promise<{ success: boolean }> {
  const response = await fetch("/admin/algolia/sync", {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) throw new Error("Sync request failed");
  return response.json();
}

const AlgoliaSettingsPage = () => {
  const mutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => toast.success("Algolia sync complete"),
    onError: () => toast.error("Algolia sync failed — check backend logs"),
  });

  return (
    <Container>
      <Heading level="h1">Algolia search</Heading>
      <Text className="text-ui-fg-subtle mt-2">
        Reindexes only products changed since the last sync (runs automatically
        once a day). Use this to force an immediate sync after an urgent catalog
        change.
      </Text>
      <Button
        className="mt-4"
        onClick={() => mutation.mutate()}
        isLoading={mutation.isPending}
      >
        Sync now
      </Button>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Algolia",
  icon: MagnifyingGlass,
});

export default AlgoliaSettingsPage;
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @dyllu/backend exec tsc --noEmit`
Expected: no errors. If `MagnifyingGlass` isn't exported by `@medusajs/icons` in the installed version, swap for `Search` from the same package (check with `grep -o 'MagnifyingGlass\|"Search"' node_modules/@medusajs/icons/dist/index.d.ts | sort -u`).

- [ ] **Step 5: Manual verification**

Run `pnpm -F @dyllu/backend dev`, open `http://localhost:9000/backend`, navigate to Settings → Algolia, click "Sync now".
Expected: success toast; backend log shows the job ran.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/api/admin/algolia/sync/route.ts apps/backend/src/api/middlewares.ts apps/backend/src/admin/routes/settings/algolia/page.tsx
git commit -m "DYLLU-000 Add manual Algolia sync admin page"
```

---

### Task 10: One-time index settings script

**Files:**

- Create: `apps/backend/src/scripts/algolia-configure-index.ts`

- [ ] **Step 1: Implement**

Idempotent — safe to re-run. Configures searchable/faceting attributes on the base index and creates the three sort replicas.

```ts
import { algoliasearch } from "algoliasearch";

import { parseBackendEnvironment } from "../config/environment";

async function main() {
  const environment = parseBackendEnvironment(process.env);
  if (!environment.algolia) {
    console.error("Algolia is not configured — set ALGOLIA_* env vars first.");
    process.exit(1);
  }

  const { appId, adminApiKey, indexName } = environment.algolia;
  const client = algoliasearch(appId, adminApiKey);

  await client.setSettings({
    indexName,
    indexSettings: {
      searchableAttributes: [
        "title",
        "description",
        "skus",
        "variant_titles",
        "category_names",
        "metadata",
      ],
      attributesForFaceting: ["category_ids", "on_sale"],
      replicas: [
        `${indexName}_price_asc`,
        `${indexName}_price_desc`,
        `${indexName}_created_at`,
      ],
    },
  });

  await client.setSettings({
    indexName: `${indexName}_price_asc`,
    indexSettings: { customRanking: ["asc(price)"] },
  });
  await client.setSettings({
    indexName: `${indexName}_price_desc`,
    indexSettings: { customRanking: ["desc(price)"] },
  });
  await client.setSettings({
    indexName: `${indexName}_created_at`,
    indexSettings: { customRanking: ["desc(created_at)"] },
  });

  console.log(`Configured index "${indexName}" and its 3 replicas.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run it once against the dev index**

Run: `pnpm --filter @dyllu/backend exec tsx src/scripts/algolia-configure-index.ts`
(If `tsx` isn't available, check how other one-off scripts in `src/scripts/` are invoked — e.g. `pnpm --dir apps/backend exec medusa exec ./src/scripts/algolia-configure-index.ts` per the pattern in `docs/catalog-source.md`, and use that instead.)
Expected: `Configured index "dyllu_products_dev" and its 3 replicas.` — confirm the 3 replica indices now show up in the Algolia dashboard.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/algolia-configure-index.ts
git commit -m "DYLLU-000 Add one-time Algolia index settings script"
```

---

### Task 11: Storefront search client + PLP integration

**Files:**

- Create: `apps/storefront/src/lib/data/algolia-search.ts`
- Modify: `apps/storefront/src/modules/store/lib/to-plp-product.ts`
- Modify: `apps/storefront/src/modules/store/lib/product-feed.ts`

- [ ] **Step 1: Server-only search client**

`apps/storefront/src/lib/data/algolia-search.ts`:

```ts
import "server-only";

import { sdk } from "@lib/config";

export type AlgoliaSearchRequest = {
  query?: string;
  categoryIds?: string[];
  onSale?: boolean;
  sort?: "relevance" | "price_asc" | "price_desc" | "created_at";
  page?: number;
  hitsPerPage?: number;
};

export type AlgoliaProductHit = {
  objectID: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string | null;
  price: number | null;
  original_price: number | null;
  on_sale: boolean;
};

export type AlgoliaSearchResponse = {
  hits: AlgoliaProductHit[];
  nbHits: number;
  page: number;
  nbPages: number;
};

export async function searchProducts(
  request: AlgoliaSearchRequest
): Promise<AlgoliaSearchResponse> {
  return sdk.client.fetch<AlgoliaSearchResponse>("/store/products/search", {
    method: "POST",
    body: request,
    cache: "no-store",
  });
}
```

- [ ] **Step 2: Map an Algolia hit to a PLP card**

In `apps/storefront/src/modules/store/lib/to-plp-product.ts`, add (needs `convertToLocale` from `@lib/util/money` and `getPercentageDiff` from `@lib/util/get-percentage-diff` — add both imports at the top; also import `type { AlgoliaProductHit } from "@lib/data/algolia-search"`):

```ts
export function toPlpProductFromHit(hit: AlgoliaProductHit) {
  const price =
    hit.price !== null && hit.original_price !== null
      ? {
          calculated_price_number: hit.price,
          calculated_price: convertToLocale({
            amount: hit.price,
            currency_code: "MDL",
          }),
          original_price_number: hit.original_price,
          original_price: convertToLocale({
            amount: hit.original_price,
            currency_code: "MDL",
          }),
          price_type: hit.on_sale ? ("sale" as const) : ("default" as const),
          percentage_diff: getPercentageDiff(hit.original_price, hit.price),
        }
      : undefined;

  return {
    id: hit.objectID,
    href: `/products/${hit.handle}`,
    productHandle: hit.handle,
    title: hit.title,
    thumbnail: hit.thumbnail,
    category: undefined,
    price,
    productType: undefined,
    setCount: undefined,
    variantId: undefined,
    inStock: true,
  };
}
```

- [ ] **Step 3: Replace `fetchFullScanPage` with an Algolia-backed implementation**

In `apps/storefront/src/modules/store/lib/product-feed.ts`, add the import:

```ts
import { searchProducts } from "@lib/data/algolia-search";
import { toPlpProductFromHit } from "@modules/store/lib/to-plp-product";
```

Replace the entire `fetchFullScanPage` function with:

```ts
async function fetchFullScanPage(
  request: NormalizedProductFeedRequest
): Promise<ProductFeedResponse> {
  const result = await searchProducts({
    query: request.query,
    categoryIds: request.categoryIds,
    onSale: request.onSale,
    sort: request.sortBy,
    page: request.page - 1,
    hitsPerPage: PRODUCT_LIMIT,
  });

  return {
    products: result.hits.map(toPlpProductFromHit),
    count: result.nbHits,
    currentPage: request.page,
    nextPage: request.page < result.nbPages ? request.page + 1 : null,
    totalPages: result.nbPages,
    pageSize: PRODUCT_LIMIT,
  };
}
```

Remove the now-unused `sortProductFeedItems` function and the `listProductsWithSort` import if no longer referenced elsewhere in the file (check with `grep -n listProductsWithSort apps/storefront/src/modules/store/lib/product-feed.ts` — it's still used by nothing else once this function is gone).

`request.categoryIds` already carries Medusa category IDs (confirmed against
`apps/storefront/src/app/(main)/categories/[...category]/page.tsx`, which passes
`productCategory.id` through unchanged) — matching the Algolia record's `category_ids`
facet (Task 5) means this passes straight through with no field-name translation needed.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @dyllu/storefront exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Run `pnpm dev:store`, visit `http://localhost:4000/store?q=burghiu`,
`http://localhost:4000/store?sortBy=price_asc`, and a real category page (e.g.
`http://localhost:4000/categories/<a-real-handle>`).
Expected: results render with correct prices/strikethrough where on sale;
price-ascending order is actually ascending; the category page still shows only
products in that category; empty-state still renders correctly for a nonsense query.

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/src/lib/data/algolia-search.ts apps/storefront/src/modules/store/lib/to-plp-product.ts apps/storefront/src/modules/store/lib/product-feed.ts apps/storefront/src/modules/store/lib/product-feed-contract.ts
git commit -m "DYLLU-000 Route PLP price-sort and search through Algolia"
```

---

### Task 12: Cmd+K palette live typeahead

**Files:**

- Create: `apps/storefront/src/app/api/search/route.ts`
- Modify: `apps/storefront/src/components/organisms/search-command.tsx`

- [ ] **Step 1: Typeahead API route**

`apps/storefront/src/app/api/search/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";

import { searchProducts } from "@lib/data/algolia-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const result = await searchProducts({ query, hitsPerPage: 5 });
    return NextResponse.json(
      { hits: result.hits },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Live search failed", error);
    return NextResponse.json(
      { hits: [] },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
```

- [ ] **Step 2: Add live results to the palette**

In `apps/storefront/src/components/organisms/search-command.tsx`, add state + a debounced fetch, and render a results group above "Acces rapid" when a query is present. Add these imports at the top (next to the existing `lucide-react` import, extend it):

```ts
import {
  ArrowRight,
  History,
  Layers,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
```

Add this type near `POPULAR`:

```ts
type LiveHit = {
  objectID: string;
  title: string;
  thumbnail: string | null;
  handle: string;
  price: number | null;
};
```

Inside the component, after the existing `recent` state, add:

```ts
const [liveHits, setLiveHits] = React.useState<LiveHit[]>([]);

React.useEffect(() => {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    setLiveHits([]);
    return;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { hits: LiveHit[] }) => setLiveHits(data.hits))
      .catch(() => {});
  }, 200);
  return () => {
    clearTimeout(timeout);
    controller.abort();
  };
}, [query]);
```

Add a results group right after `<CommandInput .../>` and before `<CommandList>`'s existing content — insert as the first child inside `<CommandList>`, before `<CommandEmpty>`:

```tsx
{
  liveHits.length > 0 && (
    <>
      <CommandGroup heading="Produse">
        {liveHits.map((hit) => (
          <CommandItem
            key={hit.objectID}
            value={hit.title}
            onSelect={() => go(`/products/${hit.handle}`, query.trim())}
          >
            <Search className="text-muted-foreground size-4" />
            <span className="flex-1 truncate">{hit.title}</span>
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandSeparator />
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @dyllu/storefront exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Run `pnpm dev:store`, open the storefront, trigger the Cmd+K palette, type a known product name fragment.
Expected: a "Produse" group appears within ~200ms of the debounce, showing matching products; selecting one navigates to its PDP.

- [ ] **Step 5: Commit**

```bash
git add apps/storefront/src/app/api/search/route.ts apps/storefront/src/components/organisms/search-command.tsx
git commit -m "DYLLU-000 Add live product results to Cmd+K search palette"
```

---

## Final check

- [ ] Run `pnpm check` at the repo root — confirms lint/typecheck/test all pass across the storefront.
- [ ] Run `pnpm --filter @dyllu/backend exec vitest run src/modules/algolia` — confirms all new backend unit tests pass together.
- [ ] Re-read `docs/superpowers/specs/2026-08-06-algolia-search-design.md` once more and confirm every decision in it has a corresponding task above (module, job, admin sync, store route, PLP integration, palette).
