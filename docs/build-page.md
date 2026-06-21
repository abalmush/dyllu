# Build Your Toolkit — feature plan

Guided journey on `/build` (also surfaced as a homepage hero) that helps users
assemble a DYLLU 20V Max kit. Walks tool → battery → charger → accessories,
adds everything to cart in one tap.

## Status (2026-05-19)

- ✅ **Data foundation complete.** 457 products carry `metadata.platform`,
  `requires_battery`, `tool_kind`, `accessory_kind`, `battery_voltage`,
  `battery_capacity_ah`. Backfilled by `apps/backend/src/scripts/ingco-classify.ts`.
- ✅ **PDP "Compatible Accessories" section live** (`modules/products/components/compatible-accessories`).
  Reads `/store/compatible-accessories?platform=…` (custom Store API at
  `apps/backend/src/api/store/compatible-accessories/route.ts`).
- ⏳ **Build page (`/build`) — not started.**

## The 20V Max ecosystem we're configuring

After merge + classify the live numbers are:

- **15 bare cordless tools** that need a battery (`platform=dyllu-20v` +
  `requires_battery=true`). Spread across kinds: rotary hammer, pendulum saw,
  trimmer, polypropylene welder, tile cutter, vacuum, stapler, impact driver,
  hedge trimmer, mini chainsaw, earth auger, angle grinder, leaf blower,
  concrete vibrator. Most are multi-variant, so total SKU count is higher.
- **1 battery product** with 3 variants (2.0 / 4.0 / 5.0 Ah, option `Capacitate baterie`).
- **1 charger product**, 1 variant.

Plus tangential platforms: 3 `dyllu-12v` products, 18 `gasoline`, 47 `corded`,
349 `hand`, 20 `consumable`. Build flow v1 ignores everything except `dyllu-20v`.

## User flow (single page, progressive disclosure)

`/build` is one page, not a wizard. Steps stack vertically, progress indicator
pins to viewport top, **sticky kit summary in a side panel fills as the user
chooses**. Single-page beats multi-step for SEO, back-button forgiveness, and
"feel the cart growing" commitment.

1. **"Ce vrei să construiești?"** — pick 1–N use cases (Construcție, Casă,
   Atelier, Auto, Grădină). Filters which tools appear in step 2. Use-case →
   tool_kind map is hand-curated.
2. **"Alege sculele"** — multi-select tool cards from the filtered set. Each
   card shows the bare-tool price + "necesită acumulator" badge.
3. **"Alege acumulatorul"** — only appears if any selected tool requires one.
   Pick capacity (2.0 / 4.0 / 5.0 Ah) and quantity. Auto-recommend 2× if user
   picked 3+ tools.
4. **"Alege încărcătorul"** — auto-recommend the matching 20V charger; one-tap
   skip if user already owns one.
5. **"Adaugă accesorii"** — optional. Surfaces drill bits, blades, safety gear
   filtered by the tool_kinds picked. Cross-sell, not gating.
6. **"Trusa ta"** — final review with line-item edit, total, "Adaugă tot în
   coș" CTA. Bulk-creates cart line items via existing `addToCart`.

## Technical approach

- **Route:** `apps/storefront/src/app/(main)/build/page.tsx` (Server Component)
- **Organism:** `<KitBuilder>` (Client Component, holds the picker state)
- **Sub-components per step:** `<UseCaseStep>`, `<ToolStep>`, `<BatteryStep>`,
  `<ChargerStep>`, `<AccessoryStep>`, `<KitSummary>` (sticky side panel)
- **State:** Zustand store for the in-progress kit (already a project dep);
  persist to localStorage so refresh doesn't reset the picker
- **Data:** Server Component pre-fetches all `dyllu-20v` products + batteries +
  chargers at the top of the page, passes to client. No new API routes needed
  — filtering happens client-side on a small set (~17 products + variants).
- **Cart bulk-add:** add a `addManyToCart({ items: [{variantId, quantity}, …] })`
  helper in `apps/storefront/src/lib/data/cart.ts` next to existing `addToCart`.
  Or loop the existing one — fine for <10 items.
- **Animation:** framer-motion (already in deps) for step transitions and the
  kit summary "item added" pulse.

## Homepage hero entry point

After `/build` ships:

- Replace one existing homepage section (probably the use-case-light
  `SystemsGrid` or `CategoryCinematic`) with a full-bleed `<BuildKitHero>` block.
- Title: "Construiește-ți trusa DYLLU 20V Max".
- Sub: short pitch about platform interoperability.
- One CTA: "Începe configurarea" → `/build`.
- Optionally: 3–4 lifestyle thumbnails (project photos) above the CTA to set
  the vibe.

## Tradeoffs / scope notes

- **No bundle discount in v1.** Each line item carries its own price. Adding a
  Medusa promotion rule ("DYLLU 20V tool + battery + charger = −10%") is a
  follow-up; the configurator doesn't depend on it.
- **No hard enforcement.** User can leave step 3 empty even with battery-required
  tools selected. We warn ("Acest produs nu include acumulator") at the kit
  review step but don't block. Hard enforcement would require kit/bundle SKUs.
- **Mobile UX needs care.** Sticky side panel becomes a bottom drawer on small
  screens. Doable but a meaningful design pass.
- **Only ~50 SKUs in scope.** The flow doesn't replace `/store`, it complements
  it. Once we have a real project catalog ("Build a deck", "Set up a workshop"),
  the use-case step can pivot to project-based recommendations.

## Phasing (when we resume)

1. **Build page MVP** (~half-day) — steps 1–6 working with stub data, no
   animations, no mobile drawer. Validate the flow.
2. **Wire to real data + cart** (~2h) — Server Component fetches, sticky summary
   computes totals, "Adaugă tot" calls cart.
3. **Polish** (~half-day) — framer-motion transitions, mobile drawer, copy,
   loading states.
4. **Homepage hero block** (~1h) — `<BuildKitHero>` + integration into
   `home.config.ts`.
5. **Bundle discount via Medusa promotion** (~2h, optional) — only if we want
   the "−10% when buying tool + battery + charger" lever.

## Open questions for when we resume

- Which **5–6 use-case buckets** do we want in step 1? (Construcție / Casă /
  Atelier / Auto / Grădină / Profesional are my guesses — confirm with client.)
- Do we want a **"skip the picker, here's a recommended starter kit"** shortcut
  on `/build`? Useful for indecisive users; one-click to a pre-curated 4-item kit.
- Should the homepage block **replace** an existing section or **insert** alongside?
- Bundle discount yes/no?
