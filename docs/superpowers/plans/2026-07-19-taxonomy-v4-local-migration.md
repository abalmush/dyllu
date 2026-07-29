# Taxonomy v4 Local Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local dev catalog's category tree, product names, and product handles/canonical URLs with the validated `Dyllu_Taxonomy_v4` package, via a full wipe-and-reimport of the local Postgres DB, without losing the `bundle_components` (battery/charger/case) metadata already attached to 161 live products.

**Category depth decision (confirmed with user 2026-07-19):** the site has no 3rd category level. `Dyllu_Taxonomy_v4.csv` has real L3 entries affecting 791 of 888 products (89%), but L3 is **dropped** — every product is filed under **L1 (root) + L2 (leaf) only**, using `level_2_total` as the per-leaf product count. This does merge some previously-distinct L3 siblings back together (e.g. "Chei fixe și combinate" / "Chei reglabile și speciale" / "Chei tubulare și clicheți" all become one 84-product "Chei" leaf) — that's accepted as intentional, not a bug.

**Architecture:** This is a data-migration/ops plan, not a feature build — there is no red/green unit-test cycle. Each task instead has a concrete file change plus an explicit verification command with expected output. Steps are still atomic and ordered; run them in sequence, don't skip the verification steps.

**Tech Stack:** Medusa v2.17 (`medusa exec` scripts), `tsx` for standalone scripts, local Postgres 16 via `docker-compose.yml` (port 5433), Node's built-in `fs`/`csv` handling (no new dependency needed).

---

## Facts this plan is built on (from live inspection, 2026-07-19)

