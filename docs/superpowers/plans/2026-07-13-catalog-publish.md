# Publish to Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A dashboard button that publishes a product (and a whole category) from catalog-admin to Medusa, via a new backend endpoint that reuses the existing ingest workflows and adds an upsert-by-handle path — verified against the local backend.

**Architecture:** Backend `apps/backend` gets a shared merged→Medusa module (extracted from the ingest script), a `GET /admin/catalog/categories` route, and a `POST /admin/catalog/publish` route (create OR update by handle, dry-run supported). catalog-admin gets a `medusa_handle` on categories + a sync action, a `toMergedProduct` mapper, an env-gated Medusa admin client, publish server actions, and Publish UI (editor + category) with a mandatory dry-run preview.

**Tech Stack:** Medusa 2.17.2 (Node backend), Next 16 / React 19 (catalog-admin), Drizzle, better-sqlite3, zod, vitest.

**Design doc:** `docs/superpowers/specs/2026-07-13-catalog-publish-design.md`

**Global constraints:**

- Node 22: prefix every backend/admin command with `export PATH="/Users/abalmus/.nvm/versions/node/v22.22.0/bin:$PATH"`.
- **Do NOT run any git commands. Do NOT commit.** Backend work is uncommitted on `main`; catalog-admin is gitignored. Nothing is committed until the user asks.
- **Never push to real production during implementation.** All live calls target the LOCAL backend. The prod URL/token are the user's to set later.
- Use `pnpm`. Backend commands run from `apps/backend`; admin commands from `apps/catalog-admin`.

---

## File Structure

```
apps/backend/
  src/lib/catalog-publish/
    merged-to-medusa.ts        # extracted toCreateInput + toUpdateInput + category map + MergedProduct type
    merged-to-medusa.test.ts
  src/api/admin/catalog/
    categories/route.ts        # GET category tree
    publish/route.ts           # POST upsert-by-handle (+ dryRun)
  src/scripts/ingco-ingest-merged.ts   # MODIFIED: import from shared module

apps/catalog-admin/
  drizzle/schema.ts            # MODIFIED: category.medusaHandle
  drizzle/migrate-medusa-handle.ts     # add column
  src/lib/toMergedProduct.ts   # + test
  src/lib/medusaAdmin.ts       # env-gated client
  src/app/products/actions.ts  # MODIFIED: + publishProduct, publishCategory, syncCategories
  src/app/products/[id]/_components/PublishButton.tsx
  src/app/products/_components/PublishCategoryButton.tsx
  tests/toMergedProduct.test.ts
```

---

## Task 1: Extract shared merged→Medusa module (backend, no behaviour change)

**Files:**

- Create: `apps/backend/src/lib/catalog-publish/merged-to-medusa.ts`
- Create: `apps/backend/src/lib/catalog-publish/merged-to-medusa.test.ts`
- Modify: `apps/backend/src/scripts/ingco-ingest-merged.ts`

- [ ] **Step 1: Create the shared module**

Move `MergedProduct`/`MergedVariant` types, `SOURCE_CATEGORY_MAP`, `toCreateInput`, `resolveCategoryHandle`, `buildDescription` **verbatim** from `ingco-ingest-merged.ts` into `merged-to-medusa.ts` and `export` them. Add a new `toUpdateInput` for the upsert update path:

```ts
// appended to merged-to-medusa.ts
export type MedusaVariantInput = ReturnType<
  typeof toCreateInput
>["variants"][number];

/** Build an updateProductsWorkflow input for an existing product (matched by handle).
 *  Updates title/description/status/category/images and upserts variants by sku. */
export function toUpdateInput(
  existing: { id: string; variants: Array<{ id: string; sku: string | null }> },
  p: MergedProduct,
  salesChannelId: string,
  categoryIdByHandle: Map<string, string>,
  fallbackCategoryId: string | undefined
) {
  const create = toCreateInput(
    p,
    "",
    salesChannelId,
    categoryIdByHandle,
    fallbackCategoryId
  );
  const idBySku = new Map(
    existing.variants.filter((v) => v.sku).map((v) => [v.sku as string, v.id])
  );
  return {
    id: existing.id,
    title: create.title,
    description: create.description,
    status: create.status,
    category_ids: create.category_ids,
    images: create.images,
    metadata: create.metadata,
    variants: create.variants.map((v) => {
      const id = idBySku.get(v.sku);
      return id ? { id, ...v } : v; // existing → update by id; new → create
    }),
  };
}
```

