@AGENTS.md

# DYLLU

## Project Overview

Headless e-commerce for **DYLLU** — a Moldova-based storefront built on:

- **Medusa v2** (TypeScript) backend, hosted on **Hetzner + Coolify** (not yet deployed — local dev only)
- **Next.js 16** App Router storefront, hosted on **Vercel**
- **MAIB (Moldova Agroindbank) Checkout API** as the payment gateway — custom Medusa payment provider, implementation deferred

Client proposal: `PROPOSAL.md` (reference design: `ryobitools.com`).

## Tech Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **Backend:** Medusa v2.14, Postgres, Redis (prod)
- **Storefront:** Next.js 16, React 19, Tailwind CSS 3, Zustand, Medusa JS SDK
- **Admin UI:** Medusa's bundled admin (served by the backend at `/backend`)
- **Testing:** Vitest (unit — to be re-added post-migration), Playwright (e2e)
- **Hosting:** Hetzner CX32 + Coolify (backend), Vercel (storefront), Cloudflare R2 (images)

## Project Structure

```
apps/
  backend/                    # Medusa v2 backend (@dyllu/backend)
    src/
      admin/                  # Admin customizations (bundled into the admin UI)
      api/                    # Custom REST routes (admin + store)
      jobs/                   # Background jobs
      links/                  # Cross-module data links
      migration-scripts/      # Custom migration/seed scripts
      modules/                # Custom Medusa modules
      subscribers/            # Event subscribers
      workflows/              # Custom workflows
    medusa-config.ts          # Core config (admin path: /backend)
    docker-compose.yml        # Local Postgres on port 5433
    Dockerfile                # Production image (Coolify)
    DEPLOY.md                 # Deployment runbook
    .env                      # Local dev env (gitignored)
    .env.example              # Local dev env template
    .env.production.example   # Production env template

  storefront/                 # Next.js 16 storefront (@dyllu/storefront)
    src/
      app/[countryCode]/      # Region-scoped routes
      lib/                    # Medusa SDK wrappers, utilities
      modules/                # Feature modules (cart, checkout, products, etc.)
      styles/                 # Global CSS
      middleware.ts           # Region redirection (will rename to proxy.ts)
    tailwind.config.js        # Tailwind 3 + @medusajs/ui-preset
    check-env-variables.js    # Validates required env vars at build/start
    next.config.ts            # outputFileTracingRoot for monorepo

packages/                     # Shared packages (empty — for future sharing)

turbo.json                    # Task graph
pnpm-workspace.yaml           # Workspace config
.npmrc                        # auto-install-peers=true (Medusa needs it)
.dockerignore                 # For backend Docker builds
```

## Scripts (run from repo root)

Orchestrated by Turborepo — `pnpm <script>` fans out to the right workspace(s).

| Command                                                          | Effect                                                                     |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `pnpm dev`                                                       | Run **all** dev servers (backend + storefront) via turbo                   |
| `pnpm -F @dyllu/backend dev`                                     | Backend only (admin at `http://localhost:9000/backend`)                    |
| `pnpm -F @dyllu/storefront dev`                                  | Storefront only (`http://localhost:4000`)                                  |
| `pnpm build`                                                     | Production build for all workspaces                                        |
| `pnpm lint` / `pnpm typecheck` / `pnpm test`                     | Fans out                                                                   |
| `pnpm check`                                                     | Lint + typecheck + test (storefront only; backend has no check script yet) |
| `pnpm format`                                                    | Prettier write across the monorepo                                         |
| `pnpm -F @dyllu/backend db:migrate`                              | Run pending migrations + any seed scripts                                  |
| `pnpm -F @dyllu/backend db:create-user -e <email> -p <password>` | Create admin user                                                          |

## Local dev setup

1. **Prerequisites:** Node 20.19+, Docker (for Postgres), pnpm 10+.
2. **Clone and install:**
   ```bash
   pnpm install
   ```
3. **Start Postgres:**
   ```bash
   docker compose -f apps/backend/docker-compose.yml up -d
   ```
   Port 5433 (NOT 5432) to avoid conflicts with other local Postgres containers.
