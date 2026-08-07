# Russian locale support (Phase 1: routing + UI chrome) — design

## Problem

DYLLU serves Moldova, where many shoppers read Russian as a first or
preferred language. The storefront is Romanian-only today: no i18n library,
Romanian strings hardcoded in ~40 files, `<html lang="ro">`, locale-specific
formatting hardcoded to `"ro-MD"`, and no locale-aware routing.

This spec covers **Phase 1 only**: routing infrastructure, UI chrome
translation, locale-aware formatting, and SEO. **Phase 2** (translating
product/category catalog content via Medusa's native, currently
feature-flagged-off translation module) is a separate, later effort — it
touches production configuration and is gated by the AGENTS.md
production-safety process, not designed in detail here. Phase 1 ships and is
fully usable on its own: untranslated catalog content simply displays in
Romanian under the Russian UI, which is expected and acceptable.

## Audience & scope decisions (from brainstorming)

- Same market (Moldova), not a separate region — same currency (MDL), same
  Medusa region, same checkout/payment flow.
- First-time visitors always default to Romanian — no Accept-Language
  negotiation. Users switch language explicitly via a visible toggle; the
  choice persists.
- Russian pages must be independently indexable/shareable via URL (real SEO
  value), not just a same-URL client-side toggle.
- Catalog content (product titles/descriptions) falls back to Romanian
  when no Russian translation exists — Phase 1 does not block on
  translating the catalog.

## Existing groundwork discovered

- `apps/storefront/src/lib/data/locale-actions.ts` already has a working
  `_medusa_locale` cookie mechanism and an `updateLocale(localeCode)` action
  that updates the cart's `locale` field on Medusa (used for translated
  order emails/PDFs once Phase 2 is enabled) — currently called from
  nowhere. Phase 1 wires the new language switcher to call this in addition
  to the routing-level locale switch, so Medusa-side locale state and the
  UI's locale always agree.
- `apps/storefront/src/modules/common/components/localized-client-link/index.tsx`
  is a dead pass-through wrapper around `next/link`'s `Link` — a leftover
  from a Medusa starter template that used to have `[countryCode]` routing.
  Phase 1 replaces its body with `next-intl`'s locale-aware `Link`, giving
  its 13 existing call sites real behavior for free (no call-site changes
  needed — same import path, same props).
- Every locale-sensitive call today hardcodes `"ro"` / `"ro-MD"` directly
  (category sort, number/date formatting, `x-medusa-locale` header in
  `categories.ts`/`homepage-products.ts`/`navigation-products.ts`, OpenGraph
  `locale: "ro_MD"`, `<html lang="ro">`). Phase 1 makes all of these read the
  active locale instead.

## Architecture

### Routing: `next-intl` + `app/[locale]/...`

Adopt Next 16's officially-documented App Router i18n pattern (no built-in
i18n exists in the App Router; `next-intl` is Next's top-listed recommended
library and its `4.13.x` releases explicitly target Next 16 compatibility).

- Move all 35 existing route files (`page.tsx`/`layout.tsx`/`route.ts`) one
  level deeper: `app/(main)/...` → `app/[locale]/(main)/...`, same for
  `(checkout)`. Imports are path-aliased (`@/`, `@lib`, `@modules`), so this
  is a directory move, not an import rewrite.
- Locale prefix strategy: **`ro` unprefixed (default), `ru` prefixed**
  (`/ru/...`). Every existing indexed URL and bookmark keeps working
  unchanged for Romanian; only Russian gets the new `/ru/` prefix. This is
  `next-intl`'s `localePrefix: "as-needed"` mode.
- `apps/storefront/src/middleware.ts` gains `next-intl`'s routing
  middleware, composed with the existing `_medusa_cache_id` cookie logic
  (both run in the same file — Next only supports one middleware/proxy
  file). **Must stay Edge runtime, must stay named `middleware.ts`** — the
  `@opennextjs/cloudflare` adapter used for deployment does not yet support
  `proxy.ts`/Node-runtime middleware (tracked upstream as
  opennextjs-cloudflare#962; the file already has a comment recording this
  constraint). `next-intl`'s middleware is Edge-compatible, so this holds.
- API routes (`app/api/**`) do **not** move under `[locale]` — they're
  locale-agnostic.
- `generateStaticParams` in the root `[locale]/layout.tsx` pre-renders both
  locales.

### Locale switching