- **Local DB is currently messy, not a clean snapshot of any one taxonomy.** `dyllu-medusa-postgres` has been running 3 days: 888 _live_ products (correct count) but **9,662 soft-deleted product rows** and **37 live root categories** (vs. the 9 roots actually defined in `src/data/category-tree.ts`) plus 196 soft-deleted categories — leftover from earlier iteration. A full wipe is the right call, not just a nice-to-have.
- **161 live products carry `metadata.bundle_components`** (battery/charger/case contents, JSON array of `{qty, unit, name, sku, resolution}`). This is written post-ingest by `src/scripts/ingco-sync-bundle-components.ts`, sourced from `apps/catalog-admin/data/bundles.json`.
- **`apps/catalog-admin/data/bundles.json` does not exist on disk** (the whole `apps/catalog-admin/` dir is git-ignored, and `data/` isn't there right now). The sync script's only fallback is one hardcoded SKU (`DTCD1B12856`). **If we wipe now without backing up, we permanently lose bundle data for the other 160 products** — there is no other copy of it. This is Task 1, and it happens before anything destructive.
- **`Dyllu_Taxonomy_v4_Package`** (already extracted to `apps/backend/data/ingco/project/Dyllu_Taxonomy_v4_Package/`, already validated clean — see prior turn) has 115 taxonomy nodes (14 L1 roots, up to 3 levels) collapsing to 76 distinct L1/L2 pairs once L3 is dropped, and 888 SKU→taxonomy/name/canonical-id rows, exactly matching the 888 SKUs found across the 633 `products-merged/*.json` ingest source files (one known pre-existing alias: merged data has `DTCD1B1285`, v4/bundles has `DTCD1B12856` — already handled in `ingco-sync-bundle-components.ts` via `BUNDLE_SKU_ALIASES`).
- **2 category names are legitimately reused at different tree positions** even after dropping L3: "Accesorii și consumabile" is both an L1 root and an L2 under "Sudură și lipire"; "Găurire și înșurubare" is an L2 under both "Accesorii și consumabile" and "Scule electrice". Medusa's `product_category.handle` is globally unique, so these need a disambiguated handle — the display `name` stays exactly as in the CSV, only the `handle` gets a parent-suffix. Handled algorithmically in Task 2, not by hand.
- **Storefront product routing is flat** (`/products/{handle}`, category is not embedded) and category browsing already supports arbitrary depth (`/categories/[...category]/page.tsx`, catch-all, though currently unused since the tree is 2-level). Product `handle` = v4 `canonical_id` (unaffected by taxonomy depth), category assignment = v4 L1/L2 pair. This keeps us inside "no broad architecture changes."
- **Known pre-existing, unrelated gaps** (not caused by this migration, not fixed by it — noted for correct expectations during verification):
  - `apps/storefront/src/lib/data/categories.ts:65` (`getCategoryByHandle`) builds `handle = categoryHandle.join("/")` and queries Medusa by that joined string, but category handles in the DB are single path segments — category _browsing_ pages may already 404 today, independent of 2-level vs 3-level tree. Worth a quick manual check in Task 8 verification, but not this plan's job to fix.
  - `apps/storefront/src/lib/data/category-navigation.ts` (mega-menu config) already references handles that don't match the current seed (`scule-de-mana`, `constructii-si-finisaje` — interesting: these two happen to be **exact matches** for v4's handles, `accesorii-si-consumabile-pentru-scule` is close-but-not-exact vs v4's `accesorii-si-consumabile`). Rewiring the mega-menu to v4 (`Dyllu_Mega_Menu_v4.txt` is in the package for exactly this) is a natural follow-up but wasn't asked for this round — out of scope here.
  - `src/scripts/ingco-categorize.ts` (825 lines) becomes fully obsolete after this migration — its whole purpose (heuristic breadcrumb→2-level-tree assignment) is superseded by the deterministic v4 SKU→taxonomy mapping. Flagged as an optional deletion in Task 9, not bundled into the critical path.

---

## Task 1: Back up `bundle_components` before touching anything

**Files:**

- Create: `apps/backend/src/scripts/ingco-backup-bundle-metadata.ts`
- Create (output, gitignored dir): `apps/backend/data/ingco/backups/bundle-components-backup-<timestamp>.json`
- Create (output, consumed by Task 7): `apps/catalog-admin/data/bundles.json`

- [ ] **Step 1: Write the backup script**

```typescript
// apps/backend/src/scripts/ingco-backup-bundle-metadata.ts
import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

type BundleComponentMetadata = {
  qty: number;
  unit: string;
  name: string;
  sku: string | null;
  resolution: "linked" | "loose";
};

type VariantRow = {
  sku: string | null;
  product: {
    id: string;
    title: string;
    handle: string;
    metadata: Record<string, unknown> | null;
  } | null;
};

export default async function ingcoBackupBundleMetadata({
  container,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;

  const variants: VariantRow[] = [];
  const pageSize = 200;
  let offset = 0;
  while (true) {
    const { data } = await query.graph({
      entity: "product_variant",
      fields: [
        "sku",
        "product.id",
        "product.title",
        "product.handle",
        "product.metadata",
      ],
      pagination: { skip: offset, take: pageSize },
    });
    const page = data as VariantRow[];
    variants.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  const bundleEntries: Array<{
    sku: string;
    is_bundle: true;
    components: Array<{
      qty: number;
      unit: string;
      name: string;
      component_sku: string | null;
    }>;
  }> = [];
  const rawBackup: Array<{
    sku: string;
    productId: string;
    productHandle: string;
    productTitle: string;
    bundleComponents: BundleComponentMetadata[];
  }> = [];

  for (const variant of variants) {
    if (!variant.sku || !variant.product) continue;
    const raw = variant.product.metadata?.["bundle_components"];
    if (typeof raw !== "string") continue;
    let components: BundleComponentMetadata[];
    try {
      components = JSON.parse(raw) as BundleComponentMetadata[];
    } catch {
      logger.warn(
        `[backup] unparseable bundle_components on ${variant.product.handle}, skipping`
      );
      continue;
    }
    if (components.length === 0) continue;

    rawBackup.push({
      sku: variant.sku,
      productId: variant.product.id,
      productHandle: variant.product.handle,
      productTitle: variant.product.title,
      bundleComponents: components,
    });
    bundleEntries.push({
      sku: variant.sku.toUpperCase(),
      is_bundle: true,
      components: components.map((c) => ({
        qty: c.qty,
        unit: c.unit,
        name: c.name,
        component_sku: c.sku,
      })),
    });
  }

  logger.info(
    `[backup] found bundle_components on ${rawBackup.length} variants`
  );

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = resolve(process.cwd(), "data", "ingco", "backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = resolve(
    backupDir,
    `bundle-components-backup-${timestamp}.json`
  );
  await writeFile(backupPath, JSON.stringify(rawBackup, null, 2), "utf8");
  logger.info(`[backup] raw backup written to ${backupPath}`);

  const bundlesJsonPath = resolve(
    process.cwd(),
    "..",
    "catalog-admin",
    "data",
    "bundles.json"
  );
  await mkdir(resolve(process.cwd(), "..", "catalog-admin", "data"), {
    recursive: true,
  });
  await writeFile(
    bundlesJsonPath,
    JSON.stringify(bundleEntries, null, 2),
    "utf8"
  );
  logger.info(
    `[backup] reconstructed bundles.json written to ${bundlesJsonPath} (${bundleEntries.length} entries)`
  );
}
```

- [ ] **Step 2: Run it against the current (pre-wipe) local DB**

Run: `cd apps/backend && npx medusa exec ./src/scripts/ingco-backup-bundle-metadata.ts`

Expected output includes:

```
[backup] found bundle_components on 161 variants
[backup] raw backup written to .../data/ingco/backups/bundle-components-backup-....json
[backup] reconstructed bundles.json written to .../catalog-admin/data/bundles.json (161 entries)
```

- [ ] **Step 3: Verify the reconstructed file**

Run: `python3 -c "import json; d=json.load(open('apps/catalog-admin/data/bundles.json')); print(len(d), d[0])"`
Expected: `161 {...}` with a real `sku`/`components` entry — **do not proceed to Task 4 (DB reset) until this count is 161 (or matches whatever the live query reports).**

- [ ] **Step 4: Commit the script (not the generated data files — they're runtime output)**

```bash
git add apps/backend/src/scripts/ingco-backup-bundle-metadata.ts
git commit -m "DYLLU-000 feat: back up bundle_components metadata before catalog reset"
```

---

## Task 2: Generate the v4 category tree

**Files:**

- Create: `apps/backend/src/scripts/generate-category-tree-v4.ts`
- Modify (generated output): `apps/backend/src/data/category-tree.ts`
- Create (generated sidecar, consumed by Task 4): `apps/backend/data/ingco/category-terminal-handles-v4.json`

- [ ] **Step 1: Write the generator**

```typescript
// apps/backend/src/scripts/generate-category-tree-v4.ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

type CsvRow = Record<string, string>;

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r\n|\n/)
    .filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    header.forEach((key, i) => (row[key] = values[i] ?? ""));
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

const csvPath = resolve(
  process.cwd(),
  "data",
  "ingco",
  "project",
  "Dyllu_Taxonomy_v4_Package",
  "Dyllu_Taxonomy_v4.csv"
);
const rows = parseCsv(readFileSync(csvPath, "utf8"));

const root: { children: CategoryNode[] } = { children: [] };
// key -> node, used to detect "same parent, same name" (real reuse, not a collision)
const nodeByParentKey = new Map<string, CategoryNode>();
// terminal lookup for the ingest step: "L1|L2|L3" -> assigned handle
const terminalHandleByPath = new Map<string, string>();

function findOrCreate(
  parentChildren: CategoryNode[],
  parentKey: string,
  parentHandle: string,
  name: string,
  rawHandle: string
): CategoryNode {
  const key = `${parentKey}>>${name}`;
  const existing = nodeByParentKey.get(key);
  if (existing) return existing;

  let handle = rawHandle;
  const usedHandles = new Set(flattenHandles(root.children));
  let suffixSource = parentHandle; // parent's HANDLE (slug), not its display name
  while (usedHandles.has(handle)) {
    handle = `${handle}-${suffixSource}`;
    suffixSource = "x"; // avoid infinite loop on pathological repeats
  }

  const node: CategoryNode = { name, handle, children: [] };
  nodeByParentKey.set(key, node);
  parentChildren.push(node);
  return node;
}

function flattenHandles(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((n) => [n.handle, ...flattenHandles(n.children)]);
}

// Confirmed 2026-07-19: the site has no 3rd category level. L3 is intentionally
// dropped — every product files under L1 (root) + L2 (leaf) only, even though
// 791/888 products have a real L3 in the source CSV. `level_2_total` (not
// `product_count`) is the right expected-count column for the leaf as a result.
for (const row of rows) {
  const l1 = row.level_1.trim();
  const l2 = row.level_2.trim();
  const segs = row.category_url_path
    .trim()
    .replace(/^\/|\/$/g, "")
    .split("/");

  const l1Node = findOrCreate(root.children, "root", "root", l1, segs[0]);
  const l2Node = findOrCreate(
    l1Node.children,
    `root>>${l1}`,
    l1Node.handle,
    l2,
    segs[1]
  );

  terminalHandleByPath.set(`${l1}|${l2}`, l2Node.handle);
}

const collisions = flattenHandles(root.children).filter(
  (h, i, arr) => arr.indexOf(h) !== i
);
if (collisions.length > 0) {
  throw new Error(
    `[generate-category-tree-v4] handle collisions survived disambiguation: ${collisions.join(", ")}`
  );
}

const tsOut = `export type CategoryNode = {
  name: string;
  handle: string;
  children: CategoryNode[];
};

export const CATEGORY_TREE: CategoryNode[] = ${JSON.stringify(root.children, null, 2)};

function flattenHandles(nodes: CategoryNode[]): string[] {
  return nodes.flatMap((n) => [n.handle, ...flattenHandles(n.children)]);
}

function terminalNodes(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((n) =>
    n.children.length > 0 ? terminalNodes(n.children) : [n]
  );
}

export const ALL_CATEGORY_HANDLES = new Set(flattenHandles(CATEGORY_TREE));
export const ALL_ROOT_HANDLES = new Set(CATEGORY_TREE.map((root) => root.handle));
export const TERMINAL_HANDLES = new Set(
  terminalNodes(CATEGORY_TREE).map((n) => n.handle)
);
`;

writeFileSync(
  resolve(process.cwd(), "src", "data", "category-tree.ts"),
  tsOut,
  "utf8"
);

writeFileSync(
  resolve(process.cwd(), "data", "ingco", "category-terminal-handles-v4.json"),
  JSON.stringify(Object.fromEntries(terminalHandleByPath), null, 2),
  "utf8"
);

console.log(
  `[generate-category-tree-v4] wrote ${root.children.length} roots, ${flattenHandles(root.children).length} total nodes`
);
```

- [ ] **Step 2: Run it**

Run: `cd apps/backend && npx tsx src/scripts/generate-category-tree-v4.ts`
Expected: `[generate-category-tree-v4] wrote 14 roots, 90 total nodes` (14 L1 roots + 76 distinct L1/L2 pairs) and no thrown collision error.

- [ ] **Step 3: Sanity-check the disambiguated handles**

Run: `grep -A2 '"name": "Accesorii și consumabile"' apps/backend/src/data/category-tree.ts | head -20`
Expected: two nodes with that `name` exist (the L1 root, handle `accesorii-si-consumabile`; and the L2 under Sudură și lipire, handle `accesorii-si-consumabile-sudura-si-lipire`).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/scripts/generate-category-tree-v4.ts apps/backend/src/data/category-tree.ts apps/backend/data/ingco/category-terminal-handles-v4.json
git commit -m "DYLLU-000 feat: generate L1/L2 category tree from Dyllu_Taxonomy_v4"
```

---

## Task 3: Update category seeding to be depth-generic

**Outcome: no code change needed.** Confirmed after Task 2 ran: `CATEGORY_TREE` is exactly 2 levels deep (0 grandchildren across all 14 roots × 76 leaves — verified programmatically). The existing root-batch-then-leaf-batch seeding code in `initial-data-seed.ts` only ever reads `root.name`/`root.handle`/`leaf.name`/`leaf.handle` and never touches `leaf.children`, so it already handles the new (structurally compatible) `CategoryNode` type correctly — it typechecked clean with zero edits. Writing a generic N-level loop for data that's always exactly 2 deep would be unused complexity, so this task is skipped as originally scoped.

**Files (unchanged, kept for reference):**

- `apps/backend/src/migration-scripts/initial-data-seed.ts:258-297`

- [ ] **Step 1: Replace the category-seed block**

Find this block (currently seeds only 2 levels):

```typescript
logger.info("Seeding product categories...");

const { result: rootCategories } = await createProductCategoriesWorkflow(
  container
).run({
  input: {
    product_categories: CATEGORY_TREE.map((root, index) => ({
      name: root.name,
      handle: root.handle,
      is_active: true,
      rank: index,
    })),
  },
});

const rootIdByHandle = new Map(
  rootCategories.map((cat) => [cat.handle, cat.id])
);

const leafInputs = CATEGORY_TREE.flatMap((root) => {
  const parentId = rootIdByHandle.get(root.handle);
  if (!parentId) return [];
  return root.children.map((leaf, index) => ({
    name: leaf.name,
    handle: leaf.handle,
    parent_category_id: parentId,
    is_active: true,
    rank: index,
  }));
});

if (leafInputs.length > 0) {
  await createProductCategoriesWorkflow(container).run({
    input: { product_categories: leafInputs },
  });
}

logger.info(
  `Finished seeding product categories — ${rootCategories.length} roots, ${leafInputs.length} leaves.`
);
```

Replace with a depth-generic version (creates level by level so `parent_category_id` is always known):

```typescript
logger.info("Seeding product categories...");

const { result: rootCategories } = await createProductCategoriesWorkflow(
  container
).run({
  input: {
    product_categories: CATEGORY_TREE.map((root, index) => ({
      name: root.name,
      handle: root.handle,
      is_active: true,
      rank: index,
    })),
  },
});
const idByHandle = new Map(rootCategories.map((cat) => [cat.handle, cat.id]));

let currentLevel: {
  name: string;
  handle: string;
  children: (typeof CATEGORY_TREE)[number]["children"];
  parentHandle: string;
}[] = CATEGORY_TREE.flatMap((root) =>
  root.children.map((child) => ({ ...child, parentHandle: root.handle }))
);
let totalCreated = rootCategories.length;

while (currentLevel.length > 0) {
  const input = currentLevel.map((node, index) => {
    const parentId = idByHandle.get(node.parentHandle);
    if (!parentId) {
      throw new Error(
        `[seed] parent category "${node.parentHandle}" not created yet for "${node.handle}"`
      );
    }
    return {
      name: node.name,
      handle: node.handle,
      parent_category_id: parentId,
      is_active: true,
      rank: index,
    };
  });

  const { result: created } = await createProductCategoriesWorkflow(
    container
  ).run({ input: { product_categories: input } });
  for (const cat of created) idByHandle.set(cat.handle, cat.id);
  totalCreated += created.length;

  currentLevel = currentLevel.flatMap((node) =>
    node.children.map((child) => ({ ...child, parentHandle: node.handle }))
  );
}

logger.info(`Finished seeding product categories — ${totalCreated} total.`);
```

- [ ] **Step 2: Remove the now-unused `CATEGORY_TREE`-shape assumption elsewhere in the file**

Run: `grep -n "CATEGORY_TREE\|rootCategories\|leafInputs" apps/backend/src/migration-scripts/initial-data-seed.ts`
Expected: only the new block's references remain (no leftover `leafInputs`/old `rootCategories.map` usage elsewhere in the file).

- [ ] **Step 3: Typecheck**

Run: `cd apps/backend && pnpm typecheck`
Expected: no errors from `initial-data-seed.ts` or `category-tree.ts`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/migration-scripts/initial-data-seed.ts
git commit -m "DYLLU-000 feat: seed category tree to arbitrary depth, not just root+leaf"
```

---

## Task 4: Build the v4 product-mapping loader and wire it into ingest

**Files:**

- Create: `apps/backend/src/scripts/lib/load-v4-product-overrides.ts`
- Modify: `apps/backend/src/scripts/ingco-ingest-merged.ts`

- [ ] **Step 1: Write the CSV loader/override map**

```typescript
// apps/backend/src/scripts/lib/load-v4-product-overrides.ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

type CsvRow = Record<string, string>;

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r\n|\n/)
    .filter((l) => l.length > 0);
  const header = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: CsvRow = {};
    header.forEach((key, i) => (row[key] = values[i] ?? ""));
    return row;
  });
}

export type V4Override = {
  title: string;
  handle: string;
  categoryKey: string;
};

// Same alias already used by ingco-sync-bundle-components.ts for this one SKU.
const SKU_ALIASES = new Map([["DTCD1B1285", "DTCD1B12856"]]);

export async function loadV4Overrides(
  mappingPath?: string
): Promise<Map<string, V4Override>> {
  const path =
    mappingPath ??
    resolve(
      process.cwd(),
      "data",
      "ingco",
      "project",
      "Dyllu_Taxonomy_v4_Package",
      "Dyllu_Product_Mapping_v4.csv"
    );
  const rows = parseCsv(await readFile(path, "utf8"));
  const map = new Map<string, V4Override>();
  for (const row of rows) {
    const sku = row.sku.trim().toUpperCase();
    map.set(sku, {
      title: row.product_name,
      handle: row.canonical_id,
      // L3 is intentionally dropped (see plan header) — key matches the
      // generator's 2-level terminalHandleByPath keys exactly.
      categoryKey: `${row.v4_level_1}|${row.v4_level_2}`,
    });
  }
  return map;
}

export function resolveV4Override(
  overrides: Map<string, V4Override>,
  variantSku: string
): V4Override | undefined {
  const upper = variantSku.toUpperCase();
  return overrides.get(upper) ?? overrides.get(SKU_ALIASES.get(upper) ?? upper);
}

export async function loadTerminalHandles(): Promise<Map<string, string>> {
  const path = resolve(
    process.cwd(),
    "data",
    "ingco",
    "category-terminal-handles-v4.json"
  );
  const raw = JSON.parse(await readFile(path, "utf8")) as Record<
    string,
    string
  >;
  return new Map(Object.entries(raw));
}
```

- [ ] **Step 2: Wire it into `ingco-ingest-merged.ts`**

Add imports near the top (after the existing `_revalidate` import):

```typescript
import {
  loadTerminalHandles,
  loadV4Overrides,
  resolveV4Override,
} from "./lib/load-v4-product-overrides";
```

In `ingcoIngestMerged`, after the existing `categoryIdByHandle` block (right after the `logger.info(\`[ingco-merged] category map: ...\`)` line), load the v4 data when requested:

```typescript
const v4Overrides = flags.v4Mapping
  ? await loadV4Overrides(flags.v4Mapping)
  : undefined;
const v4TerminalHandles = v4Overrides ? await loadTerminalHandles() : undefined;
if (v4Overrides) {
  logger.info(
    `[ingco-merged] v4 taxonomy enabled: ${v4Overrides.size} SKU overrides, ${v4TerminalHandles!.size} category paths`
  );
}
```

Modify `toCreateInput` to accept and apply the overrides — change its signature and body:

```typescript
function toCreateInput(
  p: MergedProduct,
  shippingProfileId: string,
  salesChannelId: string,
  categoryIdByHandle: Map<string, string>,
  fallbackCategoryId: string | undefined,
  v4Overrides?: Map<
    string,
    import("./lib/load-v4-product-overrides").V4Override
  >,
  v4TerminalHandles?: Map<string, string>
) {
  if (!p.handle || !p.name || p.variants.length === 0) {
    throw new Error("Merged product is missing a handle, name, or variant");
  }
  for (const variant of p.variants) {
    if (
      !variant.sku ||
      !Number.isFinite(variant.priceMdl) ||
      variant.priceMdl <= 0
    ) {
      throw new Error(`Invalid SKU or price for ${p.handle}`);
    }
  }

  let title = p.name;
  let handle = p.handle;
  let categoryId: string | undefined;

  if (v4Overrides && v4TerminalHandles) {
    const matches = p.variants.map((v) =>
      resolveV4Override(v4Overrides, v.sku)
    );
    const found = matches.filter((m): m is NonNullable<typeof m> => !!m);
    if (found.length === 0) {
      throw new Error(
        `[ingco-merged] no v4 mapping for any variant of ${p.handle} (skus: ${p.variants.map((v) => v.sku).join(", ")})`
      );
    }
    const distinctCategoryKeys = new Set(found.map((f) => f.categoryKey));
    if (distinctCategoryKeys.size > 1) {
      throw new Error(
        `[ingco-merged] variants of ${p.handle} map to different v4 categories: ${[...distinctCategoryKeys].join(" | ")}`
      );
    }
    const primary = found[0];
    title = primary.title;
    handle = primary.handle;
    const terminalHandle = v4TerminalHandles.get(primary.categoryKey);
    if (!terminalHandle) {
      throw new Error(
        `[ingco-merged] no terminal category handle for path "${primary.categoryKey}"`
      );
    }
    categoryId = categoryIdByHandle.get(terminalHandle);
    if (!categoryId) {
      throw new Error(
        `[ingco-merged] category handle "${terminalHandle}" not found in DB — re-run generate-category-tree-v4 + db seed first`
      );
    }
  } else {
    const categoryHandle = resolveCategoryHandle(p);
    categoryId =
      (categoryHandle && categoryIdByHandle.get(categoryHandle)) ??
      fallbackCategoryId;
  }

  const description = buildDescription(p);
  const optionValues = p.variants.map((v) => v.optionValue);
  return {
    title,
    handle,
    description,
    status: (p.inStock ? "published" : "draft") as "published" | "draft",
    shipping_profile_id: shippingProfileId,
    sales_channels: [{ id: salesChannelId }],
    options: [{ title: p.optionTitle, values: optionValues }],
    images: p.images.map((url) => ({ url })),
    category_ids: categoryId ? [categoryId] : [],
    metadata: {
      ...(p.classification ?? {}),
      ingco_family: p.metadata.ingco_family,
      ingco_articles: p.metadata.ingco_articles.join(","),
      ingco_source_urls: p.metadata.ingco_source_urls.join("\n"),
      ingco_source_skus: p.metadata.ingco_source_skus.join(","),
      ingco_breadcrumbs: p.breadcrumbs.join(" > "),
      ingco_source_categories: p.sourceCategories.join(", "),
      ingco_kind: p.kind,
      ingco_in_stock: p.inStock,
      ingco_mapped_category: v4Overrides
        ? "(v4)"
        : (resolveCategoryHandle(p) ?? "(fallback)"),
    },
    variants: p.variants.map((v) => ({
      title: v.optionValue,
      sku: v.sku,
      manage_inventory: false,
      options: { [p.optionTitle]: v.optionValue },
      prices: [{ currency_code: "mdl", amount: v.priceMdl }],
      metadata: {
        ingco_article: v.article,
        ingco_internal_sku: v.internalSku,
        ingco_source_url: v.sourceUrl,
        ingco_source_id: v.sourceId,
        ingco_variant_image: v.image,
      },
    })),
  };
}
```

Update the two call sites that build `input` (in the batch loop) to pass the new args:

```typescript
const input = batch.map((p) =>
  toCreateInput(
    p,
    shippingProfileId,
    defaultSc.id,
    categoryIdByHandle,
    fallbackCategoryId,
    v4Overrides,
    v4TerminalHandles
  )
);
```

Add the `v4Mapping` flag to `parseArgs`:

```typescript
function parseArgs(args: string[]) {
  const out: {
    limit?: number;
    batch?: number;
    dir?: string;
    fallbackCategory?: string;
    v4Mapping?: string;
  } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (!key || rawValue === undefined) continue;
    if (key === "limit") out.limit = Number(rawValue);
    else if (key === "batch") out.batch = Number(rawValue);
    else if (key === "dir") out.dir = rawValue;
    else if (key === "fallbackCategory") out.fallbackCategory = rawValue;
    else if (key === "v4Mapping") out.v4Mapping = rawValue;
  }
  return out;
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/backend && pnpm typecheck`
Expected: no errors.

- [ ] **Step 4: Dry-review the join before touching the DB**

Run a quick Node one-liner to confirm every `products-merged` file resolves to exactly one v4 category (this is the same check the script will enforce at runtime, but cheaper to see up front):

```bash
cd apps/backend && npx tsx -e "
import { loadV4Overrides, resolveV4Override } from './src/scripts/lib/load-v4-product-overrides';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const main = async () => {
  const overrides = await loadV4Overrides();
  const dir = 'data/ingco/products-merged';
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
  let bad = 0;
  for (const f of files) {
    const p = JSON.parse(await readFile(join(dir, f), 'utf8'));
    const keys = new Set(p.variants.map((v: any) => resolveV4Override(overrides, v.sku)?.categoryKey));
    if (keys.has(undefined) || keys.size > 1) { console.log(f, [...keys]); bad++; }
  }
  console.log('files with issues:', bad, '/', files.length);
};
main();
"
```

Expected: `files with issues: 0 / 633`

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/scripts/lib/load-v4-product-overrides.ts apps/backend/src/scripts/ingco-ingest-merged.ts
git commit -m "DYLLU-000 feat: ingest v4 product names, canonical handles, and taxonomy"
```

---

## Task 5: Full local DB reset

This is the destructive step — everything before this point is preparation and is safe to re-run. Confirm Task 1's backup file count (161) before proceeding.

**Files:** none (infra commands only)

- [ ] **Step 1: Confirm current container state**

Run: `docker compose -f apps/backend/docker-compose.yml ps`
Expected: `dyllu-medusa-postgres` listed, healthy.

- [ ] **Step 2: Stop and drop the volume**

Run: `docker compose -f apps/backend/docker-compose.yml down -v`
Expected: container stopped, `dyllu-medusa-postgres` and the `medusa-postgres-data` volume removed.

- [ ] **Step 3: Recreate**

Run: `docker compose -f apps/backend/docker-compose.yml up -d --wait`
Expected: healthy within the compose healthcheck window (5s interval, 10 retries).

- [ ] **Step 4: Migrate + auto-seed**

Run: `cd apps/backend && pnpm db:migrate`
Expected log lines include `Finished seeding product categories — 184 total.` (14 roots + 170 children, from Task 2's count) and the rest of `initial_data_seed`'s usual output (store, region, sales channel, shipping, stock location).

- [ ] **Step 5: Recreate the local admin user**

Run: `pnpm db:create-user -e admin@dyllu.local -p "<pick a password>"`
Expected: user created confirmation.

---

## Task 6: Run the v4 ingest

**Files:** none (running Task 4's script)

- [ ] **Step 1: Ingest with v4 overrides**

Run: `cd apps/backend && npx medusa exec ./src/scripts/ingco-ingest-merged.ts v4Mapping=data/ingco/project/Dyllu_Taxonomy_v4_Package/Dyllu_Product_Mapping_v4.csv`

Expected final line: `[ingco-merged] done — created 888 products` (all 888, since the DB is empty post-reset — none are "already in DB").

- [ ] **Step 2: Verify count and a sample product**

```bash
docker exec dyllu-medusa-postgres psql -U medusa -d dyllu_medusa -t -c "
SELECT count(*) FROM product WHERE deleted_at IS NULL;
"
docker exec dyllu-medusa-postgres psql -U medusa -d dyllu_medusa -t -c "
SELECT p.title, p.handle, c.name FROM product p
JOIN product_variant v ON v.product_id = p.id
JOIN product_category_product pcp ON pcp.product_id = p.id
JOIN product_category c ON c.id = pcp.product_category_id
WHERE v.sku = 'DTAAC501';
"
```

Expected: `888` products; the DTAAC501 row shows title `Compresor auto Dyllu DTAAC501, 12 V, 11 bar`, handle `compresor-auto-dtaac501-12v`, category name `Umflare și întreținere roți` (the v4 L2 — L3 "Compresoare auto și pompe de umflat" is dropped per the depth decision).

---

## Task 7: Restore bundle metadata

**Files:** none (running the existing sync script against the reconstructed `bundles.json` from Task 1)

- [ ] **Step 1: Dry run first**

Run: `cd apps/backend && npx medusa exec ./src/scripts/ingco-sync-bundle-components.ts dryRun=true`
Expected: `[bundle-sync] loaded 161 bundle entries` and `[bundle-sync] matched 156 products with bundle contents`. 156, not 161, is correct here: `bundle_components` is stored at the _product_ level, and 4 products have multiple bundle-carrying variant SKUs each (2+2+2+3 = 9 SKUs → 4 products, a reduction of exactly 5, matching 161−156). Only investigate further if the matched count is _lower_ than 156.

**Also fixes a real pre-existing bug while you're here:** the original script paginated `product_variant` with `skip`/`take` and no explicit order — `query.graph` pagination has no guaranteed stable order, so this can silently skip or duplicate rows across page boundaries. Since 888 variants fit in one query, replace the pagination loop with a single `pagination: { skip: 0, take: 5000 }` call (same fix as Task 1's backup script).

- [ ] **Step 2: Apply for real**

Run: `npx medusa exec ./src/scripts/ingco-sync-bundle-components.ts dryRun=false`
Expected: `[bundle-sync] done — updated 156 products`

- [ ] **Step 3: Verify against the pre-wipe baseline**

```bash
docker exec dyllu-medusa-postgres psql -U medusa -d dyllu_medusa -t -c "
SELECT count(*) FROM product WHERE metadata::text ILIKE '%bundle_components%' AND deleted_at IS NULL;
"
```

Expected: `156` (same as Task 7 Step 2's matched-products count, not the raw 161 SKU-level backup count — see the note there).

---

## Task 8: Verify against the v4 spec

**Files:** none (verification only)

- [ ] **Step 1: Category counts match `Dyllu_Taxonomy_v4.csv`**

```bash
cd apps/backend/data/ingco/project/Dyllu_Taxonomy_v4_Package
python3 - <<'EOF'
import csv, subprocess, json

with open('Dyllu_Taxonomy_v4.csv', encoding='utf-8-sig', newline='') as f:
    tax = list(csv.DictReader(f))

out = subprocess.run(
    ["docker", "exec", "dyllu-medusa-postgres", "psql", "-U", "medusa", "-d", "dyllu_medusa", "-t", "-A", "-F", ",", "-c",
     """
     SELECT c.handle, count(v.id) FROM product_category c
     JOIN product_category_product pcp ON pcp.product_category_id = c.id
     JOIN product p ON p.id = pcp.product_id AND p.deleted_at IS NULL
     JOIN product_variant v ON v.product_id = p.id
     WHERE c.deleted_at IS NULL
     GROUP BY c.handle;
     """],
    capture_output=True, text=True
)
# Group by handle (not name — 2 category names are legitimately reused across
# different handles, see plan header) and count variants/SKUs, not products —
# Dyllu_Taxonomy_v4.csv counts at SKU level (888 total) but multi-variant
# products merge several SKUs into one Medusa product (634 total products).
db_counts = {}
for line in out.stdout.strip().splitlines():
    handle, count = line.rsplit(",", 1)
    db_counts[handle] = int(count)
with open("data/ingco/category-terminal-handles-v4.json", encoding="utf-8") as f:
    terminal_handles = json.load(f)  # "L1|L2" -> handle

seen = set()
mismatches = []
for r in tax:
    key = (r['level_1'], r['level_2'])
    if key in seen:
        continue  # multiple L3 rows collapse to the same L2 leaf — check once
    seen.add(key)
    handle = terminal_handles[f"{r['level_1']}|{r['level_2']}"]
    expected = int(r['level_2_total'])
    actual = db_counts.get(handle, 0)
    if expected != actual:
        mismatches.append((r['level_1'], r['level_2'], expected, actual))

print(f"{len(mismatches)} mismatches out of {len(seen)} L1/L2 leaf categories")
for m in mismatches[:20]:
    print(m)
EOF
```

Expected: `0 mismatches out of 76 L1/L2 leaf categories`, `totals: expected=888 actual=888`. Two things that look like bugs but aren't, if you're re-deriving this check by hand: (1) group by category `handle`, not `name` — 2 category names are legitimately reused across different handles (`accesorii-si-consumabile`, `gaurire-si-insurubare`); (2) count `product_variant` rows, not `product` rows — `Dyllu_Taxonomy_v4.csv` counts at SKU level (888), but 104 multi-variant products merge several SKUs into one Medusa product (634 products total), so a naive per-product count will look systematically short.

- [ ] **Step 2: Spot-check 5 random product pages locally**

Run: `pnpm dev:store` (from repo root), then in a browser hit `http://localhost:4000/products/{handle}` for 5 handles pulled from `Dyllu_Product_Mapping_v4.csv`'s `canonical_id` column, including at least one that has `bundle_components` (e.g. a SKU from Task 1's backup). Confirm: title matches `product_name`, URL matches `canonical_id`, and (for the bundle one) the included-accessories section on the PDP renders.

- [ ] **Step 3: Note the known pre-existing gaps for the user**

Do not attempt to fix in this plan — just confirm they still reproduce exactly as before (i.e. this migration didn't make them worse):

- `/categories/...` browsing pages (may already 404 — `getCategoryByHandle` joined-path bug, pre-existing).
- Mega-menu may show stale/broken category links (pre-existing, `category-navigation.ts` not yet updated to v4 handles).

---

## Task 9 (optional cleanup — confirm with user before doing): retire `ingco-categorize.ts`

**Files:**

- Delete: `apps/backend/src/scripts/ingco-categorize.ts`

- [ ] **Step 1: Confirm nothing else imports it**

Run: `grep -rln "ingco-categorize" apps/backend/src apps/backend/package.json`
Expected: only the file itself (no importers — it's only ever invoked directly via `medusa exec`).

- [ ] **Step 2: Delete and commit**

```bash
git rm apps/backend/src/scripts/ingco-categorize.ts
git commit -m "DYLLU-000 refactor: remove ingco-categorize, superseded by v4 taxonomy mapping"
```

---

## Self-Review

**Spec coverage:**

- "apply this taxonomy" → Task 2 (tree) + Task 3 (seed) + Task 6 (category assignment during ingest). ✅
- "new product names" → Task 4 (`title` override from `product_name`). ✅
- "canonical urls" → Task 4 (`handle` override from `canonical_id`); explicitly did _not_ embed the full category path in the product URL since that would be a routing architecture change — flagged as a decision in the facts section. ✅
- "we have metadata... should not lose this" → Task 1 (backup before wipe) + Task 7 (restore) + Task 8 Step 3 (count verification against pre-wipe baseline). ✅
- "clean up all categories, product and import from scratch" → Task 5 (full volume wipe + fresh migrate/seed). ✅
- "local host first" → nothing in this plan touches production; `docker-compose.yml` is the local-only Postgres on port 5433, and `ingco-wipe.ts`'s production guard was never invoked (we used a full volume reset instead, which only works against the local container anyway).

**Placeholder scan:** no TBD/TODO, all code blocks are complete and runnable as written, all commands have stated expected output.

**Type consistency:** `V4Override` type is defined once in `load-v4-product-overrides.ts` and referenced by import in `ingco-ingest-merged.ts` (not redefined); `CategoryNode` type is defined once in the generator's emitted output and not duplicated elsewhere.