4. **First-time only:**
   ```bash
   pnpm -F @dyllu/backend db:migrate
   read -s ADMIN_PASSWORD
   pnpm -F @dyllu/backend db:create-user -e admin@dyllu.local -p "$ADMIN_PASSWORD"
   unset ADMIN_PASSWORD
   ```
5. **Copy env:**
   ```bash
   # Backend is pre-filled for local dev — .env already exists (gitignored)
   cp apps/storefront/.env.local.example apps/storefront/.env.local
   ```
   Then log into the backend admin (`http://localhost:9000/backend`) and copy
   the Default Publishable API Key into `apps/storefront/.env.local` as
   `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.
6. **Run:**
   ```bash
   pnpm dev
   ```

Admin URL: `http://localhost:9000/backend`. Storefront: `http://localhost:4000`.

## Environment variables

See:

- `apps/backend/.env.example` — local backend dev
- `apps/backend/.env.production.example` — documented production env
- `apps/storefront/.env.local.example` — storefront

## GitHub Account

This repo uses the `abalmush` GitHub account. Before any `gh` or `git push` operation:

1. `gh auth switch --user abalmush`
2. Perform the operation
3. `gh auth switch --user abalmus-celonis` to switch back

## Next.js 16 — Before Writing Next Code

Next.js 16 has breaking changes vs. training data. Before writing anything Next-specific
(route handlers, metadata, caching, async params, proxy/middleware, etc.), consult
`node_modules/next/dist/docs/`. When in doubt, Grep that directory for the feature name.

**Known Next 16 notes for this project:**

- `src/middleware.ts` is deprecated; the file convention is now `src/proxy.ts`. Current middleware works (just warns); rename is on the follow-up list.
- `eslint` key in `next.config.*` is no longer recognized (already removed).

## React Server vs Client Components

- **Server Components by default** — no `"use client"` unless you need state, effects, browser APIs, or event handlers.
- Data fetching (Medusa calls) belongs in Server Components.
- Keep `"use client"` boundaries narrow — push interactivity to small leaf components rather than whole pages.
- Never import a Server Component from a Client Component.

## Medusa Integration Rules

- Medusa JS SDK is instantiated in `apps/storefront/src/lib/config.ts`. All Medusa calls go through it.
- Server-side data fetching uses `apps/storefront/src/lib/data/*` modules. Prefer these over ad-hoc `fetch()`.
- Cart state is stored server-side on Medusa; the client uses cookies to persist the cart ID (`_medusa_cart_id`).
- **Publishable API Key** must be set in env (`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`) and attached to the Sales Channel the storefront serves. The initial seed creates one automatically.
- **Regions** drive pricing, taxes, and available payment/shipping methods. Add regions via the admin UI before going live in a new market.

## Component Conventions

- **UI primitives** — reuse `@medusajs/ui` before rolling your own. The starter already uses it heavily.
- **Feature modules** live under `apps/storefront/src/modules/{cart,checkout,products,...}`. Keep domain logic there; keep primitives dumb.
- Prefer **composition over boolean props** — see the `vercel-composition-patterns` skill.
- Favor React 19 APIs (`use`, `useOptimistic`, `useFormStatus`) over hand-rolled equivalents.

## Testing Policy

- **Unit tests** (Vitest) for utils and pure hooks — colocate as `*.test.ts(x)` next to the file. _(Re-adding post-migration; the Shopify-era vitest setup was removed.)_
- **E2E tests** (Playwright) for critical user flows: browse → PDP → add to cart → checkout hand-off.
- **Do not mock Medusa** in integration tests — hit a real dev backend. Mocks silently diverge from schema changes.
- Run `pnpm check` before every commit. Husky + lint-staged (configured at repo root) handle formatting/linting at commit time.

## Accessibility

