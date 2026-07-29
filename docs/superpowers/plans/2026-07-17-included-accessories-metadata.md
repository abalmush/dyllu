# Included Accessories Metadata Script Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write `metadata.included_accessories` (exact battery/charger/other SKUs + qty
physically included in the box) onto Medusa product variants, sourced from
`apps/catalog-admin/data/bundles.json`.

**Architecture:** One new standalone Medusa exec script,
`apps/backend/src/scripts/ingco-map-included-accessories.ts`, following the same
`ExecArgs` pattern as the existing `ingco-classify.ts`. It reads `bundles.json`
read-only, matches each Medusa product variant by exact SKU, filters each match's
components down to only those with a real `component_sku`, and writes the result to
`metadata.included_accessories` via `updateProductVariantsWorkflow`. Unmatched SKUs are
written to a JSON report instead of guessed at.

**Tech Stack:** Medusa v2.17 (`@medusajs/framework`, `@medusajs/medusa/core-flows`),
Node.js `node:fs/promises`, TypeScript, `medusa exec` CLI.

**Design doc:** `docs/superpowers/specs/2026-07-17-included-accessories-metadata-design.md`

---

## Before you start

This script talks to your **local dev** Medusa Postgres (port 5433), not production. Make
sure the local stack is up:

```bash
docker compose -f apps/backend/docker-compose.yml up -d
```

Confirm `apps/catalog-admin/data/bundles.json` exists (it should already be in the repo,
untouched by this plan):

```bash
ls -la apps/catalog-admin/data/bundles.json
```

All `medusa exec` commands in this plan run from `apps/backend/`.

---

### Task 1: Script skeleton — types and the `deriveType` pure function

**Files:**

- Create: `apps/backend/src/scripts/ingco-map-included-accessories.ts`

- [ ] **Step 1: Write the file skeleton with types and `deriveType`**

```typescript
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { revalidateStorefront } from "./_revalidate";

type BundleComponent = {
  qty: number;
  name: string;
  component_sku: string | null;
};

type BundleEntry = {
  sku: string;
  is_bundle: boolean;
  components: BundleComponent[];
};

type IncludedAccessory = {
  sku: string;
  qty: number;
  type: "battery" | "charger" | "other";
  name: string;
};

type UnmatchedEntry = {
  variantSku: string;
  productTitle: string;
  productHandle: string;
  reason: "no_sku_match" | "no_linked_components";
};

type VariantRow = {
  id: string;
  sku: string | null;
  metadata: Record<string, unknown> | null;
  product: { title: string; handle: string } | null;
};

export function deriveType(sku: string): "battery" | "charger" | "other" {
  const upper = sku.toUpperCase();
  if (upper.startsWith("DTLBP") || upper.startsWith("DTLBS")) return "battery";
  if (upper.startsWith("DTFCP")) return "charger";
  return "other";
}
```

- [ ] **Step 2: Sanity-check `deriveType` with a one-off `tsx` run**

Run:

```bash
cd apps/backend && npx tsx -e "
import('./src/scripts/ingco-map-included-accessories.ts').then(m => {
  console.log(m.deriveType('DTLBP550'));   // expect battery
  console.log(m.deriveType('DTLBS518'));   // expect battery
  console.log(m.deriveType('DTFCP540'));   // expect charger
  console.log(m.deriveType('DTTB2201'));   // expect other
});
"
```

Expected output:

```
battery
battery
charger
other
```

