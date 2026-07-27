# API_MAP

Every API surface in the repo. Storefront consumes Medusa's Store API through the
JS SDK (`lib/data/*`); the backend adds a few **custom** routes; catalog-admin
talks to Medusa's Admin API. See [DATA_FLOW](DATA_FLOW.md) for sequences.

## Conventions (backend custom routes)

- File-based: `apps/backend/src/api/{store,admin}/<path>/route.ts`, exporting
  `GET`/`POST`/… handlers.
- **Contracts** (request/response shapes) are Zod schemas in
  `src/api/_shared/contracts.ts` — never inline in the route.
- **Validation, auth, security headers, body-size limits** are declared centrally
  in `src/api/middlewares.ts` (`defineMiddlewares`), matched by path. Handlers read
  `req.validatedBody` / `req.validatedQuery` and trust them.
- Errors funnel through `src/api/_shared/logging.ts` (`logRouteError`).
- Security headers (CSP, X-CTO, X-Frame, Referrer-Policy, Permissions-Policy, HSTS
  in prod) are applied to `/*`, `/store/*`, `/admin/*`, `/auth/*`.

## Backend — custom store routes

### `GET /store/compatible-accessories`

- **Purpose:** resolve accessory (battery/charger/…) product identifiers compatible
  with a tool platform.
- **Auth:** none beyond the storefront publishable key.
- **Query (validated by `CompatibleAccessoriesQuerySchema`):** `platform`,
  `types` (accessory kinds). Transformed via `validateAndTransformQuery`.
- **Response:** identifiers grouped by `AccessoryKind` (`{ battery: string[],
charger: string[], … }`) — **ids/handles only**. The storefront then fetches full
  pricing through the standard `/store/products` endpoint (region context handled by
  the SDK).
- **Provider:** `src/api/store/compatible-accessories/route.ts` (paginates
  `query.graph` over published products, page size 200).
- **Consumer:** `src/lib/data/compatible-accessories.ts` → PDP
  `modules/products/components/compatible-accessories`.

## Backend — custom admin routes (dev-only)

Both hard-return **503 in production** and are gated by Medusa policies.

### `POST /admin/ai-edit/chat`

- **Purpose:** conversational assistant proposing product title/description/image
  edits.
- **Auth:** admin (`session|bearer|api-key`), policy `product:read`. Body limit 32kb.
- **Body (`AiChatBodySchema`, `.strict()`):** `product_id`, `message` (≤2000),
  `history[]` (≤20 of `{role, text}`).
- **Response:** `{ reply: string, proposal?: AiProposal }` where `AiProposal` is a
  discriminated union on `kind`: `description` | `title` | `image_edit`.
- **Route:** `src/api/admin/ai-edit/chat/route.ts`.

### `POST /admin/ai-edit/apply`

- **Purpose:** apply an accepted proposal to the product.
- **Auth:** admin, policy `product:update`. Body limit 64kb.
- **Body (`AiApplyBodySchema`):** `product_id`, `proposal` (same union).
- **Route:** `src/api/admin/ai-edit/apply/route.ts`.

## Backend — health

### `GET /ready`

- Liveness/readiness probe. `src/api/ready/route.ts`. Used by Coolify/health checks.

## Backend — Medusa Store API (consumed, not authored)

The storefront uses Medusa's built-in Store API via the JS SDK. All access is
wrapped in `src/lib/data/*`. Key endpoints in play:

| Endpoint (Store API)                                           | Storefront wrapper                                 |
| -------------------------------------------------------------- | -------------------------------------------------- |
| `GET /store/products`                                          | `lib/data/products.ts` (`listProducts`, by-handle) |
| `GET /store/product-categories`                                | `lib/data/categories.ts`, `categories-tree.ts`     |
| `GET /store/collections`                                       | `lib/data/collections.ts`                          |
| `GET /store/regions`                                           | `lib/data/regions.ts`                              |
| `POST /store/carts` + line-item/promotion/shipping/payment ops | `lib/data/cart.ts`                                 |
| `GET /store/orders`                                            | `lib/data/orders.ts`                               |
| `/store/customers`, addresses, auth                            | `lib/data/customer.ts`, `cookies.ts`               |
| fulfillment / shipping options                                 | `lib/data/fulfillment.ts`                          |
| payment sessions                                               | `lib/data/payment.ts`                              |

Every request carries the publishable key and an injected `x-medusa-locale` header
(SDK wrapper in `lib/config.ts`), and a 12s timeout.

## Storefront — route handlers (Next API)

### `POST /api/revalidate`

- **Purpose:** on-demand Next cache invalidation (called by the backend after
  catalog changes).
- **Auth:** `x-revalidate-secret` header, **constant-time** SHA-256 compare against
  `REVALIDATE_SECRET` (must be ≥32 chars or the route 503s).
- **Body:** `{ tags?: string[] }` — allowlisted to `products`, `categories`,
  `collections`, `compatible-accessories`; defaults to all four. Invalid/empty/over-
  length tag sets → 400.
- **Response:** `{ revalidated: string[] }`; `Cache-Control: no-store`.
- **Route:** `src/app/api/revalidate/route.ts`. Uses `revalidateTag(tag, "max")`.

### `GET /api/product-feed`

- **Purpose:** product feed (e.g. for merchant/marketing ingestion).
- **Contract/shape:** `modules/store/lib/product-feed-contract.ts` +
  `product-feed.ts`.
- **Route:** `src/app/api/product-feed/route.ts`.

## catalog-admin — Medusa Admin API (client)

catalog-admin **calls** Medusa's standard Admin API (no backend code added).

- **Bridge:** `src/lib/medusaAdmin.ts` (`call<T>()` helper) +
  `src/lib/toMedusaProduct.ts` (builds the v2 product payload from SQLite).
- **Auth:** HTTP Basic — `Authorization: Basic base64(<CATALOG_MEDUSA_ADMIN_KEY>:)`.
- **Config:** `CATALOG_MEDUSA_ADMIN_URL`, `CATALOG_MEDUSA_ADMIN_KEY` (publish is
  disabled if unset).
- **Operations used:** resolve sales channel / shipping profile / categories;
  look up product by **handle**; `POST /admin/products` (create) or
  `POST /admin/products/{id}` (update). Always **dry-run first**, then explicit
  confirm. Category mapping is by Medusa `handle` (no fuzzy match). Full flow:
  `apps/catalog-admin/PUBLISH.md`.

### catalog-admin internal route

- `GET|POST /bulk/export` (`src/app/bulk/export/route.ts`) — Medusa export table
  data for the bulk view. Server actions (`products/actions.ts`,
  `specs-normalization/workbench/actions.ts`) perform in-app mutations against the
  SQLite catalog.

## Adding a new backend endpoint (checklist)

1. Create `src/api/<store|admin>/<path>/route.ts`.
2. Define request/response Zod schemas in `src/api/_shared/contracts.ts` (export
   both the schema and the inferred type).
3. Register the matcher in `src/api/middlewares.ts` with validation
   (`validateAndTransformBody/Query`), auth (`authenticate`), policies, and any
   body-size limit.
4. Use `logRouteError` for failures.
5. Add a `lib/data/*` consumer on the storefront if it's a store route.
6. Update this file and [DATA_FLOW](DATA_FLOW.md).
