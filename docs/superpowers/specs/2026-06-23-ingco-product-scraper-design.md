# DYLLU Product Scraper & Curation Tool — Design Spec

**Date:** 2026-06-23  
**Status:** Approved  
**Scope:** `tools/scraper/`

---

## Overview

A two-process tool that scrapes all DYLLU-branded products from ingcomoldova.md, auto-groups size/dimension variants, and provides a web-based curation UI to review and approve groupings before exporting a clean JSON file for Medusa import.

**Source:** 903 products at `https://ingcomoldova.md/catalog/?filter_product_brand=dyllu&query_type_product_brand=and`  
**Output:** `tools/scraper/data/products_curated.json` — approved product groups with variants, ready for a future Medusa import script.

---

## Architecture

Two processes launched together via `python tools/scraper/run.py`:

| Process     | File                      | Role                                                                                          |
| ----------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| Scraper     | `tools/scraper/scrape.py` | Paginates catalog, visits product detail pages, writes incrementally to `products.json`       |
| Curation UI | `tools/scraper/server.py` | Flask app at `http://localhost:5001`, reads `products.json` via SSE, allows review and export |

The scraper and server communicate via the filesystem: the scraper writes `products.json` and `progress.json`; the server reads and serves them. No database required.

### Entry point

```
python tools/scraper/run.py
```

Starts Flask, then spawns the scraper as a subprocess. Both processes stop cleanly on Ctrl+C.

---

## Scraping Strategy

**Catalog pagination:** Uses the WooCommerce AJAX endpoint:

```
GET /catalog/page/{n}/?filter_product_brand=dyllu&query_type_product_brand=and&loop=360&woo_ajax=1
```

Parses the rendered HTML with `BeautifulSoup`. Iterates pages 1–N until no products are found. Expected ~76 pages at 12 products per page.

**Product detail:** For each product URL found on catalog pages, fetches the product detail page to extract:

- Full description (HTML → plain text)
- All available size/dimension values visible on the page
- Additional images if present

**Delays:**

- 1.5 seconds between product detail requests
- 3.0 seconds between catalog pages
- Both values configurable via `config.py`

**Dependencies:** `requests`, `beautifulsoup4`, `flask`, `lxml`

---

## Data Format

### Intermediate: `tools/scraper/data/products.json`

Array of raw scraped products written incrementally:

```json
{
  "id": "dtac1351",
  "source_url": "https://ingcomoldova.md/catalog/.../dtac1351/",
  "source_id": "10017",
  "name": "Disc pentru taiat metal 125×1.0×22.2mm DYLLU DTAC1351",
  "sku": "DTAC1351",
  "price_mdl": 10,
  "category_path": ["Consumabile", "Discuri", "Discuri pe metal"],
  "image_url": "https://ingcomoldova.md/wp-content/uploads/2026/03/DTAC1351.webp",
  "description": "...",
  "status": "scraped"
}
```

### Grouped: `tools/scraper/data/groups.json`

Auto-generated after each catalog page completes:

```json
{
  "group_id": "disc-taiat-metal-dyllu",
  "group_name": "Disc pentru taiat metal DYLLU",
  "category_path": ["Consumabile", "Discuri", "Discuri pe metal"],
  "auto_grouped": true,
  "confidence": "high",
  "approved": false,
  "variants": [
    {
      "sku": "DTAC1351",
      "size": "125×1.0×22.2mm",
      "price_mdl": 10,
      "image_url": "..."
    },
    {
      "sku": "DTAC1150",
      "size": "115×1.0×22.2mm",
      "price_mdl": 9,
      "image_url": "..."
    }
  ]
}
```

### Export: `tools/scraper/data/products_curated.json`

Written on demand via the Export button. Contains only approved groups and singletons in a normalized shape ready for a future Medusa import script.

---

## Auto-Grouping Logic

Runs after each catalog page completes (incremental) and again after all scraping finishes.

### Pass 1 — Dimension extraction

Regex strips known patterns from each product name:

- Metric dimensions: `125×1.0×22.2mm`, `115mm`, `M8×1.25`
- Power/voltage: `18V`, `2000W`
- Capacity: `4Ah`, `2.5L`
- Trailing numeric suffixes

The normalized remainder becomes the **group key**. Products with the same group key within the same `category_path` are merged into one group.

### Pass 2 — Confidence scoring

| Level    | Condition                                        | UI treatment                 |
| -------- | ------------------------------------------------ | ---------------------------- |
| `high`   | 3+ variants matched, dimension clearly extracted | Green — pre-approved         |
| `medium` | 2 variants, name similarity >85%                 | Yellow — one-click approve   |
| `low`    | Name similarity only, no dimension found         | Red — manual review required |

Ungrouped products remain as singletons and export as single-variant products.

---

## Curation UI

Flask app serving a single HTML page at `http://localhost:5001`. Real-time updates via Server-Sent Events (SSE) — the page updates as the scraper writes new data.

### Tab 1 — Progress

Persistent top bar visible on all tabs showing:

- Pages scraped: `31 / 76`
- Products found: `420 / 903`
- Current URL being fetched
- Estimated time remaining

### Tab 2 — Groups _(main workspace)_

Cards organized by category. Each card shows:

- Group name (editable inline)
- Confidence badge (green / yellow / red)
- Variant chips (`115mm · 125mm · 230mm`) — click any to preview image + price
- Category path (editable via dropdown of all detected categories)
- Actions: **Approve** · **Split** (break into singletons) · **Merge** (combine two groups)

Filter controls: by category, by confidence level, by approved/pending status.

### Tab 3 — All Products

Flat list of every scraped product with status: `grouped`, `singleton`, `pending`. Used to find products that did not auto-group.

### Export

Always-visible button. Writes `products_curated.json`. Shows live count: `847 approved / 903 total`.

---

## Error Handling & Reliability

**Rate limiting / blocks:** On 429 or 503, backs off exponentially (3s → 6s → 12s), retries up to 3 times. On persistent failure, marks product as `failed` and continues. Failed products appear in the UI with a Retry button.

**Resume:** Saves a `progress.json` checkpoint after each page. Restarting the scraper resumes from the last completed page — already-scraped products are not re-fetched.

**Missing data:** Products with no description or no detectable dimension are saved with `null` values and flagged in the UI with a warning icon.

**Images:** Not downloaded during scraping. `products_curated.json` stores original `ingcomoldova.md` image URLs. A separate `tools/scraper/download_images.py` script bulk-downloads them to `tools/scraper/data/images/` before Medusa import.

---

## File Layout

```
tools/scraper/
  run.py                  # Entry point — starts Flask + scraper subprocess
  scrape.py               # Scraper: pagination, detail fetch, writes products.json
  group.py                # Auto-grouping logic: dimension extraction + confidence scoring
  server.py               # Flask app: SSE, curation API endpoints, export
  config.py               # Delays, URLs, paths
  templates/
    index.html            # Single-page curation UI (vanilla JS + SSE)
  data/
    products.json         # Raw scraped products (written by scraper)
    groups.json           # Auto-grouped products (written by grouper)
    progress.json         # Scraping checkpoint
    products_curated.json # Final export (written on demand)
    images/               # Optional downloaded images
```

---

## Out of Scope

- Medusa import script — separate tool, built after curation is complete
- Authentication / multi-user UI — single-user local tool only
- Romanian/Russian translation — handled by the copy generator (see `AUTOMATION_PLAN.md`)
- Price conversion (MDL → other currencies) — handled at Medusa import time via region config
