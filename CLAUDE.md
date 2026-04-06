@AGENTS.md

# DYLLU

## Project Overview

Shopify storefront built with Next.js (App Router), hosted on Vercel.

## Tech Stack

- Next.js 16 (App Router, TypeScript, Tailwind CSS 4)
- Shopify Storefront API via `@shopify/storefront-api-client`
- `@shopify/hydrogen-react` for Shopify React components
- Zustand for cart state management
- Vercel for hosting and deployment

## Project Structure

```
src/
  app/              # Next.js App Router pages
    products/       # Product listing and detail pages
    collections/    # Collection pages
    cart/           # Cart page
  components/
    ui/             # Shared UI primitives
    cart/           # Cart-related components
    product/        # Product-related components
    layout/         # Header, footer, navigation
  lib/
    shopify/        # Storefront API client, GraphQL queries
    hooks/          # Custom hooks (useCart, etc.)
    utils.ts        # Formatting, classname helpers
  types/            # Generated Shopify types (via codegen)
  test/             # Test setup
e2e/                # Playwright E2E tests
```

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run format` — Prettier
- `npm run test` — Vitest unit tests
- `npm run test:e2e` — Playwright E2E tests
- `npm run codegen` — Generate Shopify GraphQL types

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`

## Guidelines

- Use Server Components by default, Client Components only when needed
- Keep Shopify API calls server-side when possible
- GraphQL queries live in `src/lib/shopify/queries.ts`
- Cart state is managed via Zustand store in `src/lib/hooks/use-cart.ts`
- Run `npm run codegen` after modifying GraphQL queries

## Installed Skills

Skills in `.claude/skills/`:

- `vercel-react-best-practices` — React patterns
- `deploy-to-vercel` — Vercel deployment workflow
- `vercel-composition-patterns` — Component composition
- `web-design-guidelines` — UI/UX standards
- `vercel-cli-with-tokens` — Vercel CLI auth
- `next-best-practices` — Next.js conventions
