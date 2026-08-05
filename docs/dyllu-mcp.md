# DYLLU MCP runbook

This document is the start point for DYLLU MCP work. It covers operation,
security, user access, ChatGPT setup, and tool development.

Do not put passwords, client secrets, access tokens, or production database
values in this file.

## Core rules

- The DYLLU catalog is the source of truth.
- CSV and stored 1C comparison data are references for issue detection.
- A manager makes the final decision for each write.
- A write starts as a proposal. It does not publish data.
- Publication needs a second, explicit confirmation.
- Each proposal, publication, revision, permission change, and denied action is
  audited.
- Each manager uses a separate DYLLU Admin user and a separate Auth0 user.
- Give each user only the capabilities that the user needs.
- Do not expose permission changes as MCP tools.
- User-facing tool names, descriptions, and results must say DYLLU. They must
  not say Medusa.

The code can use framework names and legacy identifiers where they are required
for compatibility. The access-token claim
`https://dyllu.md/medusa_user_id` is one such identifier. Do not rename it
without a compatible migration.

## How the service works

The LLM runs in ChatGPT or another MCP client. The DYLLU backend does not run an
LLM. It exposes structured tools and controls access.

The request flow is:

1. The manager selects the DYLLU plugin in ChatGPT.
2. ChatGPT sends the manager to Auth0.
3. Auth0 verifies the manager and issues an OAuth access token.
4. ChatGPT sends the token to `https://api.dyllu.md/mcp`.
5. The backend verifies the issuer, audience, client ID, scope, signature, time,
   and DYLLU-user claim.
6. The claim maps the request to one active DYLLU Admin user.
7. The application checks the required DYLLU capability for every tool call.
8. The application reads data or runs the governed proposal workflow.
9. The backend writes audit data for governed actions and access failures.

The endpoint uses stateful MCP Streamable HTTP. A session is permanently bound
to the user who authenticated it. The current session registry is in memory.
Production must use one backend instance or verified sticky routing.

The endpoint has a 128 KB body limit and a per-user rate limit of 120 requests
per minute. Private responses use `Cache-Control: no-store`.

Order date terms use `Europe/Chisinau`. Product base-price actions use an
exact variant and MDL amount.

## Main code paths

| Purpose | Path |
| --- | --- |
| Plugin overview | `packages/medusa-plugin-dyllu-mcp/README.md` |
| Backend registration | `apps/backend/medusa-config.ts` |
| Environment parsing | `apps/backend/src/config/environment.ts` |
| OAuth verification | `packages/medusa-plugin-dyllu-mcp/src/auth/auth0-access-token-verifier.ts` |
| HTTP security | `packages/medusa-plugin-dyllu-mcp/src/api/middlewares.ts` |
| Tool registration | `packages/medusa-plugin-dyllu-mcp/src/mcp/server.ts` |
| Domain types and capabilities | `packages/medusa-plugin-dyllu-mcp/src/domain/types.ts` |
| Application rules | `packages/medusa-plugin-dyllu-mcp/src/application/product-change-application.ts` |
| Application ports | `packages/medusa-plugin-dyllu-mcp/src/application/ports.ts` |
| Infrastructure wiring | `packages/medusa-plugin-dyllu-mcp/src/infrastructure/create-application.ts` |
| Capability API | `packages/medusa-plugin-dyllu-mcp/src/api/admin/dyllu-mcp/users/[id]/capabilities/route.ts` |
| Governance storage | `packages/medusa-plugin-dyllu-mcp/src/modules/governance` |
| Production rollout | `apps/backend/DEPLOY.md` |

## Identity and access records

One manager has three separate records. Do not mix them.

### 1. DYLLU Admin user

This is the application user in DYLLU Admin, under **Settings > Users**. It is
the authorization identity and the audit actor.

- The user must be active.
- Its immutable ID starts with `user_`.
- A customer account is not a valid MCP user.
- Do not share one Admin user between managers.

