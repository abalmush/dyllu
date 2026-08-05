# Plan: 1C Product Sync

> Source PRD: Product sync requirements agreed in the Codex task on 2026-08-05.

## Current read-only release

- Implemented: manual receive from the fixed public product, category, brand, and promo feeds.
- Implemented: stored runs, response hashes, normalized comparisons, trusted missing-product counts, history, and audited CSV or JSON export.
- Implemented: MCP access to stored comparisons and a separate explicit refresh tool with separate read and refresh permissions.
- Disabled: all DYLLU product, price, inventory, category, brand, image, and status updates.
- Disabled: scheduled receive and automatic apply.
- Release block: do not enable a mutation or schedule until the 1C service uses an approved authenticated and encrypted transport.

## User stories

- As a manager, I can receive fresh 1C data without changing Medusa.
- As a manager, I can compare 1C data with Medusa before I approve changes.
- As a manager, I can clearly see all valid 1C products that do not exist on the DYLLU site, so I can prepare and add them.
- As a manager, I can export the current run, missing-product queue, and filtered differences as CSV or JSON.
- As a manager, I can manually apply approved changes.
- As a manager, I can configure scheduled data receipt.
- As a manager, I can allow selected price changes to apply automatically.
- As a manager, I can see each sync run, item change, error, approval, and apply result.
- As an MCP user, I can analyze stored 1C data and mismatches.
- As an MCP user, I can request a fresh 1C fetch only with an explicit command.
- As an operator, I can keep 1C access, source data, approvals, and Medusa mutations protected by fail-closed security controls.

## Architectural decisions

