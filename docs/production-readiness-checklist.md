# DYLLU Storefront Production Readiness Checklist

Updated: 2026-07-11

## Verified now

- [x] Storefront production build completes with `pnpm --filter @dyllu/storefront build`
- [x] Storefront typecheck passes with `pnpm --filter @dyllu/storefront typecheck`
- [x] Homepage, store, contact, delivery, returns, terms, privacy, brands, cart, preview, and account routes are present
- [x] Direct `/checkout?step=address` no longer falls into a 404 when the cart is empty; it redirects back to `/cart`
- [x] New public info pages exist:
  - `/contact`
  - `/livrare`
  - `/returnari`
  - `/termeni`
  - `/confidentialitate`
  - `/branduri`
- [x] Shared navigation and footer no longer point to missing pages
- [x] Legacy missing links are no longer referenced by the live UI:
  - `/customer-service`
  - `/content/privacy-policy`
  - `/content/terms-of-use`
  - `/account/wishlist`
- [x] Shared contact details now use DYLLU-branded public contact copy
- [x] Store search now works through `/store?q=...`
- [x] Sale navigation now works through `/store?on_sale=true`
- [x] “Noutăți” navigation now uses `/store?sortBy=created_at`
- [x] Wishlist/favorite entry points were removed from the live shell and product cards until a real implementation exists
- [x] Newsletter form no longer fakes a successful subscription; it opens a real email handoff
- [x] Core public copy and metadata were translated to Romanian across the main storefront and account/order flows
- [x] Preview page header and checkout labels were translated to Romanian
- [x] `robots.txt`, `sitemap.xml`, and `icon.svg` are present

## Verified route behavior on localhost

- [x] `200 /`
- [x] `200 /store`
- [x] `200 /contact`
- [x] `200 /livrare`
- [x] `200 /returnari`
- [x] `200 /termeni`
- [x] `200 /confidentialitate`
- [x] `200 /branduri`
- [x] `200 /cart`
- [x] `307 /checkout?step=address` when no cart is available
- [x] `200 /preview`
- [x] `200 /account`
- [x] `200 /account/orders`
- [x] `200 /account/addresses`
- [x] `200 /account/profile`

## Content and UX decisions shipped

- [x] Payment language across the storefront now matches the current implementation
  - no public MAIB / Apple Pay / Google Pay claims in the live shell
  - payment is described as confirmed during order processing
- [x] Footer and utility-bar links are aligned to existing public pages
- [x] Home page has a real `h1`
- [x] Preview page remains non-indexed

## Remaining launch notes

- [ ] `pnpm --filter @dyllu/storefront lint` still reports warnings
  - mostly pre-existing `react-hooks/set-state-in-effect`, `no-explicit-any`, and similar cleanup items
  - current lint pass has warnings only, not blocking errors
- [ ] Build still prints a local development warning for `/cart` being dynamic because it uses `cookies`
  - this does not block the production build
  - route is emitted as dynamic, which is expected for cart behavior
- [ ] Build still prints Cloudflare/local Durable Object warnings about `NEXT_CACHE_DO_QUEUE`
  - this is a local build/runtime warning, not a storefront route failure
- [ ] Next.js warns that `middleware` should migrate to `proxy`
  - not a release blocker today, but worth scheduling before a future framework upgrade
- [ ] Account dashboard pages depend on customer session state
  - when not logged in, account surfaces fall back to the auth flow rather than behaving like public pages
- [ ] Product import, catalog completeness, and real merchandising data still need to be finalized in parallel work

## Recommended next steps before release

1. Run a final manual browser pass with a populated cart and a logged-in customer account.
2. Re-test checkout end to end after the real product import is completed.
3. Decide whether to keep or suppress the remaining lint warnings before launch.
4. Confirm production contact data one last time before DNS cutover.
