# DYLLU 1C Sync

Read-only 1C catalog receipt and comparison for DYLLU.

## Current scope

- Fixed public 1C product, category, brand, and promotion endpoints
- Manual receipt from DYLLU Admin or the explicit MCP refresh tool
- Exact SKU comparison with DYLLU products
- Missing-product, ambiguous, excluded, and matched queues
- Run history and response hashes
- Audited CSV and JSON exports

## Safety state

The 1C transport uses plain HTTP. The plug-in marks each run as untrusted.
Scheduled receipt and all DYLLU product or price changes are disabled. Admin
and MCP input cannot change the 1C URLs.

The connector blocks redirects. It has per-response, full-catalog, batch,
item, and time limits. Raw feed bodies stay in plug-in storage and are not
returned by Admin or MCP read routes.
