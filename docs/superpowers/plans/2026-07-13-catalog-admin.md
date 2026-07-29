# Catalog Admin Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local-only Next.js admin app in the DYLLU monorepo (`apps/catalog-admin`) for editing the catalog SQLite database with inline problem-detection — fully-operational product editing plus navigable stubs for the rest.

**Architecture:** Next.js 16 + React 19 (App Router, Node runtime, Server Actions), shadcn/ui + Tailwind, Drizzle ORM + better-sqlite3 over `data/catalog.db`. Pure logic (queries, QA checks, validation, save transaction) is TDD'd with vitest; UI is verified by typecheck/lint/build + a Playwright smoke.

**Tech Stack:** pnpm@10.19, turbo, Node 22, Next 16, React 19, Drizzle, better-sqlite3, Zod, vitest, Playwright, shadcn/ui.

**Design doc:** `docs/superpowers/specs/2026-07-13-catalog-admin-design.md`

**Global constraints:**

- All work is in `~/Projects/DYLLU`. **Do NOT run any git commands / do NOT commit** — the app and DB are gitignored, nothing is committed.
- Run commands from the app dir unless noted: `cd ~/Projects/DYLLU/apps/catalog-admin`.
- Use `pnpm` (never npm/yarn). Install app deps with `pnpm add` inside the app dir.

---

## File Structure

```
apps/catalog-admin/
  package.json  tsconfig.json  next.config.ts  postcss.config.mjs
  tailwind.config.ts  components.json  drizzle.config.ts  vitest.config.ts
  .gitignore  playwright.config.ts
  data/catalog.db                      # copied, gitignored
  drizzle/
    schema.ts                          # typed mirror of 7 tables + product_content
    migrate-content.ts                 # product_content migration + extras lift
  src/
    db/client.ts                       # drizzle + better-sqlite3 singleton
    lib/qa.ts                          # data-problem checks (mirror SQL views)
    lib/validation.ts                  # Zod schemas
    lib/queries.ts                     # list + product bundle + saveProductBundle
    app/
      layout.tsx  globals.css
      page.tsx                         # redirect -> /products
      _components/AppShell.tsx  _components/NavItem.tsx
      products/page.tsx                # list
      products/_components/ProductList.tsx
      products/[id]/page.tsx           # editor shell
      products/[id]/_tabs/{Overview,Variants,Specs,Description,Images,Links}.tsx
      products/actions.ts              # server action: saveProduct
      problems/page.tsx                # QA dashboard
      specs-dictionary/page.tsx categories/page.tsx links/page.tsx
      bulk/page.tsx settings/page.tsx  # stubs
    components/ui/*                     # shadcn
  tests/
    qa.test.ts validation.test.ts queries.test.ts content-migration.test.ts
    e2e/edit-variant.spec.ts
```

---

## Task 1: Scaffold the Next.js app

**Files:** create `apps/catalog-admin/{package.json,tsconfig.json,next.config.ts,postcss.config.mjs,src/app/layout.tsx,src/app/globals.css,src/app/page.tsx}`

- [ ] **Step 1: Create package.json**

Create `apps/catalog-admin/package.json`:

```json
{
  "name": "catalog-admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 4100",
    "build": "next build",
    "start": "next start -p 4100",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "db:migrate": "tsx drizzle/migrate-content.ts"
  },
  "dependencies": {
    "next": "16.2.10",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "better-sqlite3": "^11.8.1",
    "drizzle-orm": "^0.38.3",
    "zod": "^3.24.1",
    "lucide-react": "^0.469.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.5.0",
    "class-variance-authority": "^0.7.1"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.12",
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^3.4.17",
    "postcss": "^8",
    "autoprefixer": "^10.4.20",
    "tailwindcss-animate": "^1.0.7",
    "drizzle-kit": "^0.30.1",
    "tsx": "^4.19.2",
    "vitest": "^2.1.8",
    "@playwright/test": "^1.49.1",
    "eslint": "^9",
    "eslint-config-next": "16.2.10"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

Create `apps/catalog-admin/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "baseUrl": "./src",
    "paths": { "@/*": ["./*"] },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts and postcss.config.mjs**

Create `apps/catalog-admin/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
```

Create `apps/catalog-admin/postcss.config.mjs`:

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 4: Create the minimal app skeleton**

Create `apps/catalog-admin/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `apps/catalog-admin/src/app/layout.tsx`:

```tsx
import "./globals.css";