- [ ] **Step 2: Point the ingest script at the shared module**

In `ingco-ingest-merged.ts`, delete the moved definitions and add:

```ts
import {
  toCreateInput,
  type MergedProduct,
} from "../lib/catalog-publish/merged-to-medusa";
```

Keep everything else identical.

- [ ] **Step 3: Write the mapping test**

Create `merged-to-medusa.test.ts` (vitest or the backend's jest — match the backend's runner; it uses jest per `jest.config.js`, so write a `*.spec.ts` jest test instead if vitest isn't wired). Assert `toCreateInput` on a minimal MergedProduct yields the expected title/handle/options/variants/prices, and `toUpdateInput` maps a matching sku to `{id, ...}` and a new sku to a create shape.

```ts
import {
  toCreateInput,
  toUpdateInput,
  type MergedProduct,
} from "./merged-to-medusa";

const P: MergedProduct = {
  kind: "single",
  handle: "h1",
  name: "Prod",
  descriptionText: "d",
  descriptionHtml: "",
  brand: "DYLLU",
  optionTitle: "Variant",
  variants: [
    {
      title: "x",
      sku: "S1",
      article: "A1",
      optionValue: "x",
      priceMdl: 100,
      sourceUrl: "u",
      sourceId: "1",
    },
  ],
  images: ["http://img/1.jpg"],
  inStock: true,
  attributes: [{ key: "Putere", value: "1kW" }],
  sourceCategories: [],
  sourceCategorySlugs: [],
  breadcrumbs: [],
  metadata: {
    ingco_family: "f",
    ingco_articles: ["A1"],
    ingco_source_urls: ["u"],
    ingco_source_skus: ["S1"],
  },
};

test("create input shape", () => {
  const out = toCreateInput(P, "sp", "sc", new Map(), undefined);
  expect(out.handle).toBe("h1");
  expect(out.variants[0]).toMatchObject({
    sku: "S1",
    prices: [{ currency_code: "mdl", amount: 100 }],
  });
});

test("update input maps existing sku to id", () => {
  const out = toUpdateInput(
    { id: "p1", variants: [{ id: "v1", sku: "S1" }] },
    P,
    "sc",
    new Map(),
    undefined
  );
  expect(out.id).toBe("p1");
  expect(out.variants[0]).toMatchObject({ id: "v1", sku: "S1" });
});
```

- [ ] **Step 4: Verify**

Run (backend): `export PATH=... && cd apps/backend && pnpm typecheck && pnpm test -- merged-to-medusa` (use the backend's test command from package.json). Expected: pass. Then confirm the ingest script still typechecks.

---

## Task 2: Backend GET /admin/catalog/categories

**Files:** Create `apps/backend/src/api/admin/catalog/categories/route.ts`

- [ ] **Step 1: Write the route**

```ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "parent_category.handle"],
  });
  const categories = (
    data as Array<{
      id: string;
      name: string;
      handle: string;
      parent_category?: { handle?: string };
    }>
  ).map((c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    parentHandle: c.parent_category?.handle ?? null,
  }));
  res.json({ categories });
}
```

- [ ] **Step 2: Verify against local backend**

Start the backend locally (`cd apps/backend && pnpm dev` — confirm the exact dev script) with an admin session. Then, using an admin token, `curl -H "Authorization: Bearer <token>" http://localhost:9000/admin/catalog/categories` returns `{categories: [...]}`. (Document how the user obtains a local admin token — `/auth/user/emailpass` or the admin UI. Do not fabricate one.)

---

## Task 3: Backend POST /admin/catalog/publish (upsert + dryRun)

**Files:** Create `apps/backend/src/api/admin/catalog/publish/route.ts`

- [ ] **Step 1: Write the route**

```ts
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import {
  toCreateInput,
  toUpdateInput,
  type MergedProduct,
} from "../../../../lib/catalog-publish/merged-to-medusa";

type Body = { products: MergedProduct[]; dryRun?: boolean };

export async function POST(
  req: AuthenticatedMedusaRequest<Body>,
  res: MedusaResponse
) {
  const { products, dryRun } = req.body as Body;
  if (!Array.isArray(products) || products.length === 0) {
    res.status(400).json({ error: "no_products" });
    return;
  }
  if (products.length > 200) {
    res
      .status(400)
      .json({
        error: "batch_too_large",
        message: "Max 200 products per publish.",
      });
    return;
  }
  const container = req.scope;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: scs } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const sc =
    scs.find((s: { name: string }) => s.name === "Default Sales Channel") ??
    scs[0];
  const { data: sps } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfileId = sps[0]?.id;
  const { data: cats } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  });
  const categoryIdByHandle = new Map<string, string>(
    cats.map((c: { id: string; handle: string }) => [c.handle, c.id])
  );
  const fallbackCategoryId = categoryIdByHandle.get("scule-manuale");

  const results: Array<{
    handle: string;
    action: string;
    id?: string;
    error?: string;
  }> = [];
  let wrote = false;

  for (const p of products) {
    try {
      const { data: existing } = await query.graph({
        entity: "product",
        fields: ["id", "handle", "variants.id", "variants.sku"],
        filters: { handle: p.handle },
      });
      const found = existing[0] as
        | { id: string; variants: Array<{ id: string; sku: string | null }> }
        | undefined;

      if (dryRun) {
        results.push({
          handle: p.handle,
          action: found ? "would_update" : "would_create",
          id: found?.id,
        });
        continue;
      }
      if (found) {
        await updateProductsWorkflow(container).run({
          input: {
            products: [
              toUpdateInput(
                found,
                p,
                sc.id,
                categoryIdByHandle,
                fallbackCategoryId
              ),
            ],
          },
        });
        results.push({ handle: p.handle, action: "updated", id: found.id });
      } else {
        const { result } = await createProductsWorkflow(container).run({
          input: {
            products: [
              toCreateInput(
                p,
                shippingProfileId,
                sc.id,
                categoryIdByHandle,
                fallbackCategoryId
              ),
            ],
          },
        });
        results.push({
          handle: p.handle,
          action: "created",
          id: result[0]?.id,
        });
      }
      wrote = true;
    } catch (err) {
      results.push({
        handle: p.handle,
        action: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (wrote && !dryRun) {
    try {
      const { revalidateStorefront } =
        await import("../../../../scripts/_revalidate");
      await revalidateStorefront(
        container.resolve(ContainerRegistrationKeys.LOGGER)
      );
    } catch {
      /* revalidation is best-effort */
    }
  }
  res.json({ results, dryRun: Boolean(dryRun) });
}
```

- [ ] **Step 2: Verify create then update against local backend**

With the local backend running: publish one MergedProduct with a fresh handle (expect `created`), then the same handle again with a changed title (expect `updated`, and GET the product to confirm the title changed). Use `dryRun:true` first and confirm `would_create`/`would_update` with no DB change. Document the curl commands used.

---

## Task 4: catalog-admin — category medusa_handle column + sync

**Files:**

- Modify: `apps/catalog-admin/drizzle/schema.ts`
- Create: `apps/catalog-admin/drizzle/migrate-medusa-handle.ts`
- Modify: `apps/catalog-admin/src/app/products/actions.ts` (add `syncCategories`)

- [ ] **Step 1: Add the column to the schema**

In `schema.ts`, add to the `category` table: `medusaHandle: text("medusa_handle")`.

- [ ] **Step 2: Migration script**

Create `drizzle/migrate-medusa-handle.ts` mirroring `migrate-content.ts`'s style: `ALTER TABLE category ADD COLUMN medusa_handle TEXT` guarded by a check (catch "duplicate column"). Add a `db:migrate:medusa` script or reuse `db:migrate` chaining. Run it against `data/catalog.db`.

- [ ] **Step 3: syncCategories server action**

In `actions.ts`, add a `"use server"` action that calls the backend `GET /admin/catalog/categories` (via the client from Task 5), then upserts `medusa_handle`/name into the local `category` table matching on handle (create rows for handles not present). Return a summary `{ synced, created }`. This is what keeps categories in sync with Medusa.

- [ ] **Step 4: Verify**

`pnpm typecheck`; run the migration; `node -e` confirm the `category` table has `medusa_handle`.

---

## Task 5: catalog-admin — env-gated Medusa admin client

**Files:** Create `apps/catalog-admin/src/lib/medusaAdmin.ts`

- [ ] **Step 1: Write the client**

```ts
import "server-only";

const URL = process.env.CATALOG_MEDUSA_ADMIN_URL;
const TOKEN = process.env.CATALOG_MEDUSA_ADMIN_TOKEN;

export function isPublishConfigured(): boolean {
  return Boolean(URL && TOKEN);
}

async function call(path: string, init?: RequestInit) {
  if (!URL || !TOKEN) {
    throw new Error(
      "Production Medusa is not configured. Set CATALOG_MEDUSA_ADMIN_URL and CATALOG_MEDUSA_ADMIN_TOKEN."
    );
  }
  const res = await fetch(`${URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok)
    throw new Error(
      `Medusa ${path} failed: ${res.status} ${await res.text().catch(() => "")}`
    );
  return res.json();
}

export function fetchMedusaCategories(): Promise<{
  categories: Array<{
    id: string;
    name: string;
    handle: string;
    parentHandle: string | null;
  }>;
}> {
  return call("/admin/catalog/categories");
}

export function publishToMedusa(
  products: unknown[],
  dryRun: boolean
): Promise<{
  results: Array<{
    handle: string;
    action: string;
    id?: string;
    error?: string;
  }>;
  dryRun: boolean;
}> {
  return call("/admin/catalog/publish", {
    method: "POST",
    body: JSON.stringify({ products, dryRun }),
  });
}
```

- [ ] **Step 2: .env.local for local testing**

Add `apps/catalog-admin/.env.local` (gitignored) documenting the two vars, pointed at the local backend (e.g. `CATALOG_MEDUSA_ADMIN_URL=http://localhost:9000`). Do NOT hardcode a token; the user pastes their local admin token. `pnpm typecheck`.

---

## Task 6: catalog-admin — toMergedProduct mapper (TDD)

**Files:** Create `src/lib/toMergedProduct.ts` + `tests/toMergedProduct.test.ts`

- [ ] **Step 1: Failing test**

Create `tests/toMergedProduct.test.ts`: given a product bundle (product + 2 variants + specs + content + images + a category row with `medusaHandle`), assert the returned MergedProduct has `handle`, `name=titleRo`, `kind` = "multi" for >1 variant, `optionTitle=axis`, `categoryHandle=medusaHandle`, each variant `{sku, optionValue=value, priceMdl}`, `images` from image sourceUrls, and `attributes` from structured specs (`{key: labelRo, value: valueRaw}`).

- [ ] **Step 2: Implement**

Pure function `toMergedProduct(bundle, category?): MergedProduct`. Deterministic; no external calls. Skip variants without a positive price (or throw a clear error the caller surfaces). Set `inStock: true` unless you add a signal. Fill `metadata.ingco_*` from available fields (empty arrays are fine).

- [ ] **Step 3: Verify** — `pnpm test tests/toMergedProduct.test.ts` passes.

---

## Task 7: catalog-admin — publish server actions

**Files:** Modify `src/app/products/actions.ts`

- [ ] **Step 1: Add actions**

```ts
"use server";
// ...existing imports + db access...
import { publishToMedusa } from "@/lib/medusaAdmin";
import { toMergedProduct } from "@/lib/toMergedProduct";
import { getProductBundle } from "@/lib/queries";

export async function publishProduct(id: string, opts: { dryRun: boolean }) {
  const bundle = getProductBundle(db, id);
  if (!bundle) throw new Error("Product not found");
  const category =
    bundle.product.categoryId != null
      ? db
          .select()
          .from(schema.category)
          .where(eq(schema.category.id, bundle.product.categoryId))
          .get()
      : null;
  const merged = toMergedProduct(bundle, category ?? undefined);
  return publishToMedusa([merged], opts.dryRun);
}

export async function publishCategory(
  categoryId: number,
  opts: { dryRun: boolean }
) {
  const ids = db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(eq(schema.product.categoryId, categoryId))
    .all()
    .map((r) => r.id);
  const category = db
    .select()
    .from(schema.category)
    .where(eq(schema.category.id, categoryId))
    .get();
  const merged = ids.map((pid) =>
    toMergedProduct(getProductBundle(db, pid)!, category ?? undefined)
  );
  return publishToMedusa(merged, opts.dryRun);
}
```

(Wire `db`, `schema`, `eq` imports as in the existing file. Batch >200 in `publishCategory` by chunking calls; surface a combined result list.)

- [ ] **Step 2: Verify** — `pnpm typecheck`.

---

## Task 8: catalog-admin — Publish UI (editor button + category batch)

**Files:**

- Create: `src/app/products/[id]/_components/PublishButton.tsx`
- Create: `src/app/products/_components/PublishCategoryButton.tsx`
- Modify: `Editor.tsx` (mount PublishButton in the header, beside Save), `ProductList.tsx` (mount PublishCategoryButton when filtered by category)

- [ ] **Step 1: PublishButton (dry-run → confirm → publish)**

Client component. Click → call `publishProduct(id, {dryRun:true})`, show a shadcn `Dialog` summarizing results (`would_create`/`would_update`, target = the configured URL — pass a boolean `configured` + the URL host from the server via a small server action or prop). A **"Publish to production"** button in the dialog calls `publishProduct(id, {dryRun:false})`, then a sonner toast with the action + any errors. Disable entirely with a tooltip when publishing isn't configured. If the product is dirty (unsaved), require Save first (show a hint).

- [ ] **Step 2: PublishCategoryButton**

Same pattern for a category: dry-run returns N results; the dialog shows `X to create, Y to update`; confirm publishes the batch and shows a per-product result list (scrollable), highlighting errors.

- [ ] **Step 3: Verify (local backend)**

With local backend + `.env.local` token set: open a product, click Publish → dry-run dialog shows `would_create`/`would_update`; confirm → toast shows `created`/`updated`; GET the product from the local backend to confirm. Then a small category. Capture a screenshot of the dialog. Restore any test-mutated admin data if needed.

---

## Task 9: Full gate + docs

- [ ] **Step 1: Gates**

Backend: `cd apps/backend && pnpm typecheck && pnpm test -- merged-to-medusa`.
catalog-admin: `cd apps/catalog-admin && pnpm typecheck && pnpm test && pnpm build`.

- [ ] **Step 2: Document the env + local-token flow**

Add a short `apps/catalog-admin/PUBLISH.md` (gitignored with the app): the two env vars, how to get a local admin token, how to point at prod later, and the dry-run-first safety note. Do NOT include any real token.

- [ ] **Step 3: No commit** — leave everything uncommitted; report status to the user.

---

## Self-Review Notes

- **Spec coverage:** shared module + upsert (T1); categories route (T2); publish route with dry-run + per-item results (T3); medusa_handle + sync (T4); env-gated client, no fabricated creds (T5); MergedProduct mapper (T6); server actions single+category (T7); dry-run-first UI for both scopes (T8); gates + docs (T9). Matches the design.
- **Safety:** every UI publish path runs dry-run first and shows the target; live calls only hit the local backend during implementation; prod push is the user's action with their env.
- **Type consistency:** `toCreateInput`/`toUpdateInput`/`MergedProduct` shared between ingest script and route; `publishToMedusa(products, dryRun)` and the `{results, dryRun}` response shape are identical across client, actions, and UI.
- **VC:** backend uncommitted on main, catalog-admin gitignored; nothing committed. No real-prod calls.
- **Open verification dependency:** Tasks 2/3/8 need a running local backend + a local admin token the user provides; the plan documents obtaining it rather than fabricating one.