- **Plug-in boundary**: Build a separate `@dyllu/medusa-plugin-one-c` package. Keep 1C transport, snapshots, normalization, mappings, policies, history, workflows, API routes, scheduled jobs, and Admin UI inside this plug-in. Keep the MCP plug-in separate.
- **Medusa core protection**: Do not patch Medusa packages or write to Medusa core tables. Apply catalog changes only through supported Medusa workflows. The Medusa application only registers the new plug-in.
- **Admin route**: Keep `/backend/one-c-connection` as the manager page. Replace the temporary application page with the plug-in page only after feature parity is verified.
- **Third-party boundary**: Only the 1C plug-in can call 1C. Endpoint definitions are server-side and allowlisted. Admin and MCP input cannot supply arbitrary URLs.
- **Transport security**: The current 1C endpoints use plain HTTP. An IP allowlist does not encrypt or authenticate the feed. Treat all current responses as untrusted transport. Do not enable approval, apply, scheduled receipt, or automatic updates until 1C uses valid HTTPS, an authenticated encrypted tunnel, or signed responses over an approved private path.
- **1C authentication**: Prefer a short-lived service credential or mutual TLS. Never put a credential in a URL, source file, database setting, Admin response, MCP result, or log. Inventory production settings before adding any secret.
- **Outbound request security**: Allow only exact approved schemes, hosts, ports, and path prefixes. Do not follow redirects. Reject user-controlled hosts, DNS changes to forbidden networks, loopback, link-local, cloud metadata, and other private targets unless the approved 1C private address is explicitly configured. Revalidate the destination for each connection.
- **Request limits**: Set connection and total timeouts, maximum redirects of zero, maximum response size, maximum batch count, maximum item count, and bounded concurrency. Abort the complete receive run when a required limit or endpoint fails.
- **Input trust**: Treat every 1C field as untrusted data. Use strict schemas, length limits, numeric bounds, date validation, canonical encoding, and explicit field allowlists. Ignore unknown fields for apply and record them for review.
- **MCP prompt-injection protection**: Return structured normalized fields by default. Do not expose raw feed text to MCP analysis unless an authorized user explicitly asks for a bounded diagnostic sample. Mark 1C text as external data. It must never become MCP instructions or authorize a tool call.
- **Data access**: Raw snapshots are available only to authorized managers. MCP receives the smallest bounded projection needed for analysis. Do not include credentials, internal URLs, full error stacks, cookies, tokens, or unrelated feed data.
- **Data retention**: Encrypt database and backup storage using the existing platform controls. Define retention for raw snapshots and diagnostic samples. Permanently keep hashes, summaries, approvals, apply results, and audit events.
- **Mutation authorization**: Use separate capabilities for read, fetch, approve, apply, and policy management. No role receives mutation access through a read capability. Scheduled automation runs as a dedicated system actor with a fixed policy scope.
- **Mutation integrity**: Bind approval to run ID, item IDs, canonical before and after values, policy version, actor, expiry, and SHA-256 content hash. Use a unique idempotency key for each apply action. Reject expired, replayed, stale, or superseded approvals.
- **Audit protection**: Record authentication failures, authorization failures, fetches, setting changes, approvals, applies, retries, and policy decisions. Redact secrets and large payloads. Application flows do not update or delete audit events.
- **Abuse protection**: Rate-limit manual fetch, MCP refresh, approval, and apply actions by actor. Use distributed locks and bounded queues to prevent request floods and overlapping work.
- **Browser security**: All state changes use authenticated Admin POST routes. No GET route has a side effect. Enforce the existing Admin origin, cookie, session, and authorization controls. Do not render untrusted 1C HTML.
- **Dependency security**: Keep connector dependencies minimal, pin versions, run repository audit and license checks, and review generated plug-in migrations before deployment.
- **Explicit MCP fetch rule**: Read-only MCP analysis uses the latest stored completed snapshot. It does not contact 1C. A live fetch occurs only through a separate explicit refresh tool and the response must state that a new 1C call will run.
- **Receive before apply**: Fetch, validate, normalize, compare, review, approve, and apply are separate states. Fetch and comparison never update Medusa.
- **Identity**: Treat the 1C product `id` as the external identity. Match it to an exact Medusa variant SKU on first use, then store an explicit mapping between the 1C item, Medusa product, and Medusa variant. Ambiguous or duplicate matches are blocked.
- **Missing-product definition**: A product is “Missing from DYLLU” only when its valid 1C identity and exact SKU have no stored mapping and no exact Medusa variant match. Keep ambiguous matches, duplicate identities, invalid items, hidden items, and deleted items in separate queues so the missing count is trustworthy.
- **Missing-product work queue**: Make “Missing from DYLLU” a first-level manager view with its own count, filters, product details, validation state, last-seen run, and preparation status. Do not hide it inside the general difference list.
- **Exports**: Export the selected run and current authorized filters. Support UTF-8 CSV for spreadsheet work and versioned JSON for exact machine-readable data. Exports use stored snapshots and never trigger a 1C call.
- **Export safety**: Generate exports through authenticated Admin routes, audit each export, enforce row and size limits, and stream large files. CSV output neutralizes spreadsheet formulas in values beginning with `=`, `+`, `-`, `@`, tab, or carriage return. JSON retains the exact normalized value. Do not include credentials, internal URLs, raw errors, or fields outside the manager's access.
- **Source snapshots**: Store endpoint, batch, response hash, response metadata, and the source response for each received run. Keep permanent summaries and audit data. Apply a reviewed retention policy to large raw responses.
- **Key models**: Use `OneCSyncRun`, `OneCFeedSnapshot`, `OneCChange`, `OneCMapping`, `OneCSyncPolicy`, and `OneCSyncEvent` as the plug-in-owned records.
- **Run states**: Use explicit states for fetching, validating, ready for review, approved, applying, completed, partially failed, failed, canceled, and superseded.
- **Change states**: Classify each field as unchanged, proposed, blocked, approved, applied, failed, or superseded. Store the current Medusa value, proposed 1C value, target update time, and content hash.
- **Conflict protection**: Re-read the Medusa target before apply. Reject a change if its current value or update time differs from the reviewed value. Approval must reference the exact stored content hash.
- **Authorization**: Admin routes use the signed-in Medusa manager and explicit product permissions. MCP uses the current Auth0 user mapping and new capabilities: `one_c_sync.read`, `one_c_sync.run`, `one_c_sync.approve`, `one_c_sync.apply`, and `one_c_sync.policy.manage`.
- **Initial MCP scope**: Enable only `one_c_sync.read` in the first MCP slice. Add the explicit refresh tool behind `one_c_sync.run`. Do not expose approval or apply tools until the Admin workflow is stable.
- **MCP interface**: The MCP plug-in resolves a read-only 1C service contract from the Medusa container. It does not read 1C tables directly and does not call 1C over HTTP.
- **Concurrency**: Use the existing Redis locking module. Permit one receive or apply operation at a time. Make every batch idempotent so a retry does not apply the same change twice.
- **Scheduling**: Use a small native scheduled job that checks plug-in settings and `next_run_at`. This permits Admin-managed schedules without generating code or restarting Medusa.
- **Schedule default**: Scheduled runs receive and compare data only. They do not apply changes unless a field-specific automatic policy is enabled.
- **Price policy**: Regular prices use 1C price type `05` and currency `MDL`. Promo prices use a separate policy. Reject missing, zero, negative, ambiguous, stale, or excessive changes.
- **Destructive behavior**: Never hard-delete a product automatically. A missing, hidden, or deleted 1C item creates a reviewable status proposal. Do not copy the old WooCommerce behavior that deletes hidden products or drafts all products missing from a feed.
- **Feed failure**: A timeout, non-200 response, invalid JSON, missing batch, incomplete batch set, or invalid required field fails the receive run closed. Existing Medusa data stays unchanged.
- **Known inventory constraint**: Current catalog variants use `manage_inventory: false`. Inventory sync requires a separate reviewed rollout for managed inventory, stock-location mapping, and existing inventory levels.
- **Deployment safety**: The plug-in starts disabled for apply and automatic modes. Inventory existing production settings before any new environment value. Deploy schema and read-only receipt first, verify it, and enable mutations in later releases.