For a first user or recovery, the backend command is:

```bash
pnpm db:create-user -e manager@example.com -p '<strong-password>'
```

Use the Admin UI for normal onboarding.

### 2. Auth0 user

This record is in the Auth0
`Username-Password-Authentication` database connection. It stores login
credentials and email verification state.

- Use a real email address that can receive the Auth0 verification email.
- Use the same email as the DYLLU Admin user when possible.
- The email is for login and review. It is not the identity mapping key.
- The current login Action requires `email_verified=true`.
- Do not share one Auth0 user between managers.

### 3. DYLLU capability grants

Normal grants are stored in the DYLLU database table
`dyllu_mcp_capability_grant`. A row contains the DYLLU user ID, capability,
granting user, and timestamps. The user and capability pair is unique.

Users listed in `DYLLU_MCP_BOOTSTRAP_USER_IDS` receive all capabilities
without normal grant rows. Use bootstrap access only for recovery and initial
administration. Do not add normal managers to it.

Permission changes use authenticated DYLLU Admin routes:

- `GET /admin/dyllu-mcp/users/:id/capabilities`
- `PUT /admin/dyllu-mcp/users/:id/capabilities`

The caller must be an active DYLLU Admin user. The caller must also have
`capability.manage`. A PUT request replaces the complete capability list. It
is not a partial update.

### Auth0 to DYLLU mapping

The backend requires this access-token claim:

```text
https://dyllu.md/medusa_user_id
```

Its value must be the immutable `user_...` ID of the active DYLLU Admin user.

Current onboarding used Auth0 `app_metadata.medusa_user_id`. The deployed
Auth0 Post Login Action reads user metadata and writes the namespaced token
claim. The Auth0 Action is tenant configuration and is not stored in this
repository. Inspect the deployed Action before a change. Confirm that the final
access token contains the exact claim above.

Do not put this mapping in customer metadata or in DYLLU Admin user metadata.

## Current OAuth configuration

These values are identifiers. They are not secrets.

| Item | Current value |
| --- | --- |
| MCP URL and Auth0 API identifier | `https://api.dyllu.md/mcp` |
| OAuth resource metadata | `https://api.dyllu.md/.well-known/oauth-protected-resource` |
| Auth0 tenant | `https://dev-a7fbq55qkc1lgp8k.eu.auth0.com/` |
| Auth0 API permission | `mcp:connect` |
| ChatGPT Auth0 application | `ChatGPT DYLLU MCP` |
| Application type | Regular Web Application, third-party |
| API access policy | Per-app authorization |
| Dynamic Client Registration | Disabled |
| Database connection | `Username-Password-Authentication` |

The ChatGPT application has user-delegated access to `mcp:connect`. The
database connection is promoted to the domain level because the application is
third-party. Default third-party access stays unauthorized. The application has
an explicit grant.

All managers use this one ChatGPT OAuth application. Each manager still has a
separate Auth0 login and a separate mapped DYLLU Admin user. A new OAuth
application is not required for each manager.

Copy the current client ID and client secret from Auth0 when they are required.
Do not copy them into this repository. The client secret belongs in ChatGPT and
Auth0. It does not belong in the DYLLU backend or Coolify.

### OAuth scope and DYLLU capabilities

These are separate access layers.

- Auth0 gives the connector the OAuth scope `mcp:connect`.
- DYLLU gives the mapped user capabilities such as `order.read` or
  `sale.update`.
- Do not add DYLLU capabilities as Auth0 scopes.
- A token with `mcp:connect` can reach the MCP service. It cannot bypass a
  DYLLU capability check.

The backend uses these environment variables:

- `DYLLU_MCP_ENABLED`
- `DYLLU_MCP_AUTH0_ISSUER`
- `DYLLU_MCP_RESOURCE`
- `DYLLU_MCP_ALLOWED_CLIENT_IDS`
- `DYLLU_MCP_BOOTSTRAP_USER_IDS`

