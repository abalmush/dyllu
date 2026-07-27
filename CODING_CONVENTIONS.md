# CODING_CONVENTIONS

Conventions **actually used** in DYLLU. The normative source is
[CLAUDE.md](CLAUDE.md) (“Critical Rules”) and [AGENTS.md](AGENTS.md); this file
distills and locates them. Where they conflict, CLAUDE.md/AGENTS.md win.

## Non-negotiables (most-violated first)

- **Zero comments.** The only allowed comment is a _single line_ capturing a
  non-obvious **why** (a constraint, an upstream-bug workaround, an invariant the
  types can't express). Never explain _what_ the code does. No `/** … */` JSDoc
  blocks. No task/issue/author/date/TODO references in source. Strip stale
  Medusa-starter comments when you touch a file. (Real examples of the allowed form:
  the middleware `proxy.ts` note in `src/middleware.ts`; the timeout-rethrow note in
  `lib/config.ts`.)
- **`any` is banned.** Use `unknown` + narrowing, or model the type. Wide types
  (`Record<string, any>`, `object`) need justification.
- **`@ts-ignore` is banned.** Use `@ts-expect-error` with a one-line reason only if
  unavoidable.
- **No defensive validation for impossible cases.** Trust internal callers; validate
  only at boundaries (user input, external APIs) — with Zod.
- **No dead code / half-finished work.** Delete unused exports, params, files, deps.
- **Commits/PRs need a Jira-style id** — prefix `DYLLU-000` (git hook enforces it).
  Use the **`abalmush`** GitHub account for all git/gh operations.

## Folder structure

- **Storefront:** routes in `src/app/` (route groups `(main)`/`(checkout)`); domain
  logic in `src/modules/<feature>/`; design system in `src/components/{atoms,
molecules,organisms,templates}/`; server data in `src/lib/data/`; pure helpers in
  `src/lib/util/`; constants in `src/lib/constants.tsx`; homepage engine in
  `src/lib/homepage/`.
- **Backend:** extend only via Medusa points — `src/api/`, `workflows/`,
  `subscribers/`, `jobs/`, `links/`, `modules/`, `scripts/`. Contracts in
  `src/api/_shared/contracts.ts`, middleware in `src/api/middlewares.ts`, env in
  `src/config/environment.ts`.
- **catalog-admin:** pages in `src/app/` (colocated `_components/`, `_tabs/`,
  `actions.ts`); DB access in `src/db/`; derivation logic in `src/lib/`; UI in
  `src/components/ui/`; schema + migrations in `drizzle/`.

## Naming

- Identifiers describe **intent**, not type: `selectedRegion`, not `regionObj`.
- Booleans are predicates: `isReady`, `hasError`, `canCheckout`.
- No non-idiomatic abbreviations (`url`/`id`/`db` fine; `usrCfg` not).
- Files: `kebab-case` for routes/modules; `PascalCase` only when the file _is_ the
  component. (catalog-admin uses `PascalCase.tsx` for its `_components`; storefront
  uses `kebab-case.tsx` + folder `index.tsx` — match the app you're in.)

## Component patterns

- Server Components by default; `"use client"` only for state/effects/browser
  APIs/event handlers, kept at the leaf. Never import a Server Component into a
  Client Component.
- **Composition over boolean props.** Three flags on a component ⇒ refactor before
  adding a fourth. See the `vercel-composition-patterns` skill.
- Variants via `class-variance-authority` (`cva` + `VariantProps`); merge classes
  with `cn()` (`lib/utils.ts`). `forwardRef` + native-attribute spread on primitives.
- Reuse `@medusajs/ui` and existing atoms before rolling new primitives.
- Favor React 19 APIs (`use`, `useOptimistic`, `useFormStatus`) over hand-rolled
  equivalents.

## Hooks

- Custom hooks in `src/lib/hooks/` (`use-in-view`, `use-toggle-state`), named
  `use-*` / `useX`. Keep them small and pure; colocate feature-specific hooks in the
  module.

## Server actions

- Mutations are `"use server"` — file-level directive (see `lib/data/cart.ts`,
  catalog-admin `*/actions.ts`). Read cookies for context (cart id, auth), call the
  SDK/Admin API, then `revalidateTag`. Return plain serializable data.

## Data fetching

- Storefront: **only** through `src/lib/data/*` over the shared SDK
  (`lib/config.ts`). No ad-hoc `fetch()` to Medusa. Pass `region_id`; request exactly
  the `fields` you need. Use Next `fetch` cache tags; `cache: "no-store"` only where
  correctness demands (price-sensitive lists).
- Backend: resolve services from the container
  (`req.scope.resolve(ContainerRegistrationKeys.QUERY)`), use `query.graph` with
  explicit `fields`/`filters`/`pagination`.

## Bulk & batch data operations

For any operation over many DB/catalog records (search, modify, migrate, normalize,
delete): use the AI to **plan and generate a deterministic operation**; execute it
with queries / Medusa workflows / scripts. **Never pull the full dataset into
context to filter it in memory.** Goal: minimal context, minimal API traffic, safe
deterministic execution.

**Required sequence:** define filter → define transform → request only the fields
the op needs → **count matches without loading** → preview ≤10 representative
records → **dry run** → present count + before/after → execute in batches → verify
via counts + a small sample → return a concise report.

**Query efficiency:** push filtering to the server (DB filters, indexed fields, API
query params, module-service filters, workflows, search indexes). Select only
required fields — for a metadata edit, usually just record id + the one metadata
property (+ version timestamp if needed). No descriptions/images/variants/prices
unless required.

**Batch execution (never unbounded):** configurable `batchSize` + concurrency;
cursor- or stable-ID pagination (not offset on a changing set); retry limits;
rate-limit handling; resumable progress (store/report last cursor); idempotent
transforms.

**Safety gates:** every bulk op supports `dryRun`, `batchSize`, `maximumRecords`,
`operationId`, structured logging, failure reporting, safe restart, idempotency.
Count matches first; **stop if the count exceeds `maximumRecords`**; never
auto-broaden the filter; no destructive change on an ambiguous condition.

**Metadata:** preserve every unrelated property. If the target API **replaces**
(not deep-merges) nested metadata, read the existing object → merge in code → send
the complete merged object. Never overwrite a whole metadata object to change one
property unless full replacement is explicitly requested.

**Reporting:** return only `operationId`, matched, need-change, updated, skipped
(already-in-target-state), failed, batch count, duration, ≤10 failed IDs, ≤5
before/after examples. No large product arrays or raw API dumps.

**Medusa specifics:** prefer module services, Admin APIs, and core workflows;
`batchProductsWorkflow` for suitable batch product ops; write a custom workflow when
filter/validation/transform/rollback logic is project-specific; don't automate the
Admin UI when the API/workflow can do it; preserve unrelated product metadata; keep
workflows resumable and idempotent. Catalog data & migrations are **data-scope
gated** — out of scope unless the user explicitly puts data work in scope
([AGENTS.md](AGENTS.md)). Related flows: [DATA_FLOW](DATA_FLOW.md) (ingest/publish),
[API_MAP](API_MAP.md).

## Styling

- Tailwind CSS **3** on the storefront (`tailwind.config.js` + `@medusajs/ui-preset`);
  Tailwind **4** (`@tailwindcss/postcss`) in catalog-admin. Class order managed by
  `prettier-plugin-tailwindcss` — don't fight it.
- Prettier: 2-space indent, double quotes, semicolons, trailing commas (es5),
  80-col. Run `pnpm format`.

## Imports / exports

- Path aliases (storefront `tsconfig.json`): `@/*` → `./`, `@lib/*` → `lib/*`,
  `@modules/*` → `modules/*`. Prefer these over deep relative paths.
- Design-system layers are consumed via barrels (`components/atoms/index.ts`, etc.).
- `server-only` import guards server modules (`lib/data/*`, catalog-admin
  `db/client.ts`, `medusaAdmin.ts`) from leaking into client bundles.
- Prefer named exports; default exports appear for Next route/page/template files
  and some templates (existing pattern — match the neighbor file).

## Error handling

- **Boundaries validate, handlers trust.** Backend: Zod contracts (`.strict()`) at
  the edge; failures via `logRouteError` (`_shared/logging.ts`).
- Storefront: normalize SDK errors with `lib/util/medusa-error.ts`; the SDK wrapper
  re-throws timeouts as readable Errors. Route `error.tsx`/`not-found.tsx` for UI
  fallbacks.
- Secret checks are **constant-time** (see `api/revalidate`); don't replace with
  `===`.

## Accessibility (target WCAG 2.1 AA)

- Semantic landmarks (`header`/`nav`/`main`/`footer`); visible focus on all
  interactive elements; `alt` on every image (from Medusa metadata); keyboard-
  navigable mega-menu, cart drawer, variant pickers; respect
  `prefers-reduced-motion` on animation.

## Performance

- `next/image` with explicit `width`/`height`; custom loader → R2/CDN
  (`lib/util/image-loader.ts`). Cache via Next fetch semantics. Keep client islands
  small. Batch remote reads with concurrency caps (see `products.ts`). Target green
  Core Web Vitals; Lighthouse before shipping non-trivial pages.

## Security

- Security headers at both layers (`next.config.ts`, backend `middlewares.ts`):
  CSP, X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy,
  Permissions-Policy, HSTS in prod; `poweredByHeader:false` / removed `X-Powered-By`.
- Secrets validated (≥32 chars, placeholder values rejected) in
  `config/environment.ts`; never commit `.env*`; never log secrets.
- **Production config rules are binding** (AGENTS.md): don't invent env/infra;
  inventory before change; no new required prod var in one rollout; present
  facts + rollback and wait for approval before mutating production.

## TypeScript rules

- `any`/`@ts-ignore` banned (above). Narrow types at module boundaries.
- `next.config.ts` currently sets `typescript.ignoreBuildErrors:true` (starter
  regression) — every refactored storefront module must pass `tsc --noEmit`; the
  flag lifts once the storefront is clean. Don't rely on it.
- Backend/catalog-admin `typecheck` = `tsc --noEmit`. Zod (`@medusajs/framework/zod`
  on backend, `zod` in catalog-admin) is the boundary type source of truth.

## Next.js 16

Breaking vs. training data. **Before** writing Next-specific code, read
`apps/storefront/node_modules/next/dist/docs/`. Local facts: async `params`;
`src/middleware.ts` is the working file convention here (not `proxy.ts`, per an
OpenNext adapter limitation); the `eslint` key was removed from `next.config`.

## Testing

- Backend: Jest (`test:unit`, `test:integration:{http,modules}`) — hit a real dev
  backend, **don't mock Medusa**. Storefront: Playwright e2e (Vitest units being
  re-added). catalog-admin: Vitest + Playwright.
- Colocate unit tests as `*.test.ts(x)` / `*.spec.ts`. Run `pnpm check` before every
  commit (husky + lint-staged run on commit).

## Reuse first

Before writing a new util/component/hook: `rg --type ts <thing>`. If something close
exists, extend it — don't fork.