## Security release gates

These gates apply to every phase. A phase is not complete when an applicable gate fails.

- [ ] A threat model covers SSRF, feed tampering, credential theft, authorization bypass, replay, duplicate execution, prompt injection, data leakage, denial of service, and unsafe catalog mutation.
- [ ] The exact production 1C transport, authentication method, endpoint list, certificate or tunnel ownership, and source IP rules are verified read-only.
- [ ] Plain HTTP data cannot reach an approval or apply workflow.
- [ ] All Admin and MCP routes have positive and negative authorization tests.
- [ ] All outbound calls have destination checks, no redirects, timeouts, size limits, and safe error handling.
- [ ] All source data passes strict schema and business validation before comparison.
- [ ] Every mutation has stale-data protection, expiry, idempotency, audit, and a tested retry path.
- [ ] Logs, API results, MCP results, snapshots, and error messages are checked for secret and private-data leakage.
- [ ] CSV formula-injection tests, export authorization tests, export size-limit tests, and JSON schema tests pass.
- [ ] Database migrations have backup, restore, rollback, and sanitized production preflight procedures.
- [ ] Production apply stays disabled until manual review tests pass against a non-production catalog copy.
- [ ] Automatic apply stays disabled until manual apply is stable and the user gives separate approval.
- [ ] Security tests and repository validation pass before each deployment.

---

## Phase 1: Plug-in shell and safe data receipt

**User stories**: Receive fresh 1C data without changing Medusa; see connection and run history.

### What to build

Deliver a plug-in-owned manager page that performs an explicit manual fetch from the fixed 1C endpoints, validates the batch chain and JSON shape, stores source snapshots and a run record, and reports complete endpoint results. This slice replaces the temporary connection test only after the new page has the same diagnostic value.

### Acceptance criteria

- [ ] The 1C plug-in builds and registers without a Medusa core patch.
- [ ] A signed-in authorized manager can start one manual receive run.
- [ ] The run checks product batches, categories, brands, and promo feeds.
- [ ] Each response has an endpoint, batch, time, status, size, and SHA-256 hash.
- [ ] The page clearly marks plain HTTP responses as untrusted and blocks all apply actions.
- [ ] The connector rejects redirects, forbidden destinations, oversized responses, excessive batches, and excessive items.
- [ ] Invalid or incomplete input marks the run failed and changes no Medusa data.
- [ ] Two concurrent manual runs cannot start.
- [ ] The page shows the current backend public IP, progress, results, and exact errors.
- [ ] Unit and integration tests cover success, timeout, refused connection, invalid JSON, missing batches, and lock contention.