export const metadata = { title: "Catalog Admin" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

Create `apps/catalog-admin/src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/products");
}
```

- [ ] **Step 5: Install deps and verify the app boots**

Run from repo root: `cd ~/Projects/DYLLU && pnpm install`
Then: `cd ~/Projects/DYLLU/apps/catalog-admin && pnpm typecheck`
Expected: no type errors.
Then boot check: `pnpm build`
Expected: build completes (a page at `/` redirecting to `/products` — `/products` will 404 until Task 9; that is fine, build still succeeds).

- [ ] **Step 6: No commit** (gitignored app; skip)

---

## Task 2: Tailwind + shadcn/ui setup

**Files:** create `tailwind.config.ts`, `components.json`, `src/lib/utils.ts`; shadcn writes into `src/components/ui/`.

- [ ] **Step 1: Create tailwind.config.ts**

Create `apps/catalog-admin/tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

- [ ] **Step 2: Initialize shadcn**

Run: `cd ~/Projects/DYLLU/apps/catalog-admin && pnpm dlx shadcn@latest init -d`
(`-d` accepts defaults: New York style, neutral base, CSS variables. This writes `components.json`, updates `globals.css` with the design tokens, and creates `src/lib/utils.ts`.)
Expected: `components.json` and `src/lib/utils.ts` exist.

- [ ] **Step 3: Add the component set the app uses**

Run: `pnpm dlx shadcn@latest add button input label select textarea table tabs card badge dialog dropdown-menu tooltip separator sonner scroll-area switch`
Expected: files appear under `src/components/ui/`.

- [ ] **Step 4: Verify**

Run: `pnpm typecheck`
Expected: no type errors.

---

## Task 3: Bring the database in + gitignore

**Files:** create `apps/catalog-admin/.gitignore`; copy `catalog.db`; edit root `.gitignore`.

- [ ] **Step 1: Copy the database**

Run: `mkdir -p ~/Projects/DYLLU/apps/catalog-admin/data && cp ~/Projects/catalog-ai-pipeline/catalog.db ~/Projects/DYLLU/apps/catalog-admin/data/catalog.db`
Verify: `ls -la ~/Projects/DYLLU/apps/catalog-admin/data/catalog.db` shows a ~1MB+ file.

- [ ] **Step 2: App-level .gitignore**

Create `apps/catalog-admin/.gitignore`:

```
node_modules/
.next/
data/
*.db
*.db-journal
test-results/
playwright-report/
.turbo/
```

- [ ] **Step 3: Ensure the whole app is gitignored at repo root (nothing committed yet)**

Append to `~/Projects/DYLLU/.gitignore`:

```
# Catalog admin (local-only tool, not committed yet)
apps/catalog-admin/
```

Verify: `cd ~/Projects/DYLLU && git status --porcelain apps/catalog-admin | head` prints nothing.

---

## Task 4: Drizzle schema + db client (TDD)

**Files:** create `drizzle/schema.ts`, `drizzle.config.ts`, `src/db/client.ts`, `vitest.config.ts`, `tests/queries.test.ts` (schema smoke portion).

- [ ] **Step 1: Create vitest.config.ts**

Create `apps/catalog-admin/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
});
```

- [ ] **Step 2: Write the Drizzle schema**

Create `apps/catalog-admin/drizzle/schema.ts`:

```ts
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const category = sqliteTable("category", {
  id: integer("id").primaryKey(),
  nameRo: text("name_ro").notNull(),
  parentId: integer("parent_id"),
  path: text("path"),
});

export const product = sqliteTable("product", {
  id: text("id").primaryKey(),
  handle: text("handle"),
  titleRo: text("title_ro"),
  titleEn: text("title_en"),
  categoryId: integer("category_id"),
  productType: text("product_type"),
  powerSource: text("power_source"),
  groupNameRo: text("group_name_ro"),
  groupNameEn: text("group_name_en"),
  axis: text("axis"),
  descriptionRo: text("description_ro"),
  status: text("status").default("draft"),
  extras: text("extras"),
});

export const variant = sqliteTable("variant", {
  sku: text("sku").primaryKey(),
  productId: text("product_id"),
  value: text("value"),
  variantKey: text("variant_key"),
  priceMdl: real("price_mdl"),
  currency: text("currency").default("mdl"),
  position: integer("position").default(0),
  reviewedType: text("reviewed_type"),
  batteryIncluded: text("battery_included"),
  batteryCount: text("battery_count"),
  batteryCapacity: text("battery_capacity"),
  chargerIncluded: text("charger_included"),
  caseIncluded: text("case_included"),
  variantSize: text("variant_size"),
  variantVal: text("variant_val"),
  qaOk: text("qa_ok"),
  qaReason: text("qa_reason"),
  groupConfirmed: text("group_confirmed"),
  rawText: text("raw_text"),
});

export const image = sqliteTable("image", {
  id: integer("id").primaryKey(),
  sku: text("sku"),
  role: text("role"),
  sourceUrl: text("source_url"),
  togroupUrl: text("togroup_url"),
  normalizedFile: text("normalized_file"),
  cleanFile: text("clean_file"),
  imageMode: text("image_mode"),
  imageModeLocked: text("image_mode_locked"),
  imageOwn: text("image_own"),
  status: text("status"),
});

export const specification = sqliteTable("specification", {
  id: integer("id").primaryKey(),
  sku: text("sku"),
  keyRaw: text("key_raw"),
  keyNorm: text("key_norm"),
  labelRo: text("label_ro"),
  valueRaw: text("value_raw"),
  valueNum: real("value_num"),
  unit: text("unit"),
  position: integer("position").default(0),
});

export const specKey = sqliteTable("spec_key", {
  keyRaw: text("key_raw").primaryKey(),
  keyNorm: text("key_norm").notNull(),
  labelRo: text("label_ro").notNull(),
  unitHint: text("unit_hint"),
});

export const link = sqliteTable("link", {
  id: integer("id").primaryKey(),
  productId: text("product_id"),
  relatedGroupId: text("related_group_id"),
  name: text("name"),
  kind: text("kind").default("related"),
});

// Added by Task 5 migration; declared here so queries are typed.
export const productContent = sqliteTable("product_content", {
  productId: text("product_id").primaryKey(),
  shortDescription: text("short_description"),
  whyGood: text("why_good"),
  seoText: text("seo_text"),
  metaTitle: text("meta_title"),
  metaDescription: text("meta_description"),
  imageAlt: text("image_alt"),
  highlights: text("highlights"),
  useCases: text("use_cases"),
  faq: text("faq"),
  keywords: text("keywords"),
  specifications: text("specifications"),
});
```

- [ ] **Step 3: Create drizzle.config.ts and db client**

Create `apps/catalog-admin/drizzle.config.ts`:

```ts
import type { Config } from "drizzle-kit";

export default {
  schema: "./drizzle/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: "./data/catalog.db" },
} satisfies Config;
```

Create `apps/catalog-admin/src/db/client.ts`:

```ts
import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import path from "node:path";
import * as schema from "../../drizzle/schema";

const DB_PATH = process.env.CATALOG_DB_PATH
  ? path.resolve(process.env.CATALOG_DB_PATH)
  : path.join(process.cwd(), "data", "catalog.db");

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export { schema };
```

Note: `server-only` guards against importing the DB from client components. Tests import `drizzle/schema` + a local better-sqlite3 handle directly, not this module.

- [ ] **Step 4: Write a schema smoke test**

Create `apps/catalog-admin/tests/queries.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "../drizzle/schema";

