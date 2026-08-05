# DYLLU 1C integration

This document is the durable context for work on the DYLLU 1C connection.
Read it before you test or change the connection, sync logic, Admin page, or MCP
tools.

## Current state

- The implementation is in `packages/medusa-plugin-one-c`.
- The Admin manager is at `https://api.dyllu.md/backend/one-c-connection`.
- It receives and compares data. It does not change Medusa products or prices.
- Manual receive, sync history, comparison filters, and CSV and JSON exports are
  available.
- The MCP implementation can analyze stored results. A separate MCP tool can
  receive fresh data when the MCP plugin is enabled and the user has the
  required capability.
- Automatic receive and all automatic changes are disabled.
- The connector was deployed through PR 39, PR 40, and PR 42 on 2026-08-05.

## 1C network information

The production connector uses this fixed public base URL:

```text
http://135.181.211.55/polim/hs/WebAPI
```

The engineer also supplied these test URLs:

```text
http://192.168.99.10/polim/hs/WebAPI/test
http://135.181.211.55/polim/hs/WebAPI/test
```

`192.168.99.10` is a private network address. The DYLLU production backend
cannot be assumed to have a route to it. The public address is the implemented
target.

The 1C server can restrict clients by source IP. The production backend reported
outbound IP `138.199.235.8` during successful live receives. Its static status is
not verified. Do not tell the 1C team that it is static until the hosting
configuration confirms this fact.

The connection uses plain HTTP, not HTTPS. Treat all received content as
untrusted. Do not enable scheduled receive or product and price changes until
1C supplies HTTPS or an approved secure network path.

## Fixed feed endpoints

The connector defines the URLs in
`packages/medusa-plugin-one-c/src/infrastructure/one-c-feed-client.ts`.

| Feed       | Request                                             |
| ---------- | --------------------------------------------------- |
| Batch list | `GET /pit_site_batches`                             |
| Products   | `GET /pit_site_products?batch=<number>&brand=dyllu` |
| Categories | `GET /pit_site_categories`                          |
| Brands     | `GET /pit_site_brands`                              |
| Promotions | `GET /pit_site_promo`                               |

Admin or MCP input cannot change these URLs. Redirects are rejected.

## DYLLU-only scope

The query parameter `brand=dyllu` asks 1C to filter product batches. This is not
the only filter.

The application also reads `/pit_site_brands`, finds every brand whose name is
exactly `DYLLU` after case normalization, and accepts only products whose
`BrandId` matches one of those IDs. The receive fails closed if the brands feed
has no DYLLU brand. Invalid rows are stored for review only when their source
`BrandId` is a known DYLLU brand.

Do not remove the local brand check. The remote query filter is not a security
boundary.

## Product interpretation

- 1C `id` is used as both the external product ID and comparison SKU.
- Matching against Medusa is exact and case-sensitive after Medusa SKU trim.
- Zero matches can mean that Medusa SKUs and 1C IDs use different identifiers.
- `name_ro`, then `name`, supplies the name.
- `description_ro`, then `description_ru`, supplies the description.
- Price type `05` supplies the regular MDL price.
- Numeric strings with a decimal comma are accepted.
- `balance` supplies the received stock balance.
- `hidden: true` and `deleted: true` rows are excluded.
- Duplicate 1C SKUs or duplicate Medusa SKUs are ambiguous.
- A valid 1C SKU with no exact Medusa match is `missing_medusa`.
- A single exact match is `matched`. Name, description, and MDL price
  differences are then calculated.

The current implementation does not apply category assignments from the 1C
category hierarchy.

## Receive flow

```text
Authenticated Admin action or explicit MCP request
  -> acquire distributed lock
  -> read batches, products, categories, brands, and promotions
  -> record response hashes and raw snapshots
  -> verify the DYLLU brand locally
  -> normalize products
  -> read Medusa variants
  -> compare exact SKUs
  -> store run, items, counts, errors, and audit data
  -> show or export the stored result
```

A normal MCP analysis must use the stored snapshot. It must not call 1C. Only an
explicit user request for fresh 1C data can use `receive_one_c_catalog`.
The MCP package is disabled by default. Its separate production activation gate
is documented in `packages/medusa-plugin-dyllu-mcp/README.md`.

Relevant MCP tools:

- `get_one_c_sync_status`: read the latest stored status. It does not call 1C.
- `list_one_c_product_mismatches`: read stored comparisons. It does not call 1C.
- `receive_one_c_catalog`: make a new read-only 1C call and store a snapshot.

## Admin API

All routes require an authenticated Medusa Admin user and product read policy.

| Operation             | Route                                              |
| --------------------- | -------------------------------------------------- | ----- |
| List runs             | `GET /admin/one-c-sync/runs`                       |
| Start manual receive  | `POST /admin/one-c-sync/runs`                      |
| Read one run          | `GET /admin/one-c-sync/runs/:id`                   |
| List comparison items | `GET /admin/one-c-sync/runs/:id/items`             |
| Export CSV or JSON    | `POST /admin/one-c-sync/runs/:id/export?format=csv | json` |

The item and export routes accept an optional `mapping_status` filter:
`matched`, `missing_medusa`, `ambiguous`, or `excluded`.

Exports are limited to 10,000 rows. Exports are audited. CSV output protects
against spreadsheet formula injection. Admin responses use private, no-store
headers.

## Security limits

- Three manual receives per minute per Admin actor.
- A distributed lock prevents concurrent receives.
- 25 second limit per request.
- 60 second limit for the full catalog request.
- 20 MiB maximum per response.
- 100 MiB maximum for the full catalog.
- 1,000 maximum batches.
- 100,000 maximum products in one feed response.
- Redirects are blocked.
- Feed structure and values are validated before comparison.
- Raw feed bodies stay in plugin storage. Admin and MCP read routes do not
  return them.
- Every snapshot stores its source URL, HTTP status, duration, and SHA-256
  response hash.
- Every run records the actor, trigger, timestamps, result counts, error, and
  observed outbound IP.

## Verified live results

On 2026-08-05, a fresh production receive completed with status `ready`:

- observed backend outbound IP: `138.199.235.8`
- DYLLU products missing from Medusa: `966`
- exact Medusa matches: `0`
- data differences: `0`
- rows that need review: `0`

The result proves that the public 1C feed can be read from the production
backend and that DYLLU filtering works. It does not prove that the outbound IP
is static. It also does not prove that product or price updates are safe.

The zero-match result is an open mapping issue. Compare representative Medusa
variant SKUs with 1C `id` values before any update workflow is designed.

## Known feed behavior and errors

- The categories response can be a hierarchical object or array with
  `Subgroups`. It is not always an object with an `Items` array.
- A previous parser rejected this valid shape with
  `1C categories feed has no Items array`. PR 40 fixed it.
- HTTP 503 from `api.dyllu.md` can occur during the current Coolify container
  replacement gap. During the 2026-08-05 deployments, the public service
  recovered after a few seconds. A 503 during deployment is not evidence that
  the 1C endpoint failed. Check `/ready`, `/health`, `/backend`, and the
  storefront before a new receive.
- The current deployment workflow can report success before this short
  replacement gap occurs. Do not claim zero-downtime deployment.

## Safe test procedure

1. Confirm `https://api.dyllu.md/ready` returns HTTP 200.
2. Confirm `https://api.dyllu.md/health` returns HTTP 200.
3. Confirm `https://api.dyllu.md/backend` returns HTTP 200.
4. Confirm `https://dyllu.md` returns HTTP 200.
5. Open the 1C manager while signed in to Medusa Admin.
6. Select **Receive fresh 1C data** only when the user asked for fresh data.
7. Wait for status `ready` or record the exact stored error.
8. Check the outbound IP, counts, Missing, On site, Needs mapping, and Excluded
   views.
9. Test filtered CSV and JSON exports.
10. Confirm all four public checks still return HTTP 200.

Do not test by changing products, prices, credentials, network rules, or
production data.

## Open questions before automatic sync

- Is `138.199.235.8` reserved and static in the production hosting platform?
- Can 1C provide HTTPS, a VPN, or another approved encrypted path?
- Which Medusa field must match 1C `id` if it is not the current SKU?
- Are 1C price type `05` values tax-inclusive?
- What exact stock behavior must follow from `balance`?
- Which fields can be applied automatically and which require review?
- What schedule, retry policy, approval rule, and rollback rule are required?
- How must 1C categories map to the DYLLU category model?

Keep automatic receive, price updates, product creation, and other mutations
disabled until these questions are resolved and a separate production change is
approved.