- **Target: WCAG 2.1 AA.**
- Visible focus indicators on all interactive elements.
- Semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`).
- `alt` text on every image (from Medusa's image metadata).
- Keyboard-navigable mega menu, cart drawer, and variant pickers.
- Respect `prefers-reduced-motion` on carousels/animations.

## Performance

- Use `next/image` for all product images; set `width`/`height` from the Medusa response.
- Cache Medusa responses via Next's `fetch` cache semantics — consult `node_modules/next/dist/docs/` for the current API.
- Target Core Web Vitals green. Run Lighthouse before shipping any non-trivial page.

## Critical Rules — read before writing or modifying code

These rules are non-negotiable. They keep this codebase clean, small, and maintainable for years. If a rule conflicts with adopted vendor code, the rule wins on the next touch.

### No comments

- Default: **zero comments**. None.
- Only exception: a **single-line** comment that captures a non-obvious WHY — a hidden constraint, a workaround for a specific upstream bug, an invariant the type system cannot express. If removing the comment wouldn't confuse a future reader, do not write it.
- Never write comments that explain WHAT the code does — names speak for themselves.
- Never reference tasks, fixes, callers, issue numbers, dates, authors, or "TODOs". That belongs in the commit message and the PR description, not in source.
- Never write multi-line `/** ... */` JSDoc blocks. If a function needs documentation longer than its name, the function is doing too much — split it.
- Preserve only: license headers (legal), `// eslint-disable-*`, `// @ts-expect-error|ignore|nocheck` (with a one-line reason), `/// <reference />`, `/* webpackChunkName */` and similar tooling directives.
- When you touch a file with stale comments from the Medusa starter, strip them as part of your change.

### TypeScript discipline

- **`any` is banned.** Use `unknown` and narrow, or model the type properly.
- **`@ts-ignore` is banned.** Use `@ts-expect-error` with a one-line reason if a real escape hatch is unavoidable.
- `next.config.ts` currently has `typescript: { ignoreBuildErrors: true }` inherited from the starter. This is a temporary regression — every module we refactor must pass `tsc --noEmit`, and we lift the flag once the storefront is clean.
- Prefer narrow types at module boundaries. Wide types (`Record<string, any>`, `object`) require justification.

### Code structure

- Server Components by default; `"use client"` only when state/effects/browser APIs/event handlers are used. Keep client islands small.
- Domain logic lives in `src/modules/<feature>/`. Cross-cutting helpers in `src/lib/util/`. Server data fetching in `src/lib/data/`. Constants in `src/lib/constants.tsx`.
- One responsibility per function. If a function does X _and_ Y, split it.
- Composition over boolean prop proliferation. If a component grows three flags, refactor before adding a fourth.
- No dead code: unused exports, params, files, dependencies — delete them.
- No half-finished implementations. If you can't finish, don't merge.
- No defensive validation for cases that cannot happen. Trust internal callers; validate only at system boundaries (user input, external APIs).

### Naming

- Identifiers describe **intent**, not type: `selectedRegion`, not `regionObj`.
- Booleans read as predicates: `isReady`, `hasError`, `canCheckout`.
- No abbreviations unless idiomatic (`url`, `id`, `db` are fine; `usrCfg`, `lblTxt` are not).
- Files: `kebab-case` for routes/modules, `PascalCase` for components only when the file _is_ the component.

### Reuse first

Before writing a new utility, component, or hook, search:

```bash
rg --type ts <thing>
```

If something close exists, extend it. Don't fork.

### Style

- ESLint 9 flat config per workspace. Starter-era rules are temporarily warnings — they tighten back to errors as we refactor each module.
- Tailwind class order is managed by `prettier-plugin-tailwindcss` — don't fight it.
- Prettier: 2-space indent, double quotes, semicolons, trailing commas (es5), 80-col print width.

## Deployment

- **Backend** — see `apps/backend/DEPLOY.md`. Target: Hetzner CX32 + Coolify. Not yet provisioned; local only.
- **Storefront** — Vercel project already linked; Root Directory = `apps/storefront`. Needs env vars set before next production deploy will work.

## Installed Skills

Skills in `.claude/skills/`:

- `vercel-react-best-practices` — React/Next performance patterns
- `next-best-practices` — Next.js file conventions & patterns
- `vercel-composition-patterns` — Component composition
- `web-design-guidelines` — UI/UX/accessibility audit
- `deploy-to-vercel` — Vercel deployment workflow
- `vercel-cli-with-tokens` — Vercel CLI auth
