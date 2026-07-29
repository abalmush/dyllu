# Catalog Admin Web App — Design

**Date:** 2026-07-13
**Status:** Design (pending review)
**Repo:** `~/Projects/DYLLU` monorepo, new app `apps/catalog-admin`
**Note:** All files (app + database) are gitignored for now — nothing is committed.

## Problem

The catalog single source of truth is a SQLite database (`catalog.db`: 276 products,
888 variants, 888 images, 2,738 specifications, plus categories, spec_key, links).
Editing it today means raw SQL or the pipeline CLI. We need a visual tool to **edit
the data easily and preview it to detect problems** before exporting to Medusa.

## Goal

A locally-run web app that makes editing fast and surfaces data problems inline.
v1 delivers **fully-operational product editing** (list + detail: overview,
variants, specifications, descriptions, images, links) with **inline
problem-detection**, plus **the navigable visual shell of every other surface**
(so nothing in scope is forgotten) stubbed as "coming soon".

## Stack & placement

- **App:** `apps/catalog-admin` (pnpm workspace `apps/*`).
- **Framework:** Next.js 16 + React 19 (matches `apps/storefront`), App Router,
  Server Actions for mutations, **Node runtime** (needs filesystem for SQLite).
- **UI:** shadcn/ui (proper `components.json`), Tailwind, lucide-react icons.
- **Data:** Drizzle ORM + better-sqlite3, typed schema mirroring the existing tables.
- **Validation:** Zod schemas per entity, driving live field-level validation.
- **Runtime scope:** local-only. Because it reads/writes a SQLite file, it does NOT
  deploy to Cloudflare (unlike the storefront). Dev server on port **4100**.

## Database migration

- Copy the current `catalog.db` into `apps/catalog-admin/data/catalog.db`.
- Add `apps/catalog-admin/data/` and `*.db` to DYLLU `.gitignore`.
- Drizzle schema is authored to match the 7 existing tables exactly (introspection-
  verified), so no data reshape on import.

## Information architecture (left nav)

| Screen                                 | v1 state                                            |
| -------------------------------------- | --------------------------------------------------- |
| **Products** (list)                    | Fully operational                                   |
| **Product detail** (editor)            | Fully operational                                   |
| **Problems** (QA dashboard)            | Real counts + drill-down; some deep filters stubbed |
| Specifications dictionary (`spec_key`) | Visual stub ("coming soon")                         |
| Categories                             | Visual stub                                         |
| Cross-sell links                       | Visual stub                                         |
| Bulk operations / Medusa export        | Visual stub                                         |
| Settings                               | Visual stub                                         |

Stubs are fully laid out and navigable, with an honest empty/"coming soon" state —
no fake data.

## Product editor (centerpiece)

Two-pane: left = product list with live issue badges + "issues only" filter;
right = tabbed editor. **Explicit per-product Save** commits all cross-tab edits at
once (free editing until Save; discard reverts). Every field failing a QA or
validation check shows an inline ⚠ with the reason; the header shows a per-product
problem summary.

Tabs:

- **Overview:** title_ro, title_en, category, product_type, power_source, axis,
  status, handle.
- **Variants:** inline-editable table — value, price_mdl, battery/charger/case
  flags, qa_ok; add / remove / reorder SKUs.
- **Specifications:** EN and RO shown **side by side**. Left column = the structured
  `specification` rows (key_norm → label_ro, value, unit), editable, with unmapped-
  key rows flagged and a one-click "map key" that writes `spec_key`. Right column =
  the Romanian strings from `description_ro.specifications`, with a "promote →
  structured" action that parses a RO line into an editable structured row. This is
  how the 145 missing / 529 unmapped are reconciled by hand.
- **Description:** the rich Romanian content object as structured fields —
  short_description, why_good, seo_text, meta_title, meta_description, image_alt
  (text); highlights, use_cases, faq, keywords (list editors).
- **Images:** thumbnails from source_url, role, image_mode, image_own.
- **Links:** cross-sell related products.

### ASCII mock — Variants tab

