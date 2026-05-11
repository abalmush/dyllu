# DYLLU

A custom Shopify headless storefront built with Next.js 16 (App Router) and deployed on Vercel.

## Stack

- **Next.js 16** (App Router, React 19, Turbopack)
- **Tailwind CSS 4**
- **Shopify Storefront API** via `@shopify/storefront-api-client` + `@shopify/hydrogen-react`
- **Zustand** (persisted) for cart state
- **Vitest** (unit) + **Playwright** (e2e)
- **GraphQL Codegen** for typed Storefront API queries

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your-storefront-access-token
SHOPIFY_ADMIN_ACCESS_TOKEN=your-admin-access-token
```

### 3. Generate Shopify types

After configuring credentials:

```bash
npm run codegen
```

This populates `src/types/` with types derived from the live Storefront API schema.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:4000](http://localhost:4000).

## Scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start Next dev server (Turbopack) |
| `npm run build`        | Production build                  |
| `npm run start`        | Run production build locally      |
| `npm run lint`         | ESLint                            |
| `npm run typecheck`    | TypeScript type-check (no emit)   |
| `npm run test`         | Vitest unit tests (run once)      |
| `npm run test:watch`   | Vitest watch mode                 |
| `npm run test:e2e`     | Playwright e2e suite              |
| `npm run format`       | Prettier write                    |
| `npm run format:check` | Prettier check                    |
| `npm run codegen`      | Generate Shopify GraphQL types    |
| `npm run check`        | Lint + typecheck + unit tests     |

## Project Structure

```
src/
  app/              Next.js App Router routes
    products/       Product detail & listing
    collections/    Collection pages
    cart/           Cart page
  components/
    ui/             Shared UI primitives
    cart/           Cart-related components
    product/        Product cards, galleries, selectors
    layout/         Header, footer, navigation
  lib/
    shopify/        Storefront client + GraphQL queries
    hooks/          Custom hooks (e.g., useCart)
    utils.ts        Formatting, class-name helpers
  types/            Generated Shopify GraphQL types
  test/             Vitest setup
e2e/                Playwright specs
```

## Deployment

Hosted on **Vercel**. Every push gets a preview URL; `main` deploys to production. See `.claude/skills/deploy-to-vercel/` for the deployment workflow.

## Notes

- **Next.js 16** has breaking changes vs. earlier versions. Consult `node_modules/next/dist/docs/` before writing Next-specific code.
- Default to **Server Components**; reach for `"use client"` only when state, effects, or browser APIs are required.
- Keep Shopify Storefront calls server-side where possible.
- Run `npm run codegen` after editing anything in `src/lib/shopify/queries.ts`.
