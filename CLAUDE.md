@AGENTS.md

# DYLLU

## Project Overview

Shopify storefront built with Next.js (App Router), hosted on Vercel. Client proposal in `PROPOSAL.md` (reference design: ryobitools.com). Payment gateway: Moldindconbank.

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- Next.js 16 (App Router, TypeScript, Tailwind CSS 4, Turbopack)
- React 19
- Shopify Storefront API via `@shopify/storefront-api-client` _(being migrated to Medusa — see memory)_
- `@shopify/hydrogen-react` for Shopify React components _(will be removed with Medusa migration)_
- Zustand (persisted) for cart state
- Vercel for hosting and deployment
- Vitest (unit) + Playwright (e2e)

## Project Structure

```
apps/
  storefront/               # Next.js 16 App Router app
    src/
      app/                  # Router pages (products/, collections/, cart/)
      components/
        ui/                 # Shared UI primitives (dumb, Tailwind, no domain logic)
        cart/               # Cart-related components
        product/            # Product cards, galleries, variant selectors
        layout/             # Header, footer, navigation, mega menu
      lib/
        shopify/            # Storefront API client, GraphQL queries
        hooks/              # Custom hooks (useCart, etc.)
        utils.ts            # Formatting, classname helpers
      types/                # Generated Shopify types (via codegen)
      test/                 # Vitest setup
    e2e/                    # Playwright E2E tests
    .env.local              # Storefront env vars
    next.config.ts
    tsconfig.json
    package.json            # @dyllu/storefront
packages/                   # Shared packages (types, utils, etc. — empty today)
package.json                # Workspace root
pnpm-workspace.yaml
turbo.json
```

## Scripts (run from repo root unless noted)

All scripts are orchestrated via Turborepo — `pnpm <script>` fans out to the right workspace(s).

- `pnpm dev` — Dev server(s) (Turbopack for storefront)
- `pnpm build` — Production build
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm check` — Lint + typecheck + unit tests (run before any commit/PR)
- `pnpm format` — Prettier write (whole monorepo)
- `pnpm test` — Vitest (run once)
- `pnpm test:e2e` — Playwright
- `pnpm codegen` — Generate Shopify GraphQL types

To target a single workspace: `pnpm -F @dyllu/storefront <script>` (short form: `pnpm -F storefront ...`).

## Environment Variables

Copy `apps/storefront/.env.local.example` to `apps/storefront/.env.local` and fill in:

- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`

## GitHub Account

This repo uses the `abalmush` GitHub account. Before any `gh` or `git push` operation:

1. Run `gh auth switch --user abalmush`
2. Perform the operation
3. Run `gh auth switch --user abalmus-celonis` to switch back

## Next.js 16 — Before Writing Next Code

Next.js 16 has breaking changes vs. training data. **Before writing anything Next-specific** (route handlers, metadata, caching, async params, middleware, etc.), consult the relevant file in `node_modules/next/dist/docs/`. When in doubt, `Grep` that directory for the feature name.

## React Server vs Client Components

- **Server Components by default** — no `"use client"` unless you need state, effects, browser APIs, or event handlers.
- Data fetching (Shopify Storefront calls) belongs in Server Components.
- Keep `"use client"` boundaries narrow — push interactivity to small leaf components rather than whole pages.
- Never import a Server Component from a Client Component.

## Shopify Integration Rules _(legacy — under migration to Medusa)_

- GraphQL queries live in `apps/storefront/src/lib/shopify/queries.ts`.
- **Run `pnpm codegen` after any change to queries** — keeps `src/types/` in sync and gives queries end-to-end type safety.
- Prefer server-side Storefront API calls. Only the cart mutations (stateful, user-triggered) belong in a client hook.
- Cart state: Zustand store in `apps/storefront/src/lib/hooks/use-cart.ts`, persisted via `zustand/middleware`.

## Component Conventions

- **UI primitives** (`apps/storefront/src/components/ui/`) are dumb, composable, styled with Tailwind. No commerce or domain logic.
- **Domain components** (`apps/storefront/src/components/{cart,product,layout}/`) compose primitives and can fetch commerce data (server) or consume hooks (client).
- Prefer **composition over boolean props** — see the `vercel-composition-patterns` skill.
- Favor React 19 APIs (`use`, `useOptimistic`, `useFormStatus`) over hand-rolled equivalents.

## Testing Policy

- **Unit tests** (Vitest) for utils and pure hooks — colocate as `*.test.ts(x)` next to the file.
- **E2E tests** (Playwright) for critical user flows: browse → PDP → add to cart → checkout hand-off.
- **Do not mock the commerce backend** in integration tests — hit a real dev store/backend. Mocks silently diverge from schema changes.
- Run `pnpm check` before every commit. Husky + lint-staged (configured at repo root) handle formatting/linting at commit time.

## Accessibility

- **Target: WCAG 2.1 AA** (per proposal).
- Visible focus indicators on all interactive elements.
- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`).
- `alt` text on every image (from Shopify's `altText` field).
- Keyboard-navigable mega menu, cart drawer, and variant pickers.
- Respect `prefers-reduced-motion` on carousels/animations.

## Performance

- Use `next/image` for all Shopify product images (set `width`/`height` from the GraphQL response).
- Use `next/font` for fonts (already wired in `layout.tsx`).
- Cache Shopify responses via Next's `fetch` cache semantics — consult `node_modules/next/dist/docs/` for the current API.
- Target Core Web Vitals green. Run Lighthouse before shipping any non-trivial page.

## Style

- Tailwind class order is managed by `prettier-plugin-tailwindcss` — don't fight it.
- Prettier: 2-space indent, double quotes, semicolons, trailing commas (es5), 80-col print width.

## Installed Skills

Skills in `.claude/skills/`:

- `vercel-react-best-practices` — React/Next performance patterns
- `next-best-practices` — Next.js file conventions & patterns
- `vercel-composition-patterns` — Component composition
- `web-design-guidelines` — UI/UX/accessibility audit
- `deploy-to-vercel` — Vercel deployment workflow
- `vercel-cli-with-tokens` — Vercel CLI auth

## MCP Servers

- `deepwiki` — Query Shopify, Next.js, and other OSS repos' docs and code via AI.
- `shopify-dev-mcp` — Shopify Storefront/Admin GraphQL schema introspection and docs.