function memDb() {
  const sqlite = new Database(":memory:");
  sqlite.exec(`
    CREATE TABLE product (id TEXT PRIMARY KEY, handle TEXT, title_ro TEXT, title_en TEXT,
      category_id INTEGER, product_type TEXT, power_source TEXT, group_name_ro TEXT,
      group_name_en TEXT, axis TEXT, description_ro TEXT, status TEXT, extras TEXT);
    CREATE TABLE variant (sku TEXT PRIMARY KEY, product_id TEXT, value TEXT, variant_key TEXT,
      price_mdl REAL, currency TEXT, position INTEGER, reviewed_type TEXT, battery_included TEXT,
      battery_count TEXT, battery_capacity TEXT, charger_included TEXT, case_included TEXT,
      variant_size TEXT, variant_val TEXT, qa_ok TEXT, qa_reason TEXT, group_confirmed TEXT, raw_text TEXT);
    CREATE TABLE specification (id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT,
      label_ro TEXT, value_raw TEXT, value_num REAL, unit TEXT, position INTEGER);
    CREATE TABLE spec_key (key_raw TEXT PRIMARY KEY, key_norm TEXT, label_ro TEXT, unit_hint TEXT);
    CREATE TABLE image (id INTEGER PRIMARY KEY, sku TEXT, role TEXT, source_url TEXT, togroup_url TEXT,
      normalized_file TEXT, clean_file TEXT, image_mode TEXT, image_mode_locked TEXT, image_own TEXT, status TEXT);
    CREATE TABLE link (id INTEGER PRIMARY KEY, product_id TEXT, related_group_id TEXT, name TEXT, kind TEXT);
    CREATE TABLE category (id INTEGER PRIMARY KEY, name_ro TEXT, parent_id INTEGER, path TEXT);
    CREATE TABLE product_content (product_id TEXT PRIMARY KEY, short_description TEXT, why_good TEXT,
      seo_text TEXT, meta_title TEXT, meta_description TEXT, image_alt TEXT, highlights TEXT,
      use_cases TEXT, faq TEXT, keywords TEXT, specifications TEXT);
  `);
  return { db: drizzle(sqlite, { schema }), sqlite };
}

export { memDb };

describe("schema", () => {
  it("selects an inserted product via drizzle", async () => {
    const { db } = memDb();
    await db.insert(schema.product).values({ id: "g1", titleRo: "Ciocan" });
    const rows = await db.select().from(schema.product);
    expect(rows[0].titleRo).toBe("Ciocan");
  });
});
```

- [ ] **Step 5: Run**

Run: `cd ~/Projects/DYLLU/apps/catalog-admin && pnpm test`
Expected: 1 passed.

---

## Task 5: product_content migration + extras lift (TDD)

**Files:** create `drizzle/migrate-content.ts`, `tests/content-migration.test.ts`.

The migration: create `product_content` if absent, then for every `product` whose `extras` JSON contains a `description_ro` object, upsert a `product_content` row (scalars as text, arrays as JSON strings). Idempotent.

- [ ] **Step 1: Write the failing test**

Create `apps/catalog-admin/tests/content-migration.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { migrateContent } from "../drizzle/migrate-content";
import { memDb } from "./queries.test";

