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

### 4. Promote Staggered PDP hero into a combo/bundle hero

The Staggered variant of `PdpHero` (in `apps/storefront/src/components/organisms/pdp-hero-variants.tsx`) currently shows 1 primary product image on the left + 3 aligned tiles on the right. The visual is the right shape; what's needed is to make each tile a _separate product_ and have the CTA add the whole combo to cart in one click.

**Already shipped:**

- Grid layout: `aspect-[5/4]` with `grid-cols-[3fr_1fr]`, satellites in `grid-rows-3 gap-3` — no rotations, perfect alignment, drop-shadow visible through clip-corner-cut.
- Single info card with one CTA (currently bound to the primary product).

**Remaining work:**

- **Combo data model.** Pick one of: (a) metadata field on the primary product (`metadata.combo_product_ids = "handle-a,handle-b,handle-c"`); (b) auto-derive from `platform` + category for cordless tools (`tool + matching battery + charger`); (c) a dedicated Medusa `combo` module with its own table. **My pick: start with (a)** — zero schema work, can curate manually via the AI chat editor once that lands.
- **`addManyToCart` helper** in `apps/storefront/src/lib/data/cart.ts` — loops `addToCart` per variant or batches via the Medusa SDK's `createLineItem`. Shared with the toolkit-builder feature (`docs/build-page.md`).
- **Combo info card:**
  - Title: the combo name (could default to "{primary} + accesorii" if metadata has no explicit `combo_title`).
  - Price block: rolled-up bundle total, optional `de la X MDL` if any variants drive the sum, optional crossed-out individual sum + `−X% combo` saving badge.
  - CTA: "Adaugă trusa în coș" (instead of "Adaugă în coș").
- **Per-tile interactivity:** each satellite tile should be (a) clickable to open the satellite's PDP in a new tab/modal, and (b) toggleable to exclude from the bundle ("I already have a charger"). Total recomputes live as user toggles.
- **Fallback** when a product has no combo defined — render the regular Spotlight or Marquee variant instead, not Staggered with the same image repeated.

**Effort:** ~half day for data + bulk-add helper + price math. Another ~half day for the toggleable-tile UX. **Impact:** big upsell lever — AOV boost on cordless tools especially.

### 5. Finish admin AI chat editor (blocked on `GEMINI_API_KEY`)

Scaffolding is in place; wire-up needs the API key.

**Already shipped:**

- Admin widget at `apps/backend/src/admin/widgets/ai-product-chat.tsx` — injected at `product.details.side.after`, full chat UI with bubbles, typing indicator, Romanian starter prompts, proposal cards (image before/after, description diff, title diff), Apply button.
- `apps/backend/src/api/admin/ai-edit/chat/route.ts` — POST returns a `{ reply, proposal? }` payload. **Currently stubbed** with hard-coded responses gated by keyword (`imagine` / `descriere` / `titlu`). Real Gemini call goes in the `TODO` branch.
- `apps/backend/src/api/admin/ai-edit/apply/route.ts` — POST that mutates the product via `updateProductsWorkflow`. Title + description writes work today; image swap rewrites the gallery URL but is no-op until the image edit produces a real new URL.

**Remaining work:**

- Set `GEMINI_API_KEY` in `apps/backend/.env` (use a **personal** Google AI Studio key, not corporate — see https://aistudio.google.com/apikey).
- Replace the stub in `chat/route.ts` with a real Gemini 2.5 Flash text call. Wire tool/function definitions: `read_product`, `propose_description_change`, `propose_title_change`, `propose_image_edit`. Pass product context (`title`, `description`, current `images[].url`) in the system prompt.
- Image edit flow: when Gemini emits `propose_image_edit`, fetch the source image, send to Gemini 2.5 Flash Image (nano banana) with the user's cleanup prompt, upload the result to Medusa's file module, return the uploaded URL as `previewUrl`. Apply step is already wired to swap the URL on the product.
- Romanian-first prompt template + brand-voice guardrails in the system message.
- Persistence: store chat history per product (currently in-memory). Either a `metadata.ingco_ai_history` JSON field or a dedicated module — TBD.
- Audit trail: log original value before each Apply so a "Revert" button is one DB write away. Currently no undo.

**Effort:** ~1 day for text + tool calling, +half a day for image edit flow, +half a day for persistence + undo. Impact: massive — lets non-technical admins edit copy and images by chatting. Plan doc: this section + `docs/build-page.md`-style spec to be written when we resume.

### 6. Fix data-layer types and lift `ignoreBuildErrors`

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

| Step | Tool                                                                                    | Why now                                                                                                                                                                                               |
| ---- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Plausible** (€9/mo) — script tag in `app/layout.tsx`                                  | Analytics from day 1, no cookie banner.                                                                                                                                                               |
| 2    | **Sentry** (`@sentry/nextjs` wizard)                                                    | Catch the data-layer issues we're hiding behind `ignoreBuildErrors` once shipped.                                                                                                                     |
| 3    | **Storybook** (`npx storybook@latest init` in `apps/storefront`) + **Chromatic**        | Visual diffs on every PR for `atoms/*` and `molecules/*`.                                                                                                                                             |
| 4    | **Lighthouse CI** GitHub Action with budgets (`LCP < 2.5s`, `CLS < 0.1`, `TBT < 200ms`) | Performance gate on PRs.                                                                                                                                                                              |
| 5    | **Cloudinary** Fetch base                                                               | Set `NEXT_PUBLIC_IMAGE_BASE=https://res.cloudinary.com/<cloud>/image/fetch/https://images.unsplash.com` — zero code changes; auto-optimised CDN. Real product photos go straight to Cloudinary later. |
| 6    | **Resend + react-email**                                                                | Replace Medusa's default transactional emails with branded ones.                                                                                                                                      |
| 7    | **axe-core in Playwright**                                                              | Auto-fail PRs that regress WCAG 2.1 AA.                                                                                                                                                               |

## Done in this design pass

- PDP redesign (gallery + zoom, sticky CTA, breadcrumbs, trust bullets, shadcn tabs, related rail).
- Cart redesign (stacked cards, sticky summary, promo disclosure, Romanian totals, MAIB strip).
- PLP polish (`PlpShell` shared by `/store` and `/categories/[…]`, sort `DropdownMenu`, sticky filter rail with `Accordion`, mobile filter `Sheet`, restyled pagination, removed `FilterRadioGroup`).
- Curated category imagery via `lib/data/category-visuals.ts` + `NEXT_PUBLIC_IMAGE_BASE` indirection; whitelisted `images.unsplash.com` and `res.cloudinary.com` in `next.config.ts`.