If any MCP setting is present, the backend requires the complete set. Follow
`apps/backend/DEPLOY.md` for a configuration or activation change. Such a
change needs a separate production review.

## Add a manager

Use this sequence.

1. In DYLLU Admin, open **Settings > Users**.
2. Create a separate user for the manager.
3. Confirm that the user is active.
4. Copy the immutable `user_...` ID from the user page URL or API response.
5. In Auth0, open **User Management > Users**.
6. Create a user in `Username-Password-Authentication`.
7. Use the manager's real email. Use the same email as DYLLU Admin when
   possible.
8. Set the Auth0 application metadata field used by the deployed Post Login
   Action. Current onboarding uses:

```json
{
  "medusa_user_id": "user_..."
}
```

9. Send the Auth0 verification email.
10. Confirm that Auth0 shows the email as verified.
11. Grant the minimum required DYLLU capabilities.
12. Ask the manager to connect DYLLU in ChatGPT and sign in.
13. Run `get_my_access`. Confirm the DYLLU user and capability list.
14. Test one allowed read tool.
15. Test one denied tool when the role has an expected restriction.

Do not use a customer record. Do not use a shared account. Do not grant
`capability.manage` unless the manager must manage other users.

## Read or change user capabilities

Use an existing authenticated DYLLU Admin session or bearer token. Do not store
the token in shell history, documentation, or Git.

Read the current list before each update:

```bash
curl --fail-with-body \
  --header "Authorization: Bearer $DYLLU_ADMIN_ACCESS_TOKEN" \
  "https://api.dyllu.md/admin/dyllu-mcp/users/$DYLLU_TARGET_USER_ID/capabilities"
```

Replace the complete list:

```bash
curl --fail-with-body \
  --request PUT \
  --header "Authorization: Bearer $DYLLU_ADMIN_ACCESS_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{"capabilities":["product.read","order.read","audit.read"]}' \
  "https://api.dyllu.md/admin/dyllu-mcp/users/$DYLLU_TARGET_USER_ID/capabilities"
```

The update fails closed if the target user is missing or inactive. It creates a
`capabilities.updated` audit event with before and after values.

### Current capabilities

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

The homepage capabilities are reserved. They do not expose tools.

### Example access sets

These are examples. Review each real user.

Read-only operations:

- `product.read`
- `order.read`
- `sale.read`
- `inventory.read`
- `merchandising.read`
- `promotion.read`
- `return.read`
- `audit.read`
- `one_c_sync.read`

Catalog manager:

- all needed read capabilities
- `product_content.update`
- `product_price.update`
- `product.rollback`
- `merchandising.update`
- `merchandising.rollback`

Commerce manager:

- all needed read capabilities
- `sale.update`
- `sale.rollback`
- `promotion.update`
- `promotion.rollback`
- `return.create`
- `return.cancel`

MCP access administrator:

- `capability.manage`

## Remove a manager

1. Replace the user's capability list with an empty list.
2. Block the Auth0 user to stop new logins.
3. Deactivate the DYLLU Admin user.
4. Confirm the permission audit event.

Removing capabilities stops later tool calls. Blocking Auth0 alone does not
cancel an access token that Auth0 already issued. Do not use bootstrap access
for normal users because normal grant removal does not remove bootstrap access.

## Configure ChatGPT

Use the current OpenAI plugin flow:

1. Open ChatGPT settings.
2. Open **Security and login** and enable **Developer mode**.
3. Open `https://chatgpt.com/plugins`.
4. Add a custom plugin.
5. Set the server URL to `https://api.dyllu.md/mcp`.
6. Set authentication to OAuth.
7. Open the advanced OAuth settings.
8. Set client registration to **User-Defined OAuth Client**.
9. Copy the client ID and client secret from the Auth0 application
   `ChatGPT DYLLU MCP`.