A visible switcher in the utility bar (next to the cart icon, matching
existing header conventions). On change, it:

1. Uses `next-intl`'s locale-aware `useRouter()`/navigation to redirect to
   the same page under the new locale prefix (sets `next-intl`'s own locale
   cookie).
2. Calls the existing `updateLocale(localeCode)` action to set the
   `_medusa_locale` cookie and update the cart's `locale` field on Medusa,
   so backend-rendered content (translated emails, once Phase 2 ships)
   matches.

No Accept-Language detection — `next-intl`'s `localeDetection: false`,
falling back to `defaultLocale: "ro"` for any unprefixed, no-cookie request.

### UI string translation

Extract hardcoded Romanian strings from the ~40 affected files into
`next-intl` message catalogs (`messages/ro.json`, `messages/ru.json`),
accessed via `useTranslations()` (client) / `getTranslations()` (server).
Romanian is the source of truth; Russian copy is written/reviewed as part of
implementation (short UI strings — buttons, labels, nav, static page
copy — not the product catalog).

### Locale-aware formatting

Replace the ~12 files' hardcoded `Intl.NumberFormat("ro-MD")` /
`Intl.DateTimeFormat("ro-MD")` / `.toLocaleString("ro-MD")` calls with
`next-intl`'s `useFormatter()`, which resolves the active locale
automatically. Currency stays MDL regardless of locale (same region, same
market — only the language changes, not the currency).

The one pre-existing anomaly (`product-actions/index.tsx`'s
`Intl.NumberFormat("ru-RU")`, used only for its digit-grouping style, not
language) is normalized to the same `useFormatter()` call for consistency,
confirming its output is unchanged (it was never actually Russian-locale
content, just a formatting quirk).

### SEO

- `alternates.languages` (hreflang) added to every page's metadata,
  pointing at the RO and RU versions of that URL.
- OpenGraph `locale` becomes locale-aware; `alternateLocale` added for the
  other language.
- `<html lang>` becomes locale-aware (currently hardcoded `"ro"` in both
  `layout.tsx` and `global-error.tsx`).
- `sitemap.ts` emits both locale variants of every URL with correct
  `alternates`.

### Performance

- `next-intl` message catalogs are loaded per-request server-side (only the
  active locale's JSON is sent to the client, not both) — no bundle-size
  regression from carrying both languages to every visitor.
- Static generation (`generateStaticParams` for both locales) keeps
  Romanian pages exactly as fast as today; Russian pages get the same
  static-rendering treatment, not a slower fallback path.
- No new client-side JS beyond `next-intl`'s runtime (small; it's built for
  the App Router's server-first model, not a client-heavy i18next-style
  runtime).

## Verification approach (per explicit direction — lean, not exhaustive)

- `pnpm -F @dyllu/storefront typecheck` and `lint` after each meaningful
  step.
- Targeted **unit tests** (Vitest — see note below) only for pure,
  non-trivial logic worth locking in: the locale-prefix resolution helper
  and the message-catalog completeness check (every `ro.json` key exists in
  `ru.json` and vice versa, to catch missing-translation bugs at build time
  rather than runtime).
  - The storefront has no Vitest setup today (removed post-migration,
    per the project's testing policy doc). Phase 1 adds a minimal Vitest
    config scoped to `src/lib/i18n/**` only — not a full test-framework
    re-adoption project. If that turns out to be more than a few minutes of
    setup, fall back to plain Node assertions run via `tsx` instead of
    introducing Vitest, and note that trade-off when it happens.
- **No new Playwright e2e coverage** for this phase — manual testing by the
  user, as directed. Existing e2e specs must still pass post-migration
  (they exercise real routes, which are moving; this is the main
  regression-risk check).
- Manual QA checklist (for the user, not automated): switch language,
  confirm URL prefix changes, confirm persisted across navigation and
  reload, confirm checkout still works end-to-end in both locales, confirm
  `<html lang>` and hreflang tags in page source, confirm no layout
  shift/FOUC from locale switching.

## Out of scope (this phase)

- Catalog content translation (Phase 2, separate production-gated spec).
- Accept-Language auto-detection.
- Any region/currency change — MDL and the single Moldova region are
  unaffected.
- Translating URL path segments themselves (e.g. `/livrare` stays
  `/livrare` under `/ru/livrare` too — only the prefix and page content
  change, not the slug). Slug translation would fragment SEO equity further
  and isn't needed for the stated goal.