---

## Phase 2: Missing-product work queue and reviewable differences

**User stories**: Compare 1C products with Medusa; clearly identify products missing from DYLLU; export work queues and differences; see changed, unchanged, blocked, ambiguous, and invalid items.

### What to build

Normalize all product batches into a stable internal shape. Match exact 1C identities and SKUs to Medusa products and variants. Store a field-level change set without applying it. Add a prominent “Missing from DYLLU” work queue, general difference views, and secure CSV and JSON exports for the selected run and current filters.

### Acceptance criteria

- [ ] Every received product is classified as matched, new, missing in Medusa, ambiguous, invalid, or unchanged.
- [ ] “Missing from DYLLU” has a prominent count and a dedicated view.
- [ ] The missing view shows 1C ID, SKU, names, regular MDL price, balance, category, brand, hidden or deleted state, validation result, first seen, and last seen.
- [ ] Ambiguous, duplicate, invalid, hidden, and deleted items do not increase the trusted missing-product count.
- [ ] Managers can mark a missing item as not planned, needs data, ready to create, or created without changing its source values.
- [ ] Exact mappings are stored and reused in later runs.
- [ ] Duplicate 1C IDs, duplicate SKUs, and multiple Medusa matches are blocked.
- [ ] Price, name, description, status, balance, category, brand, promo, and image-source differences can be represented.
- [ ] Strict schemas and business rules reject invalid lengths, numbers, dates, identifiers, and unexpected apply fields.
- [ ] Every proposed field contains before value, proposed value, target time, and content hash.
- [ ] Managers can filter and inspect differences without changing Medusa.
- [ ] Managers can export all authorized rows, current filtered rows, or selected rows as CSV or JSON.
- [ ] Every export contains the source run ID, source time, export time, applied filters, schema version, and stable field names.
- [ ] CSV opens as UTF-8, escapes delimiters and quotes, and neutralizes spreadsheet formulas.
- [ ] JSON preserves normalized types and validates against a versioned export schema.
- [ ] Export actions are authorized, rate-limited, size-limited, and audited.
- [ ] A new run supersedes unapplied differences from an older run without removing history.
- [ ] Tests cover deterministic normalization, mapping, comparison, pagination, and stale runs.

---

## Phase 3: Read-only MCP analysis

**User stories**: Analyze stored 1C data and mismatches through MCP; request live data only with an explicit command.

### What to build

Expose bounded read-only MCP tools for sync status, runs, mismatch lists, one-product comparison, and run summaries. Connect them to the 1C plug-in through a read-only service contract. Add an explicit refresh tool as a separate action, but keep it disabled until receive runs are stable.

### Acceptance criteria

- [ ] `one_c_sync.read` is separate from product update and audit capabilities.
- [ ] MCP can list runs and summarize mismatch counts by field and status.
- [ ] MCP can list and summarize the trusted “Missing from DYLLU” queue without contacting 1C.
- [ ] MCP can filter price differences by amount and percentage.
- [ ] MCP can compare one 1C item with its mapped Medusa product and variant.
- [ ] Read tools never call 1C and never change Medusa.
- [ ] The explicit refresh tool is the only MCP path that can contact 1C.
- [ ] The refresh tool uses `one_c_sync.run`, the same lock, the same allowlisted connector, and the same audit history as the Admin button.
- [ ] Tool results are bounded, paginated, structured, and safe for model analysis.
- [ ] 1C text is returned as untrusted data and cannot change MCP instructions or capability checks.
- [ ] Authorization failures and tool calls are audited.

---

## Phase 4: Manual price approval and apply

**User stories**: Review, approve, and manually apply selected regular price changes.

### What to build

Deliver the first complete mutation path for regular MDL prices. A manager selects exact price changes, reviews before and after values, approves the content hash, and applies them through a Medusa price workflow. Store the result and failure for each item.

### Acceptance criteria