```
┌ Catalog Admin ─────────────────────────────────────────────────────────────┐
│ [Products] Problems Specs Categories Links Bulk ⚙          catalog.db ●     │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ 🔍 search…    │  Motocoasă pe benzină            handle: motocoasa-…-22a0fd │
│ Filter ▾      │  aiGRP1 · Grădinărit · 3 variants        ⚠ 2 problems  [Save]│
│ ⚠ issues only │ ┌─────────────────────────────────────────────────────────┐ │
│───────────────│ │ Overview │ Variants(3) │ Specs │ Description │ Images │Links││
│●Motocoasă  ⚠2 │ ├─────────────────────────────────────────────────────────┤ │
│ Compresor     │ │ Variants                                    [+ Add SKU] │ │
│ Trimer     ⚠1 │ │ SKU      Value     Price     Bat  QA                    │ │
│ Ferăstrău     │ │ DTGM2552 52cc      1799 MDL  no   ✓                     │ │
│ …             │ │ DTGM3062 62cc      1999 MDL  no   —                     │ │
│               │ │ DTGM42   ⚠Standard ⚠ —      no   —                     │ │
│               │ │ ⚠ DTGM42: value "Standard" (ungrouped) · price empty   │ │
│               │ └─────────────────────────────────────────────────────────┘ │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

### ASCII mock — Specifications tab (EN + RO side by side)

```
│ │ Specifications — SKU: DTGM2552                                          │ │
│ │ ┌ Structured (editable) ───────────┐ ┌ Romanian source (read) ───────┐ │ │
│ │ │ Cilindree     52cc      cc        │ │ Putere nominală: 1,25 kW  [→] │ │ │
│ │ │ Putere nom.   1.4  kW             │ │ Turație maximă: 8000 rot/min[→]│ │ │
│ │ │ ⚠ Zorp Level  …    [map key]      │ │ Lățime tăiere: 420 mm     [→] │ │ │
│ │ │ [+ Add spec]                      │ │ Capacitate rezervor:1200ml[→] │ │ │
│ │ └───────────────────────────────────┘ └───────────────────────────────┘ │ │
│ │   [→] promotes a RO line into an editable structured row                 │ │
```

## Problem-detection model

Two kinds, surfaced inline AND aggregated on the Problems screen:

- **Data problems** (reuse the QA SQL views already built for the DB): missing_price,
  missing_specs, unmapped_spec_key, ungrouped "Standard" variant, orphan_image,
  single_variant_group, category_missing.
- **Validation** (Zod, live): required fields, numeric price, valid handle slug, etc.

List rows show a badge count; editor header shows the summary; each offending field
shows the specific ⚠. The "issues only" list filter and the Problems dashboard both
read the same checks.

## Schema evolution (one migration)

The rich Romanian description currently lives as a JSON blob in `product.extras`.
Add a **`product_content`** table via Drizzle migration:

- text columns: short_description, why_good, seo_text, meta_title, meta_description,
  image_alt
- JSON columns: highlights, use_cases, faq, keywords, specifications

Lift data out of `extras` into `product_content` on first run. Non-destructive —
`extras` is retained as backup. The RO `specifications` array here is what feeds the
Specs tab's right-hand column.

## Architecture / modules

```
apps/catalog-admin/
  data/catalog.db                 # gitignored, copied from pipeline
  drizzle/
    schema.ts                     # typed mirror of the 7 tables + product_content
    migrate.ts                    # product_content migration + extras lift
  src/
    db/client.ts                  # better-sqlite3 + drizzle singleton (node)
    db/queries/                   # products, variants, specs, content, images, links
    lib/qa.ts                     # data-problem checks (mirror the SQL views)
    lib/validation.ts             # Zod schemas per entity
    app/
      layout.tsx                  # shell: left nav + db indicator
      products/page.tsx           # list (RSC) + filters
      products/[id]/page.tsx      # editor shell
      products/[id]/_tabs/*       # overview, variants, specs, description, images, links
      products/actions.ts         # server actions (save product bundle)
      problems/page.tsx           # QA dashboard
      (stubs)/…                   # specs-dict, categories, links, bulk, settings
    components/ui/*               # shadcn components
```

Server Actions receive a full product bundle (product + variants + specs + content)
and write it in one transaction, so the explicit Save is atomic.

## Out of scope for v1 (stubbed only)

Bulk edit, Medusa export screen, categories CRUD, cross-sell links CRUD,
spec-dictionary management UI. Each is a navigable shell wired later.

## Testing

- DB query layer + qa checks: vitest against a temp copy of the schema with seeded rows.
- Server actions: unit tests for the transactional save + validation rejection.
- One Playwright smoke: load product, edit a variant price, Save, reload, assert persisted.
