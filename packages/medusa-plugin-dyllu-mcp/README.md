# DYLLU MCP

Governed MCP tools for DYLLU managers. The DYLLU catalog remains the source of
truth; an MCP client supplies the LLM.

For operation, onboarding, ChatGPT setup, and tool development, read
[`docs/dyllu-mcp.md`](../../docs/dyllu-mcp.md).

## Implemented scope

- Read, search, and count products
- Analyze stored 1C comparisons without calling 1C
- Receive fresh 1C data only through a separate explicit tool
- List orders by DYLLU calendar date and read complete order information
- Report daily order totals and order exceptions
- Audit catalog quality and report inventory exceptions
- Propose a product-description change without publishing it
- Propose up to 20 independent product-description corrections
- Propose an exact product-variant base-price change in MDL
- List and control sales with exact product-variant prices
- List and control product category assignments
- List and control promotion status
- List returns, request exact order-item returns, and cancel unreceived returns
- Publish only after explicit manager confirmation, with the exact stored
  proposal content hash
- Immutable before/after revisions and audit events
- Rollback through a new proposal
- Per-user capabilities and admin-only grant management
- Auth0 OAuth access-token validation, immutable DYLLU-user mapping,
  session-to-user binding and rate limits

Storefront-layout changes are intentionally outside the first vertical slice.

## Capabilities

- `capability.manage`
- `order.read`
- `product.read`
- `sale.read`
- `sale.update`
- `sale.rollback`
- `inventory.read`
- `merchandising.read`
- `merchandising.update`
- `merchandising.rollback`
- `promotion.read`
- `promotion.update`
- `promotion.rollback`
- `return.read`
- `return.create`
- `return.cancel`
- `product_content.update`
- `product_price.update`
- `product.rollback`
- `homepage_draft.update`
- `homepage.publish`
- `audit.read`
- `one_c_sync.read`
- `one_c_sync.refresh`

Homepage capabilities are reserved for a later workflow and grant no tools yet.

The plugin is disabled unless its module option `enabled` is `true`. A user ID
listed in `bootstrapUserIds` receives all capabilities and can manage stored
grants through:

- `GET /admin/dyllu-mcp/users/:id/capabilities`
- `PUT /admin/dyllu-mcp/users/:id/capabilities`

Permission changes are not exposed as MCP tools.

## MCP endpoint

`GET`, `POST` and `DELETE /mcp` implement stateful Streamable HTTP. Each
session is permanently bound to the DYLLU user authenticated during
initialization.

The endpoint requires an Auth0 OAuth access token with:

- audience equal to the configured MCP resource URI
- `azp` (Auth0 profile) or `client_id` (RFC 9068 profile) equal to a
  configured static OAuth client ID
- scope `mcp:connect`
- custom claim `https://dyllu.md/medusa_user_id`

The custom claim must contain the immutable ID of an active DYLLU Admin user.
Authorization is then evaluated from that user's stored MCP capabilities.
Permission changes remain available only through authenticated DYLLU Admin
routes.

The in-memory MCP session registry requires a single application instance or
verified sticky routing.

MCP clients must require approval for the destructive publish tools. The server
also rejects a publish call unless `confirmed_content_hash` matches the exact
stored proposal.

## Activation gate

Do not enable this package in production until these facts are reviewed:

- actual backend plugin/module configuration
- bootstrap manager user ID
- database migration backup and rollback
- public MCP URL, Auth0 issuer, resource URI and static OAuth client
- load-balancer session routing
- distributed rate limiting
- health checks for backend, Admin and storefront

The backend registers this package with `enabled: false`. Enabling it requires a
separate, reviewed production configuration change.