- [ ] Only exact mapped variants with price type `05` and currency `MDL` can be approved.
- [ ] Secure authenticated 1C transport is verified before approval or apply is enabled.
- [ ] Price values must be positive integers in Medusa minor-unit format.
- [ ] Approval records the manager, time, reason, selected items, and exact content hash.
- [ ] Apply revalidates the current Medusa price and target update time.
- [ ] A stale, ambiguous, invalid, or already applied price is rejected.
- [ ] Successful updates use a supported Medusa workflow and create immutable history.
- [ ] Partial batch failures are visible and can retry only failed items.
- [ ] The storefront and Admin show the applied price after a successful run.

---

## Phase 5: Scheduled receive and review

**User stories**: Configure automatic data receipt; review scheduled results before apply.

### What to build

Add manager-controlled schedule settings in Europe/Chisinau. A native job checks due settings, starts the same receive workflow, and records the scheduled trigger. Scheduled runs stop at ready-for-review.

### Acceptance criteria

- [ ] A manager with policy permission can enable, disable, and edit the schedule.
- [ ] Schedule changes do not require a restart or code generation.
- [ ] The job uses one distributed lock and cannot overlap a manual run.
- [ ] Missed execution, source failure, and retry timing are visible in history.
- [ ] Scheduled receipt does not apply any Medusa change by default.
- [ ] `next_run_at`, last success, last failure, and consecutive failure count are visible.
- [ ] Tests cover time-zone changes, duplicate job execution, missed runs, and disabled schedules.

---

## Phase 6: Controlled automatic prices

**User stories**: Allow safe regular price changes to apply automatically; review blocked and applied changes.

### What to build

Add an opt-in automatic policy for regular prices. After a valid scheduled receive run, eligible price changes apply through the same checked workflow. Changes outside the policy remain ready for review.

### Acceptance criteria

- [ ] Automatic price apply is disabled by default.
- [ ] The policy includes maximum absolute and percentage change limits.
- [ ] Zero, negative, missing, stale, ambiguous, and unexpected-currency prices are blocked.
- [ ] Each automatic decision records the policy version and reason.
- [ ] Manual and automatic changes use the same conflict and idempotency checks.
- [ ] A failed or incomplete feed cannot start automatic apply.
- [ ] Managers can see applied, blocked, skipped, and failed automatic changes.
- [ ] A kill switch stops future automatic apply without stopping data receipt.

---

## Phase 7: Product content and new products

**User stories**: Review and apply names, descriptions, statuses, and new products.

### What to build

Extend staged changes to product content and product creation. Preserve current handles and reviewed catalog structure. New products and status changes require manual approval. Apply each approved set with supported Medusa product workflows.

### Acceptance criteria

- [ ] Existing product handles do not change during a content update.
- [ ] New products show all required Medusa fields before approval.
- [ ] A manager can open a prepared creation draft directly from a trusted missing-product record.
- [ ] Missing shipping profile, sales channel, category, option, or price blocks creation.
- [ ] Hidden, deleted, and missing-source states create proposals and never delete automatically.
- [ ] Content and status changes have field-level approval and conflict checks.
- [ ] New products and updates create mappings and immutable history.
- [ ] No content field receives automatic apply in this phase.

---

## Phase 8: Stock, promo, categories, brands, and images

**User stories**: Review and control the remaining 1C catalog data.

### What to build

Add separate reviewed policies for inventory, promo prices, category mappings, brand representation, and image receipt. Deliver each data type through the same snapshot, comparison, approval, workflow, and history path. Enable automatic behavior only after its manual path is verified.

### Acceptance criteria

- [ ] Inventory rollout defines the stock location and migration from unmanaged variants before any quantity update.
- [ ] Balance updates use Medusa inventory workflows and do not overwrite reservations.
- [ ] Promo price rules validate start date, end date, regular price, and discount price.
- [ ] Category changes use explicit 1C-to-Medusa mappings and do not rename or remove categories automatically.
- [ ] Brand data uses one approved Medusa representation before import starts.
- [ ] Image URLs and FTP paths are validated, size-limited, and stored through the configured file service.
- [ ] Image failures do not block safe price or content changes unless policy requires this.
- [ ] Each data type has its own enable switch, automatic policy, history, and tests.