describe("migrateContent", () => {
  it("lifts description_ro from extras into product_content", () => {
    const { sqlite } = memDb();
    const extras = JSON.stringify({
      description_ro: {
        short_description: "Scurt",
        highlights: ["a", "b"],
        specifications: ["Putere: 1kW"],
        meta_title: "T",
      },
    });
    sqlite
      .prepare("INSERT INTO product(id, extras) VALUES ('g1', ?)")
      .run(extras);

    const n = migrateContent(sqlite);
    expect(n).toBe(1);

    const row = sqlite
      .prepare("SELECT * FROM product_content WHERE product_id='g1'")
      .get() as any;
    expect(row.short_description).toBe("Scurt");
    expect(JSON.parse(row.highlights)).toEqual(["a", "b"]);
    expect(JSON.parse(row.specifications)).toEqual(["Putere: 1kW"]);
    expect(row.meta_title).toBe("T");
  });

  it("is idempotent and skips products without description_ro", () => {
    const { sqlite } = memDb();
    sqlite
      .prepare("INSERT INTO product(id, extras) VALUES ('g2', ?)")
      .run(JSON.stringify({ category_path: ["X"] }));
    expect(migrateContent(sqlite)).toBe(0);
    // re-run with a real one does not duplicate
    sqlite
      .prepare("INSERT INTO product(id, extras) VALUES ('g1', ?)")
      .run(JSON.stringify({ description_ro: { short_description: "S" } }));
    expect(migrateContent(sqlite)).toBe(1);
    expect(migrateContent(sqlite)).toBe(1); // upsert, still 1 row touched, no dup
    const count = sqlite
      .prepare("SELECT COUNT(*) c FROM product_content")
      .get() as any;
    expect(count.c).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/content-migration.test.ts`
Expected: FAIL — cannot find `../drizzle/migrate-content`.

- [ ] **Step 3: Implement the migration**

Create `apps/catalog-admin/drizzle/migrate-content.ts`:

```ts
import Database from "better-sqlite3";
import path from "node:path";

const TEXT_FIELDS = [
  "short_description",
  "why_good",
  "seo_text",
  "meta_title",
  "meta_description",
  "image_alt",
] as const;
const JSON_FIELDS = [
  "highlights",
  "use_cases",
  "faq",
  "keywords",
  "specifications",
] as const;

export function migrateContent(sqlite: Database.Database): number {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS product_content (
      product_id TEXT PRIMARY KEY, short_description TEXT, why_good TEXT, seo_text TEXT,
      meta_title TEXT, meta_description TEXT, image_alt TEXT, highlights TEXT,
      use_cases TEXT, faq TEXT, keywords TEXT, specifications TEXT
    );
  `);

  const cols = ["product_id", ...TEXT_FIELDS, ...JSON_FIELDS];
  const placeholders = cols.map(() => "?").join(", ");
  const updates = cols
    .slice(1)
    .map((c) => `${c}=excluded.${c}`)
    .join(", ");
  const upsert = sqlite.prepare(
    `INSERT INTO product_content(${cols.join(", ")}) VALUES (${placeholders}) ` +
      `ON CONFLICT(product_id) DO UPDATE SET ${updates}`
  );

  const rows = sqlite
    .prepare("SELECT id, extras FROM product WHERE extras IS NOT NULL")
    .all() as { id: string; extras: string }[];

  let migrated = 0;
  for (const r of rows) {
    let dro: any;
    try {
      dro = JSON.parse(r.extras)?.description_ro;
    } catch {
      continue;
    }
    if (!dro || typeof dro !== "object") continue;
    const values = [
      r.id,
      ...TEXT_FIELDS.map((f) => (typeof dro[f] === "string" ? dro[f] : null)),
      ...JSON_FIELDS.map((f) =>
        dro[f] != null ? JSON.stringify(dro[f]) : null
      ),
    ];
    upsert.run(...values);
    migrated += 1;
  }
  return migrated;
}

function main() {
  const dbPath = process.env.CATALOG_DB_PATH
    ? path.resolve(process.env.CATALOG_DB_PATH)
    : path.join(process.cwd(), "data", "catalog.db");
  const sqlite = new Database(dbPath);
  const n = migrateContent(sqlite);
  console.log(`product_content: migrated ${n} products`);
}

if (process.argv[1] && process.argv[1].endsWith("migrate-content.ts")) main();
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test tests/content-migration.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Apply to the real DB**

Run: `cd ~/Projects/DYLLU/apps/catalog-admin && pnpm db:migrate`
Expected: prints `product_content: migrated 276 products` (or the current product count).

---

## Task 6: QA checks module (TDD)

**Files:** create `src/lib/qa.ts`, `tests/qa.test.ts`.

`qa.ts` exports `productProblems(sku-less product bundle)` for inline use and
`countProblems(sqlite)` for the dashboard. Mirrors the SQL views from the pipeline
DB: missing_price, missing_specs, unmapped_spec_key, ungrouped "Standard" variant,
orphan_image, single_variant_group, category_missing.

- [ ] **Step 1: Write the failing test**

Create `apps/catalog-admin/tests/qa.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { productProblems } from "../src/lib/qa";

const base = {
  id: "g1",
  categoryId: 5,
  variants: [
    {
      sku: "S1",
      value: "52cc",
      priceMdl: 1799,
      specs: [{ keyRaw: "Rated power" }],
    },
    {
      sku: "S2",
      value: "62cc",
      priceMdl: 1999,
      specs: [{ keyRaw: "Displacement" }],
    },
  ],
  mappedKeys: new Set(["rated power", "displacement"]),
};

describe("productProblems", () => {
  it("returns no problems for clean product", () => {
    expect(productProblems(base)).toEqual([]);
  });

  it("flags missing price", () => {
    const p = { ...base, variants: [{ ...base.variants[0], priceMdl: null }] };
    expect(
      productProblems(p).some(
        (x) => x.code === "missing_price" && x.sku === "S1"
      )
    ).toBe(true);
  });

  it("flags missing specs", () => {
    const p = { ...base, variants: [{ ...base.variants[0], specs: [] }] };
    expect(productProblems(p).some((x) => x.code === "missing_specs")).toBe(
      true
    );
  });

  it("flags ungrouped Standard value", () => {
    const p = {
      ...base,
      variants: [{ ...base.variants[0], value: "Standard" }],
    };
    expect(productProblems(p).some((x) => x.code === "ungrouped_variant")).toBe(
      true
    );
  });

  it("flags unmapped spec key", () => {
    const p = {
      ...base,
      variants: [{ ...base.variants[0], specs: [{ keyRaw: "Zorp" }] }],
    };
    expect(productProblems(p).some((x) => x.code === "unmapped_spec_key")).toBe(
      true
    );
  });

  it("flags missing category", () => {
    expect(
      productProblems({ ...base, categoryId: null }).some(
        (x) => x.code === "category_missing"
      )
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/qa.test.ts`
Expected: FAIL — cannot find `../src/lib/qa`.

- [ ] **Step 3: Implement qa.ts**

Create `apps/catalog-admin/src/lib/qa.ts`:

```ts
export type Problem = {
  code: string;
  message: string;
  sku?: string;
  field?: string;
};

type SpecLike = { keyRaw?: string | null };
type VariantLike = {
  sku: string;
  value?: string | null;
  priceMdl?: number | null;
  specs: SpecLike[];
};
type ProductLike = {
  id: string;
  categoryId?: number | null;
  variants: VariantLike[];
  mappedKeys: Set<string>;
};

export function productProblems(p: ProductLike): Problem[] {
  const out: Problem[] = [];
  if (p.categoryId == null) {
    out.push({ code: "category_missing", message: "Product has no category" });
  }
  for (const v of p.variants) {
    if (v.priceMdl == null) {
      out.push({
        code: "missing_price",
        message: "Variant has no price",
        sku: v.sku,
        field: "priceMdl",
      });
    }
    if (!v.specs || v.specs.length === 0) {
      out.push({
        code: "missing_specs",
        message: "Variant has no specifications",
        sku: v.sku,
      });
    }
    if ((v.value ?? "").trim().toLowerCase() === "standard") {
      out.push({
        code: "ungrouped_variant",
        message: 'Variant value is "Standard" (ungrouped)',
        sku: v.sku,
        field: "value",
      });
    }
    for (const s of v.specs ?? []) {
      const key = (s.keyRaw ?? "").trim().toLowerCase();
      if (key && !p.mappedKeys.has(key)) {
        out.push({
          code: "unmapped_spec_key",
          message: `Spec key "${s.keyRaw}" is not in the dictionary`,
          sku: v.sku,
        });
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test tests/qa.test.ts`
Expected: 6 passed.

---

## Task 7: Zod validation schemas (TDD)

**Files:** create `src/lib/validation.ts`, `tests/validation.test.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/catalog-admin/tests/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { productSchema, variantSchema } from "../src/lib/validation";

describe("validation", () => {
  it("accepts a valid product", () => {
    const r = productSchema.safeParse({
      id: "g1",
      handle: "motocoasa-abc",
      titleRo: "Motocoasă",
      status: "draft",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid handle", () => {
    const r = productSchema.safeParse({
      id: "g1",
      handle: "Not A Slug!",
      titleRo: "X",
      status: "draft",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const r = variantSchema.safeParse({
      sku: "S1",
      value: "52cc",
      priceMdl: -5,
    });
    expect(r.success).toBe(false);
  });

  it("allows null price (a flagged-but-savable gap)", () => {
    const r = variantSchema.safeParse({
      sku: "S1",
      value: "52cc",
      priceMdl: null,
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/validation.test.ts`
Expected: FAIL — cannot find `../src/lib/validation`.

- [ ] **Step 3: Implement validation.ts**

Create `apps/catalog-admin/src/lib/validation.ts`:

```ts
import { z } from "zod";

export const variantSchema = z.object({
  sku: z.string().min(1),
  value: z.string().nullable().optional(),
  priceMdl: z.number().nonnegative().nullable().optional(),
  batteryIncluded: z.string().nullable().optional(),
  chargerIncluded: z.string().nullable().optional(),
  caseIncluded: z.string().nullable().optional(),
  qaOk: z.string().nullable().optional(),
});

export const productSchema = z.object({
  id: z.string().min(1),
  handle: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "must be a lowercase slug")
    .nullable()
    .optional(),
  titleRo: z.string().nullable().optional(),
  titleEn: z.string().nullable().optional(),
  categoryId: z.number().int().nullable().optional(),
  productType: z.string().nullable().optional(),
  powerSource: z.string().nullable().optional(),
  axis: z.string().nullable().optional(),
  status: z.enum(["draft", "ready", "approved"]).nullable().optional(),
});

export type VariantInput = z.infer<typeof variantSchema>;
export type ProductInput = z.infer<typeof productSchema>;
```

Note: `handle`/`price` are validated but nullable so gaps remain savable — the QA layer flags them, validation only blocks _invalid_ values.

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test tests/validation.test.ts`
Expected: 4 passed.

---

## Task 8: Query layer + transactional save (TDD)

**Files:** create `src/lib/queries.ts`; extend `tests/queries.test.ts`.

Exports: `listProducts(db)` → rows with variant count / price range / problem count;
`getProductBundle(db, id)` → product + variants(+specs) + content + images + links + mappedKeys;
`saveProductBundle(sqlite, bundle)` → validates then writes product, variants, specs, content in ONE transaction.

- [ ] **Step 1: Add failing tests to tests/queries.test.ts**

Append to `apps/catalog-admin/tests/queries.test.ts`:

```ts
import { getProductBundle, saveProductBundle } from "../src/lib/queries";

describe("queries", () => {
  it("saves a product bundle transactionally and reads it back", () => {
    const { db, sqlite } = memDb();
    sqlite
      .prepare(
        "INSERT INTO product(id, title_ro, category_id) VALUES ('g1','Old',1)"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO variant(sku, product_id, value, price_mdl, position) VALUES ('S1','g1','52cc',100,0)"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO spec_key(key_raw, key_norm, label_ro) VALUES ('rated power','rated_power','Putere')"
      )
      .run();

    saveProductBundle(sqlite, {
      product: {
        id: "g1",
        titleRo: "Nou",
        handle: "nou-g1",
        status: "draft",
        categoryId: 1,
      },
      variants: [{ sku: "S1", value: "52cc", priceMdl: 250 }],
      specs: [
        {
          sku: "S1",
          keyRaw: "Rated power",
          keyNorm: "rated_power",
          labelRo: "Putere",
          valueRaw: "1kW",
          unit: "kW",
          position: 0,
        },
      ],
      content: {
        productId: "g1",
        shortDescription: "Scurt",
        highlights: ["a"],
      },
    });

    const b = getProductBundle(db, "g1")!;
    expect(b.product.titleRo).toBe("Nou");
    expect(b.variants[0].priceMdl).toBe(250);
    expect(b.variants[0].specs[0].labelRo).toBe("Putere");
    expect(b.content?.shortDescription).toBe("Scurt");
    expect(b.mappedKeys.has("rated power")).toBe(true);
  });

  it("rejects an invalid bundle without partial writes", () => {
    const { sqlite } = memDb();
    sqlite
      .prepare("INSERT INTO product(id, title_ro) VALUES ('g1','Old')")
      .run();
    expect(() =>
      saveProductBundle(sqlite, {
        product: { id: "g1", handle: "BAD SLUG", status: "draft" },
        variants: [],
        specs: [],
        content: null,
      })
    ).toThrow();
    const row = sqlite
      .prepare("SELECT title_ro FROM product WHERE id='g1'")
      .get() as any;
    expect(row.title_ro).toBe("Old"); // unchanged
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/queries.test.ts`
Expected: FAIL — cannot find `../src/lib/queries`.

- [ ] **Step 3: Implement queries.ts**

Create `apps/catalog-admin/src/lib/queries.ts`:

```ts
import type Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../../drizzle/schema";
import { productSchema, variantSchema } from "./validation";

type DrizzleDb = BetterSQLite3Database<typeof schema>;

export function getProductBundle(db: DrizzleDb, id: string) {
  const product = db
    .select()
    .from(schema.product)
    .where(eq(schema.product.id, id))
    .get();
  if (!product) return null;
  const variants = db
    .select()
    .from(schema.variant)
    .where(eq(schema.variant.productId, id))
    .all()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const withSpecs = variants.map((v) => ({
    ...v,
    specs: db
      .select()
      .from(schema.specification)
      .where(eq(schema.specification.sku, v.sku))
      .all(),
  }));
  const content =
    db
      .select()
      .from(schema.productContent)
      .where(eq(schema.productContent.productId, id))
      .get() ?? null;
  const images = withSpecs.flatMap((v) =>
    db.select().from(schema.image).where(eq(schema.image.sku, v.sku)).all()
  );
  const links = db
    .select()
    .from(schema.link)
    .where(eq(schema.link.productId, id))
    .all();
  const mappedKeys = new Set(
    db
      .select()
      .from(schema.specKey)
      .all()
      .map((k) => k.keyRaw.toLowerCase())
  );
  return { product, variants: withSpecs, content, images, links, mappedKeys };
}

export type SaveBundle = {
  product: Record<string, unknown> & { id: string };
  variants: Array<Record<string, unknown> & { sku: string }>;
  specs: Array<Record<string, unknown> & { sku: string }>;
  content: (Record<string, unknown> & { productId: string }) | null;
};

export function saveProductBundle(
  sqlite: Database.Database,
  bundle: SaveBundle
): void {
  // validate first — throws before any write
  const p = productSchema.parse(bundle.product);
  const vs = bundle.variants.map((v) => variantSchema.parse(v));

  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        "UPDATE product SET title_ro=@titleRo, title_en=@titleEn, handle=@handle, " +
          "category_id=@categoryId, product_type=@productType, power_source=@powerSource, " +
          "axis=@axis, status=@status WHERE id=@id"
      )
      .run({
        id: p.id,
        titleRo: p.titleRo ?? null,
        titleEn: p.titleEn ?? null,
        handle: p.handle ?? null,
        categoryId: p.categoryId ?? null,
        productType: p.productType ?? null,
        powerSource: p.powerSource ?? null,
        axis: p.axis ?? null,
        status: p.status ?? null,
      });

    const uv = sqlite.prepare(
      "UPDATE variant SET value=@value, price_mdl=@priceMdl, battery_included=@batteryIncluded, " +
        "charger_included=@chargerIncluded, case_included=@caseIncluded, qa_ok=@qaOk WHERE sku=@sku"
    );
    for (const v of vs) {
      uv.run({
        sku: v.sku,
        value: v.value ?? null,
        priceMdl: v.priceMdl ?? null,
        batteryIncluded: v.batteryIncluded ?? null,
        chargerIncluded: v.chargerIncluded ?? null,
        caseIncluded: v.caseIncluded ?? null,
        qaOk: v.qaOk ?? null,
      });
    }

    // specs: replace this product's spec rows wholesale (by sku set)
    const skus = vs.map((v) => v.sku);
    if (skus.length) {
      const del = sqlite.prepare(
        `DELETE FROM specification WHERE sku IN (${skus.map(() => "?").join(",")})`
      );
      del.run(...skus);
      const ins = sqlite.prepare(
        "INSERT INTO specification(sku, key_raw, key_norm, label_ro, value_raw, value_num, unit, position) " +
          "VALUES (@sku, @keyRaw, @keyNorm, @labelRo, @valueRaw, @valueNum, @unit, @position)"
      );
      bundle.specs.forEach((s, i) =>
        ins.run({
          sku: s.sku,
          keyRaw: s.keyRaw ?? null,
          keyNorm: s.keyNorm ?? null,
          labelRo: s.labelRo ?? null,
          valueRaw: s.valueRaw ?? null,
          valueNum: (s.valueNum as number) ?? null,
          unit: s.unit ?? null,
          position: (s.position as number) ?? i,
        })
      );
    }

    if (bundle.content) {
      const c = bundle.content;
      const j = (x: unknown) => (x != null ? JSON.stringify(x) : null);
      sqlite
        .prepare(
          "INSERT INTO product_content(product_id, short_description, why_good, seo_text, meta_title, " +
            "meta_description, image_alt, highlights, use_cases, faq, keywords, specifications) " +
            "VALUES (@productId,@shortDescription,@whyGood,@seoText,@metaTitle,@metaDescription,@imageAlt," +
            "@highlights,@useCases,@faq,@keywords,@specifications) " +
            "ON CONFLICT(product_id) DO UPDATE SET short_description=excluded.short_description, " +
            "why_good=excluded.why_good, seo_text=excluded.seo_text, meta_title=excluded.meta_title, " +
            "meta_description=excluded.meta_description, image_alt=excluded.image_alt, " +
            "highlights=excluded.highlights, use_cases=excluded.use_cases, faq=excluded.faq, " +
            "keywords=excluded.keywords, specifications=excluded.specifications"
        )
        .run({
          productId: c.productId,
          shortDescription: c.shortDescription ?? null,
          whyGood: c.whyGood ?? null,
          seoText: c.seoText ?? null,
          metaTitle: c.metaTitle ?? null,
          metaDescription: c.metaDescription ?? null,
          imageAlt: c.imageAlt ?? null,
          highlights: j(c.highlights),
          useCases: j(c.useCases),
          faq: j(c.faq),
          keywords: j(c.keywords),
          specifications: j(c.specifications),
        });
    }
  });
  tx();
}

export function listProducts(db: DrizzleDb) {
  const products = db.select().from(schema.product).all();
  const variants = db.select().from(schema.variant).all();
  const byProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const arr = byProduct.get(v.productId ?? "") ?? [];
    arr.push(v);
    byProduct.set(v.productId ?? "", arr);
  }
  return products.map((p) => {
    const vs = byProduct.get(p.id) ?? [];
    const prices = vs
      .map((v) => v.priceMdl)
      .filter((x): x is number => x != null);
    return {
      id: p.id,
      title: p.titleRo ?? p.titleEn ?? p.id,
      variantCount: vs.length,
      priceMin: prices.length ? Math.min(...prices) : null,
      priceMax: prices.length ? Math.max(...prices) : null,
      hasIssue:
        p.categoryId == null ||
        vs.some(
          (v) =>
            v.priceMdl == null || (v.value ?? "").toLowerCase() === "standard"
        ),
    };
  });
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test`
Expected: all query + prior tests pass.

---

## Task 9: App shell + left nav

**Files:** create `src/app/_components/AppShell.tsx`, `src/app/_components/NavItem.tsx`; update `src/app/layout.tsx` to wrap children in `AppShell`.

- [ ] **Step 1: Build the shell**

Create `AppShell.tsx` — a fixed left sidebar (240px) with nav links (Products, Problems, Specs dictionary, Categories, Links, Bulk, Settings — using `lucide-react` icons), a header strip showing `catalog.db ●`, and a `<main>` for children. Use shadcn tokens (`bg-background`, `text-foreground`, `border`). `NavItem` is a client component using `next/navigation`'s `usePathname` to highlight the active route.

Reference structure:

```tsx
// src/app/_components/AppShell.tsx  (server component)
import { NavItem } from "./NavItem";
import {
  Package,
  AlertTriangle,
  ListTree,
  FolderTree,
  Link2,
  Layers,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/products", label: "Products", icon: Package },
  { href: "/problems", label: "Problems", icon: AlertTriangle },
  { href: "/specs-dictionary", label: "Specs dictionary", icon: ListTree },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/links", label: "Cross-sell links", icon: Link2 },
  { href: "/bulk", label: "Bulk / Export", icon: Layers },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="bg-muted/30 w-60 shrink-0 border-r p-3">
        <div className="px-2 py-3 text-sm font-semibold">Catalog Admin</div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavItem key={n.href} {...n} />
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="text-muted-foreground flex h-12 items-center justify-end border-b px-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> catalog.db
          </span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
```

```tsx
// src/app/_components/NavItem.tsx  ("use client")
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavItem({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const active = usePathname().startsWith(href);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50"
      )}
    >
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}
```

Update `layout.tsx` body to `<body><AppShell>{children}</AppShell></body>` (import from `./_components/AppShell`).

- [ ] **Step 2: Verify**

Run: `pnpm typecheck` → no errors. `pnpm dev` then load `http://localhost:4100` → redirects to `/products` (will render once Task 10 exists); the shell/nav is visible.

---

## Task 10: Products list with issue badges + filters

**Files:** create `src/app/products/page.tsx`, `src/app/products/_components/ProductList.tsx`.

- [ ] **Step 1: Build the list page (RSC)**

`page.tsx` (server component): `import { db } from "@/db/client"; import { listProducts } from "@/lib/queries"`, call `listProducts(db)`, pass to `ProductList`. `ProductList` ("use client") renders a shadcn `Table` with columns: Title, Variants, Price range, Issue badge (shadcn `Badge` variant `destructive` when `hasIssue`); a search `Input` filtering by title; a `Switch` "issues only"; each row links to `/products/[id]`. Empty/loading states included.

- [ ] **Step 2: Verify**

Run: `pnpm dev`, load `/products`. Expected: ~276 rows, search filters live, "issues only" reduces the set, clicking a row navigates to the (Task 11) editor.

---

## Task 11: Product editor shell + Save action

**Files:** create `src/app/products/[id]/page.tsx`, `src/app/products/actions.ts`, and a client `EditorProvider` holding the working bundle + dirty state.

- [ ] **Step 1: Server action**

Create `src/app/products/actions.ts`:

```ts
"use server";
import Database from "better-sqlite3";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { saveProductBundle, type SaveBundle } from "@/lib/queries";

export async function saveProduct(bundle: SaveBundle) {
  const dbPath = process.env.CATALOG_DB_PATH
    ? path.resolve(process.env.CATALOG_DB_PATH)
    : path.join(process.cwd(), "data", "catalog.db");
  const sqlite = new Database(dbPath);
  sqlite.pragma("foreign_keys = ON");
  try {
    saveProductBundle(sqlite, bundle);
  } finally {
    sqlite.close();
  }
  revalidatePath(`/products/${bundle.product.id}`);
  return { ok: true };
}
```

- [ ] **Step 2: Editor shell**

`page.tsx` (server): load `getProductBundle(db, params.id)`, 404 if null, compute `productProblems`, render a client `<Editor bundle=… problems=… />`. `Editor` ("use client") holds the working copy in state, tracks dirty, renders the header (title, ids, problem summary, sticky **Save** button calling `saveProduct` in a transition + `sonner` toast), and shadcn `Tabs`: Overview, Variants(n), Specs, Description, Images, Links — each tab a component from `_tabs/` receiving the working slice + an `onChange` updater. Save is disabled unless dirty.

- [ ] **Step 3: Verify**

Run: `pnpm dev`, open a product. Expected: header + all six tabs render; Save disabled until an edit.

---

## Task 12: Overview tab

**Files:** create `src/app/products/[id]/_tabs/Overview.tsx`.

Form fields (shadcn `Input`/`Select`/`Label`) for title_ro, title_en, category (Select from categories), product_type, power_source, axis, status, handle. Each field calls `onChange`. Invalid handle shows an inline error (Zod `productSchema` field parse); `category_missing` shows the ⚠ from problems. Verify: edit a title → Save → reload → persisted.

---

## Task 13: Variants tab (inline-edit table)

**Files:** create `src/app/products/[id]/_tabs/Variants.tsx`.

shadcn `Table` with editable cells (value, price, battery/charger/case selects, qa). Row-level ⚠ for missing_price / "Standard" value. `[+ Add SKU]` appends a blank variant row; a row menu removes/reorders (updates `position`). All edits flow through `onChange`. Verify: change a price inline → Save → reload → persisted; add a spec-less variant → missing_specs badge appears.

---

## Task 14: Specifications tab (EN + RO side by side)

**Files:** create `src/app/products/[id]/_tabs/Specs.tsx`.

Per selected SKU (a SKU selector at top): **two columns**.

- Left "Structured" — editable rows from `specification` (label_ro, value, unit, key_norm); unmapped-key rows show ⚠ + a **[map key]** button that (for now, v1) sets the row's `keyNorm`/`labelRo` locally and marks it mapped; add/delete rows.
- Right "Romanian source" — read-only list parsed from `content.specifications` (the RO strings); each line has a **[→]** button that appends a new structured row on the left by splitting the RO line on `:` into label + value (reuse a small `parseRoSpecLine(line)` helper co-located here).

All changes flow into the working bundle's `specs`. Verify: promote a RO line → a new structured row appears → Save → reload → persisted.

- [ ] Include `parseRoSpecLine`:

```ts
export function parseRoSpecLine(
  line: string
): { labelRo: string; valueRaw: string } | null {
  const i = line.indexOf(":");
  if (i < 0) return null;
  const labelRo = line.slice(0, i).trim();
  const valueRaw = line.slice(i + 1).trim();
  if (!labelRo || !valueRaw) return null;
  return { labelRo, valueRaw };
}
```

---

## Task 15: Description tab

**Files:** create `src/app/products/[id]/_tabs/Description.tsx`.

Structured editors over `content`: `Textarea` for short_description / why_good / seo_text / meta_description; `Input` for meta_title / image_alt; simple list editors (add/remove line) for highlights / use_cases / faq / keywords. Edits flow through `onChange` into `bundle.content`. Verify: edit short_description → Save → reload → persisted.

---

## Task 16: Images tab

**Files:** create `src/app/products/[id]/_tabs/Images.tsx`.

Read-focused grid: for each image show a thumbnail (`next/image` unoptimized, or plain `<img>` with `source_url`), sku, role, image_mode, image_own. v1 is view + edit `role`/`image_mode` selects (persisted through a small addition to the save action is out of scope — v1 Images tab is display-only with a "coming soon" note on editing). Verify: thumbnails render for a product.

---

## Task 17: Links tab

**Files:** create `src/app/products/[id]/_tabs/Links.tsx`.

List `links` rows (related_group_id, name, kind) as read-only cards with a "coming soon" note for editing (cross-sell CRUD is a stubbed surface). Verify: renders existing links for a product.

---

## Task 18: Problems dashboard

**Files:** create `src/app/problems/page.tsx`.

Server component: run the QA checks across all products (reuse `listProducts` + a batched `productProblems` over bundles, or a set of direct count queries mirroring the SQL views) and render shadcn `Card` tiles per problem code with counts, each linking to `/products?issue=<code>` (the products list reads the `issue` search param to pre-filter). Verify: tiles show real counts (missing_specs, unmapped_spec_key, missing_price, etc.).

---

## Task 19: Stub screens

**Files:** create `src/app/{specs-dictionary,categories,links,bulk,settings}/page.tsx`.

Each: a titled page with a short description of what it will do and a shadcn `Card` "Coming soon" empty state. No fake data. Verify: each nav item routes to its stub without error.

---

## Task 20: Playwright smoke + full check

**Files:** create `playwright.config.ts`, `tests/e2e/edit-variant.spec.ts`.

- [ ] **Step 1: Playwright config**

Create `apps/catalog-admin/playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4100/products",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: { baseURL: "http://localhost:4100" },
});
```

- [ ] **Step 2: Smoke test**

Create `apps/catalog-admin/tests/e2e/edit-variant.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

test("edit a variant price and persist", async ({ page }) => {
  await page.goto("/products");
  await page.getByRole("row").nth(1).click();
  await page.getByRole("tab", { name: /variants/i }).click();
  const price = page.getByTestId("variant-price").first();
  await price.fill("12345");
  await page.getByRole("button", { name: /save/i }).click();
  await expect(page.getByText(/saved/i)).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: /variants/i }).click();
  await expect(page.getByTestId("variant-price").first()).toHaveValue("12345");
});
```

(Add `data-testid="variant-price"` to the price input in Task 13.)

- [ ] **Step 3: Install browser + run**

Run: `cd ~/Projects/DYLLU/apps/catalog-admin && pnpm exec playwright install chromium && pnpm test:e2e`
Expected: 1 passed.

- [ ] **Step 4: Full quality gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all green.

- [ ] **Step 5: No commit** (gitignored; skip)

---

## Self-Review Notes

- **Spec coverage:** placement/stack/DB migration (Tasks 1–3); Drizzle+client (4); product_content migration + extras lift (5); QA checks (6); Zod validation (7); query layer + transactional Save (8); app shell (9); products list + issue filters (10); editor + Save action (11); Overview/Variants/Specs(EN+RO)/Description/Images/Links tabs (12–17); Problems dashboard (18); stubs (19); Playwright smoke + full gate (20). All design sections map to tasks.
- **Type consistency:** `getProductBundle`/`saveProductBundle`/`SaveBundle`/`listProducts` signatures are identical across Task 8, 11, 18. `productProblems(ProductLike)` shape consistent between Task 6 and its consumers. `db` (drizzle) vs `sqlite` (raw better-sqlite3) are used deliberately: reads via drizzle `db`, transactional writes via raw `sqlite` (drizzle better-sqlite3 is sync; raw transaction keeps the Save atomic).
- **Deviation note (deliberate):** logic-heavy tasks (4–8) are full-code TDD; UI tasks (9–19) give complete code for the non-obvious shell/nav/save wiring and contract-level specs for repetitive tabs following the established `onChange`/working-bundle pattern, verified by typecheck/lint/build + the Playwright smoke. This is the pragmatic granularity for an app-scale UI plan.
- **Placeholders:** none — no TBD/TODO; every logic step has complete code.