This will fail right now because the file has no `export default` yet (harmless —
`deriveType` is a named export and still resolves; the missing default export only
matters when Medusa's CLI loads the file via `medusa exec`, which happens in Task 5). If
the four lines above print correctly, move on.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/ingco-map-included-accessories.ts
git commit -m "DYLLU-000 feat: add included-accessories script skeleton and type derivation"
```

---

### Task 2: Load `bundles.json` and map bundle entries to `IncludedAccessory[]`

**Files:**

- Modify: `apps/backend/src/scripts/ingco-map-included-accessories.ts`

- [ ] **Step 1: Add the loader, lookup map, and component-filtering function**

Append after `deriveType`:

```typescript
function buildBundleMap(entries: BundleEntry[]): Map<string, BundleEntry> {
  const map = new Map<string, BundleEntry>();
  for (const entry of entries) {
    map.set(entry.sku.toUpperCase(), entry);
  }
  return map;
}

function toIncludedAccessories(entry: BundleEntry): IncludedAccessory[] {
  return entry.components
    .filter(
      (c): c is BundleComponent & { component_sku: string } =>
        typeof c.component_sku === "string" && c.component_sku.length > 0
    )
    .map((c) => ({
      sku: c.component_sku,
      qty: c.qty,
      type: deriveType(c.component_sku),
      name: c.name,
    }));
}

export async function loadBundleMap(): Promise<Map<string, BundleEntry>> {
  const bundlesPath = resolve(
    process.cwd(),
    "..",
    "catalog-admin",
    "data",
    "bundles.json"
  );
  const entries = JSON.parse(
    await readFile(bundlesPath, "utf8")
  ) as BundleEntry[];
  return buildBundleMap(entries);
}
```

- [ ] **Step 2: Sanity-check the loader against the two known examples**

Run:

```bash
cd apps/backend && npx tsx -e "
import('./src/scripts/ingco-map-included-accessories.ts').then(async (m) => {
  const map = await m.loadBundleMap();
  console.log('total entries:', map.size);
  console.log('DTDS204285:', JSON.stringify(map.get('DTDS204285')?.components));
  console.log('DTCD1B12856:', JSON.stringify(map.get('DTCD1B12856')?.components));
});
"
```

Expected: `total entries: 3337`, and both SKUs print their 2-4 components including the
`DTLBP520`/`DTFCP502` (for `DTDS204285`) and `DTLBP550`/`DTFCP540` (for `DTCD1B12856`)
linked entries.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/ingco-map-included-accessories.ts
git commit -m "DYLLU-000 feat: load bundles.json and derive included-accessories per SKU"
```

---

### Task 3: Query product variants, match, and build the unmatched report

**Files:**

- Modify: `apps/backend/src/scripts/ingco-map-included-accessories.ts`

- [ ] **Step 1: Add the variant query and matching logic**

First, extend the top-of-file import to also pull in `RemoteQueryFunction` — it's the
exact type `container.resolve(ContainerRegistrationKeys.QUERY)` returns
(`Omit<RemoteQueryFunction, symbol>`, per `@medusajs/framework`'s own
`container.d.ts`), and `@medusajs/framework/types` re-exports it from `@medusajs/types`
so no new dependency is needed:

```typescript
import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
```

(replaces the existing `import { ExecArgs } from "@medusajs/framework/types";` line)

Append after `loadBundleMap`:

```typescript
async function fetchAllVariants(
  query: Omit<RemoteQueryFunction, symbol>
): Promise<VariantRow[]> {
  const variants: VariantRow[] = [];
  const pageSize = 200;
  let offset = 0;
  while (true) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "metadata", "product.title", "product.handle"],
      pagination: { skip: offset, take: pageSize },
    });
    const page = data as VariantRow[];
    variants.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return variants;
}

function matchVariants(
  variants: VariantRow[],
  bundleMap: Map<string, BundleEntry>
): {
  updates: Array<{ id: string; metadata: Record<string, unknown> }>;
  unmatched: UnmatchedEntry[];
} {
  const updates: Array<{ id: string; metadata: Record<string, unknown> }> = [];
  const unmatched: UnmatchedEntry[] = [];

  for (const variant of variants) {
    if (!variant.sku) continue;
    const productTitle = variant.product?.title ?? "";
    const productHandle = variant.product?.handle ?? "";
    const entry = bundleMap.get(variant.sku.toUpperCase());
    if (!entry) {
      unmatched.push({
        variantSku: variant.sku,
        productTitle,
        productHandle,
        reason: "no_sku_match",
      });
      continue;
    }
    const includedAccessories = toIncludedAccessories(entry);
    if (!entry.is_bundle || includedAccessories.length === 0) {
      unmatched.push({
        variantSku: variant.sku,
        productTitle,
        productHandle,
        reason: "no_linked_components",
      });
      continue;
    }
    updates.push({
      id: variant.id,
      metadata: {
        ...(variant.metadata ?? {}),
        included_accessories: JSON.stringify(includedAccessories),
      },
    });
  }

  return { updates, unmatched };
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
cd apps/backend && npx tsc --noEmit --incremental false
```

Expected: no errors referencing `ingco-map-included-accessories.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/scripts/ingco-map-included-accessories.ts
git commit -m "DYLLU-000 feat: query product variants and match against bundle data"
```

---

### Task 4: Wire the main script — dry-run gate, batched writes, report file, revalidate

**Files:**

- Modify: `apps/backend/src/scripts/ingco-map-included-accessories.ts`

- [ ] **Step 1: Add `parseArgs` and the default-exported entry point**

Append at the end of the file:

```typescript
function parseArgs(args: string[]) {
  const out: { dryRun?: boolean; batch?: number } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (key === "dryRun") out.dryRun = rawValue !== "false";
    else if (key === "batch" && rawValue) out.batch = Number(rawValue);
  }
  return out;
}

export default async function ingcoMapIncludedAccessories({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const flags = parseArgs(args ?? []);
  const dryRun = flags.dryRun ?? false;

  const bundleMap = await loadBundleMap();
  logger.info(`[included-accessories] loaded ${bundleMap.size} bundle entries`);

  const variants = await fetchAllVariants(query);
  logger.info(
    `[included-accessories] found ${variants.length} product variants`
  );

  const { updates, unmatched } = matchVariants(variants, bundleMap);
  const noSkuMatch = unmatched.filter(
    (u) => u.reason === "no_sku_match"
  ).length;
  const noLinkedComponents = unmatched.filter(
    (u) => u.reason === "no_linked_components"
  ).length;
  logger.info(
    `[included-accessories] matched ${updates.length}, unmatched ${unmatched.length} ` +
      `(no_sku_match=${noSkuMatch}, no_linked_components=${noLinkedComponents})`
  );

  const reportPath = resolve(
    process.cwd(),
    "data",
    "ingco",
    "included-accessories-unmatched-report.json"
  );
  await writeFile(reportPath, JSON.stringify(unmatched, null, 2), "utf8");
  logger.info(`[included-accessories] wrote unmatched report to ${reportPath}`);

  if (dryRun) {
    logger.info("[included-accessories] DRY RUN — not writing to DB");
    return;
  }

  const batchSize = Number(flags.batch ?? 50);
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    try {
      await updateProductVariantsWorkflow(container).run({
        input: { product_variants: batch },
      });
      logger.info(
        `[included-accessories] batch ${i / batchSize + 1}: updated ${batch.length} ` +
          `(total ${i + batch.length}/${updates.length})`
      );
    } catch (err) {
      logger.error(
        `[included-accessories] batch ${i / batchSize + 1} FAILED: ${
          err instanceof Error ? err.message : err
        }`
      );
      throw err;
    }
  }
  logger.info(
    `[included-accessories] done — updated ${updates.length} variants`
  );

  await revalidateStorefront(logger);
}
```

- [ ] **Step 2: Typecheck**

Run:

```bash
cd apps/backend && npx tsc --noEmit --incremental false
```

Expected: no errors.

- [ ] **Step 3: Confirm the report directory is gitignored**

`apps/backend/.gitignore` already has `/data/ingco` — the same directory
`ingco-classify.ts` reads its source data from. Verify the new report path falls under
it:

```bash
cd apps/backend && git check-ignore -v data/ingco/included-accessories-unmatched-report.json
```

Expected: prints a match against the `/data/ingco` rule in `.gitignore` (the file
doesn't need to exist yet for `check-ignore` to report the rule that _would_ match it —
if it errors because the path doesn't exist, create an empty placeholder first with
`mkdir -p data/ingco && echo '[]' > data/ingco/included-accessories-unmatched-report.json`
and re-run).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/ingco-map-included-accessories.ts
git commit -m "DYLLU-000 feat: wire dry-run gate, batched variant writes, and unmatched report"
```

---

### Task 5: Dry-run against local dev backend and verify the report

**Files:** none (verification only)

- [ ] **Step 1: Ensure the local backend dev stack is reachable**

```bash
docker compose -f apps/backend/docker-compose.yml up -d
```

- [ ] **Step 2: Run the script in dry-run mode**

```bash
cd apps/backend && npx medusa exec ./src/scripts/ingco-map-included-accessories.ts dryRun=true
```

Expected: log lines showing `loaded 3337 bundle entries`, a variant count matching your
local catalog, a `matched X, unmatched Y` summary, `DRY RUN — not writing to DB`, and a
report written to `data/ingco/included-accessories-unmatched-report.json`.

- [ ] **Step 3: Verify the report contains the expected known cases**

```bash
cd apps/backend && node -e "
const report = require('./data/ingco/included-accessories-unmatched-report.json');
const dtcd1b1285 = report.find(r => r.variantSku === 'DTCD1B1285');
console.log('DTCD1B1285 unmatched entry:', JSON.stringify(dtcd1b1285));
console.log('total unmatched:', report.length);
"
```

Expected: `DTCD1B1285` appears with `reason: "no_sku_match"` (it doesn't exactly match
`DTCD1B12856` in `bundles.json` — this is the known, documented gap from the design doc,
not a bug). Total unmatched should be roughly in the 100-200+ range (design doc estimated
~123 SKUs have no exact match, out of 888 backend product SKUs at the time of writing;
some drift is expected since the catalog changes).

- [ ] **Step 4: No commit needed** — this task is verification-only, nothing changed in
      the working tree except the gitignored report file.

---

### Task 6: Real run, spot-check, and idempotency check

**Files:** none (verification only)

- [ ] **Step 1: Run the script for real (writes to local dev DB)**

```bash
cd apps/backend && npx medusa exec ./src/scripts/ingco-map-included-accessories.ts
```

Expected: same summary log as the dry run, plus `batch 1: updated N ...` lines and
`done — updated N variants`, followed by a storefront revalidation attempt (which will
log `skipped outside production` locally unless `STOREFRONT_URL`/`REVALIDATE_SECRET` are
set — that's expected in local dev).

- [ ] **Step 2: Spot-check `DTDS204285` in the database**

```bash
docker exec -it dyllu-medusa-postgres psql -U medusa -d dyllu_medusa -c \
  "select pv.sku, pv.metadata->>'included_accessories' as included_accessories from product_variant pv where pv.sku = 'DTDS204285';"
```

(container name, user, and database come from `apps/backend/docker-compose.yml`:
`container_name: dyllu-medusa-postgres`, `POSTGRES_USER: medusa`,
`POSTGRES_DB: dyllu_medusa`.)

Expected: one row, `included_accessories` is a JSON string equal to:

```json
[
  {
    "sku": "DTLBP520",
    "qty": 1,
    "type": "battery",
    "name": "2.0Ah battery pack"
  },
  { "sku": "DTFCP502", "qty": 1, "type": "charger", "name": "charger" }
]
```

- [ ] **Step 3: Confirm idempotency — re-run and diff**

```bash
cd apps/backend && npx medusa exec ./src/scripts/ingco-map-included-accessories.ts
```

Then re-run the same `psql` query from Step 2 — the `included_accessories` value must be
byte-for-byte identical to the first run.

- [ ] **Step 4: No commit needed** — this task only verifies behavior against the local
      dev database; the script code was already committed in Task 4.