10. Set the token endpoint authentication method to
    `client_secret_post`.
11. Select `mcp:connect` as the default scope.
12. Leave base scopes empty unless the current ChatGPT form requires a value.
13. Copy the exact callback URL shown by ChatGPT.
14. Add that exact URL to **Allowed Callback URLs** in the Auth0 application.
15. Create and install the plugin.
16. Sign in with the manager's Auth0 user.
17. Start a new Work chat and select DYLLU with `@`.
18. Ask DYLLU to run `get_my_access`.

Do not enable Dynamic Client Registration. DYLLU uses a known Auth0
application. If ChatGPT reports that DCR is disabled, select
**User-Defined OAuth Client**.

The ChatGPT callback URL can be different for each connector. Do not copy an
old callback URL. Use the exact value shown in the current form.

After new tools are deployed, use **Reconnect** in the ChatGPT plugin settings.
Then start a new Work chat. Delete and recreate the plugin only if reconnect
does not refresh the tool list.

For another MCP client, create a separate Auth0 application. Do not reuse the
ChatGPT secret. Add the new client ID to
`DYLLU_MCP_ALLOWED_CLIENT_IDS` only after the required production review.
The client must support remote Streamable HTTP and OAuth.

## Add a new MCP action

Implement one complete vertical path. Do not call DYLLU infrastructure directly
from the tool handler.

1. Define the business result and whether the tool is read-only or a write.
2. Select the exact existing capability. Add a new capability only when no
   current capability has the correct meaning.
3. Add strict, bounded domain input and output types.
4. Add or extend an application port in
   `src/application/ports.ts`.
5. Add the application method in
   `src/application/product-change-application.ts`.
6. Require an active actor and the exact capability before data access.
7. Add the infrastructure adapter. Keep framework queries outside the
   application layer.
8. Wire the adapter in `src/infrastructure/create-application.ts`.
9. Register the tool in `src/mcp/server.ts`.
10. Add unit, adapter, tool-schema, metadata, and negative-path tests.
11. Update the plugin README and this runbook when scope or access changes.

Tool inputs use strict Zod schemas. Put limits on strings, arrays, page sizes,
date ranges, and result counts. Reject unknown fields. Do not let a tool return
an unbounded catalog or order result.

Tool registration must include:

- a stable snake-case tool name
- a clear DYLLU title and description
- OAuth scope metadata for `mcp:connect`
- correct read-only and destructive annotations
- a useful output schema

Tool descriptions help the LLM select a tool. They do not provide security.
The application capability check is mandatory.

### New capability or database field

The capability enum is also in a database check constraint.

- Add the capability to `src/domain/types.ts`.
- Do not edit an applied migration.
- Add a new additive migration.
- Preserve the complete current capability list in the new constraint.
- Test migration up and down on a disposable PostgreSQL 16 database.

### Write actions

A manager request is not enough to publish a write.

1. Read the exact current target.
2. Create a proposal with before and proposed values.
3. Store the actor, reason, target version, content hash, and expiry.
4. Return a clear review result. State that nothing is published.
5. Publish only after the proposal author gives explicit confirmation.
6. Require the exact stored content hash.
7. Reject a missing, expired, stale, changed, or already used proposal.
8. Run an official DYLLU workflow or executor.
9. Store an immutable revision and audit event.
10. Implement rollback as a new proposal. Do not silently undo data.

Never let the LLM invent a product, price, SKU, order, reason, or target ID.
Resolve and show the exact target before a proposal.

## Validation

Use Node.js 22. Run these commands from the repository root:

```bash
pnpm --filter @dyllu/medusa-plugin-mcp typecheck
pnpm --filter @dyllu/medusa-plugin-mcp lint
pnpm --filter @dyllu/medusa-plugin-mcp test
pnpm --filter @dyllu/medusa-plugin-mcp build
pnpm --filter @dyllu/backend typecheck
pnpm --filter @dyllu/backend test
pnpm --filter @dyllu/backend build
pnpm audit --prod --audit-level high
git diff --check
```

