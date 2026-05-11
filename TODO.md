# TODO

Follow-ups picked up from the design pass on 2026-04-29. Sequenced by visual ROI.

## Outstanding work

### 1. Seed categories so `/categories/<handle>` lights up

- Write `apps/backend/src/migration-scripts/seed-categories.ts` that walks the tree in `apps/storefront/src/lib/data/categories-tree.ts` and upserts each node via the Medusa `createProductCategoriesWorkflow`.
- Slugs already match the storefront helper (`auto-moto`, `burghie-pe-beton-sds-`, etc.).
- Re-run `pnpm -F @dyllu/backend db:migrate` to execute.
- Effort: ~1h. Impact: turns the mega-menu links from 404s to real PLPs and unlocks filter QA.

### 2. Polish account + checkout

- `modules/account/templates/login-template.tsx`, `register/index.tsx`, `account-info`, `address-card/*`, `order-card`, `order-completed-template` — restyle in the new visual language (cards, shadcn inputs, breadcrumbs, Romanian copy).
- Checkout step indicators: introduce a stepper molecule under `components/molecules/`.
- Effort: ~2h. Impact: medium — matters for conversion.

### 3. Drop `@medusajs/ui-preset`

- Replace remaining preset classes across the codebase: `txt-*`, `text-ui-fg-*`, `bg-ui-bg-*`, `shadow-elevation-*`, `rounded-rounded`, `text-ui-border-*`. Hot spots:
  - `modules/products/components/thumbnail/index.tsx`
  - `modules/common/components/line-item-price`, `line-item-unit-price`, `line-item-options`, `interactive-link`
  - `modules/account/**`, `modules/order/**`
  - `modules/checkout/**`
- Then remove `@medusajs/ui-preset` from `tailwind.config.ts`, drop `@medusajs/ui` runtime dep, delete `src/lib/ui-compat.tsx` + `src/lib/ui-compat-client.tsx`, point all consumers directly at `@/components/atoms/*`.
- Effort: ~3–4h. Impact: low visual but unlocks lifting `ignoreBuildErrors`.

### 4. Fix data-layer types and lift `ignoreBuildErrors`

- Currently masked by `next.config.ts → typescript.ignoreBuildErrors: true`.
- Files with errors:
  - `src/lib/data/cart.ts` — `setCartId` / `removeCartId` / cookie helpers expect 2 args, called with 1
  - `src/lib/data/customer.ts` — same pattern
  - `src/lib/data/locale-actions.ts` — same pattern
  - `src/modules/checkout/components/shipping/index.tsx` — `service_zone` vs `service_zone_id`
  - `src/modules/common/components/line-item-price/index.tsx` — possibly-undefined number arithmetic
  - `src/modules/common/components/line-item-unit-price/index.tsx` — same
  - `src/app/(main)/products/[handle]/page.tsx` — `images: null` vs `StoreProductImage[]`
- ~30 errors in ~7 files. Once green, set `ignoreBuildErrors: false`.
- Effort: ~1–2h. Impact: correctness; enables CI typecheck gate.

## Tooling to set up (in order)

| Step | Tool | Why now |
| --- | --- | --- |
| 1 | **Plausible** (€9/mo) — script tag in `app/layout.tsx` | Analytics from day 1, no cookie banner. |
| 2 | **Sentry** (`@sentry/nextjs` wizard) | Catch the data-layer issues we're hiding behind `ignoreBuildErrors` once shipped. |
| 3 | **Storybook** (`npx storybook@latest init` in `apps/storefront`) + **Chromatic** | Visual diffs on every PR for `atoms/*` and `molecules/*`. |
| 4 | **Lighthouse CI** GitHub Action with budgets (`LCP < 2.5s`, `CLS < 0.1`, `TBT < 200ms`) | Performance gate on PRs. |
| 5 | **Cloudinary** Fetch base | Set `NEXT_PUBLIC_IMAGE_BASE=https://res.cloudinary.com/<cloud>/image/fetch/https://images.unsplash.com` — zero code changes; auto-optimised CDN. Real product photos go straight to Cloudinary later. |
| 6 | **Resend + react-email** | Replace Medusa's default transactional emails with branded ones. |
| 7 | **axe-core in Playwright** | Auto-fail PRs that regress WCAG 2.1 AA. |

## Done in this design pass

- PDP redesign (gallery + zoom, sticky CTA, breadcrumbs, trust bullets, shadcn tabs, related rail).
- Cart redesign (stacked cards, sticky summary, promo disclosure, Romanian totals, MAIB strip).
- PLP polish (`PlpShell` shared by `/store` and `/categories/[…]`, sort `DropdownMenu`, sticky filter rail with `Accordion`, mobile filter `Sheet`, restyled pagination, removed `FilterRadioGroup`).
- Curated category imagery via `lib/data/category-visuals.ts` + `NEXT_PUBLIC_IMAGE_BASE` indirection; whitelisted `images.unsplash.com` and `res.cloudinary.com` in `next.config.ts`.