For a migration, use a disposable PostgreSQL 16 database. Never use production:

```bash
MCP_MIGRATION_DATABASE_URL='postgres://...' \
  pnpm --filter @dyllu/medusa-plugin-mcp test:postgres
```

Test the normal path and relevant negative paths:

- missing authentication
- wrong issuer, audience, client, signature, or token time
- missing `mcp:connect`
- missing DYLLU user claim
- inactive DYLLU user
- missing capability
- invalid or unbounded input
- stale or expired proposal
- wrong confirmation hash
- publish by a different user
- partial workflow failure

## Release and verification

Use the normal branch, pull request, review, merge, and Coolify deployment flow.
A normal new tool must not need a new environment variable.

Before merge:

1. Review the complete branch diff against `main`.
2. Confirm that no secrets or generated files are present.
3. Run the required validation.
4. Inspect the actual CI checks for the pushed commit.

After an approved production deployment:

1. Verify container state and restart count.
2. Verify the internal health check.
3. Verify `https://api.dyllu.md/ready`.
4. Verify `https://api.dyllu.md/backend`.
5. Verify the storefront.
6. Confirm that unauthenticated `/mcp` returns 401.
7. Run `get_my_access` with an approved manager.
8. Test the new read path.
9. For a write tool, create a test proposal before any approved publish test.
10. Reconnect the ChatGPT plugin and confirm that the new tool is visible.

Follow `apps/backend/DEPLOY.md` for an MCP configuration or activation change.

## Troubleshooting

### Dynamic client registration failed

Cause: Auth0 DCR is disabled.

Action: In ChatGPT, select **User-Defined OAuth Client** and enter the current
Auth0 client ID and secret. Keep DCR disabled.

### Callback URL mismatch

Cause: The ChatGPT callback URL is not in the Auth0 application.

Action: Copy the exact callback URL from the current ChatGPT connector form into
Auth0 **Allowed Callback URLs**.

### Auth0 shows a general error

Action: Open Auth0 logs and inspect the exact failed-login event.

### A verified email is required

Cause: The Auth0 user has not verified the email.

Action: Use a real inbox and complete the Auth0 verification link.

### `invalid_token`

Check:

- issuer
- audience or resource
- allowed client ID
- RS256 signature and current signing key
- issued-at and expiry times
- bearer-token format

Some old `invalid_token` entries can come from a client retry. Match the
request ID and time before you connect a log entry to a tool failure.

### `insufficient_scope`

Cause: The access token does not contain `mcp:connect`.

Action: Check the Auth0 API grant and ChatGPT default scope. Reconnect.

### `identity_mapping_missing`

Cause: The access token does not contain
`https://dyllu.md/medusa_user_id`.

Action: Check the Auth0 user application metadata and the deployed Post Login
Action.

### Login works, but a tool is denied

Run `get_my_access`. Confirm the mapped DYLLU user and capability list. Add
only the missing approved capability.

### Access is correct, but a tool is not visible

Confirm that production runs the commit that contains the tool. Reconnect the
ChatGPT plugin and start a new Work chat.

### A publish tool returns an internal error

The proposal remains pending unless the tool reports a successful publication.
Do not assume that data changed.

Find the `dyllu_mcp.tool.failed` log with the same request ID. Check the
workflow or catalog adapter error. Do not retry publication without checking the
proposal status and the live target.

## External references

- [OpenAI plugin quickstart](https://developers.openai.com/plugins/quickstart)
- [OpenAI MCP authentication](https://developers.openai.com/api/docs/mcp#handle-authentication)
- [Auth0 verified email guidance](https://auth0.com/docs/manage-users/user-accounts/user-profiles/verified-email-usage)
- [Auth0 metadata guidance](https://auth0.com/docs/get-started/architecture-scenarios/business-to-business/authorization)
