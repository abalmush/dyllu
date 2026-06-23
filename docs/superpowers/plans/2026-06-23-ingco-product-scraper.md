# DYLLU Product Scraper & Curation Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a two-process tool that scrapes 903 DYLLU products from ingcomoldova.md, auto-groups size/dimension variants, and provides a Flask-based curation UI for review and export.

**Architecture:** A Python scraper paginates the WooCommerce AJAX JSON API (`woo_ajax=1`), visits product detail pages, and writes results incrementally to JSON files. A Flask server reads those files and serves a single-page curation UI with SSE-based live updates and approve/split/merge/export actions.

**Tech Stack:** Python 3.11+, `requests`, `beautifulsoup4`, `lxml`, `flask`, `pytest`

---

## API Notes (verified by live inspection)

The catalog endpoint returns JSON — not raw HTML:

```
GET /catalog/page/{n}/?filter_product_brand=dyllu&query_type_product_brand=and&loop={offset}&woo_ajax=1
Headers: X-Requested-With: XMLHttpRequest, Referer: https://ingcomoldova.md/catalog/
```

Response shape:

```json
{
  "items": "<HTML string of product cards>",
  "status": "have-posts",
  "nextPage": "https://ingcomoldova.md/catalog/page/32/?...&woo_ajax=1",
  "currentPage": "https://ingcomoldova.md/catalog/page/31",
  "resultCount": "<p>Afișez 361 - 372 din 903 rezultate</p>"
}
```

Product card CSS selectors (verified):

- Outer: `div.wd-product[data-id]`
- Name + URL: `h3.wd-entities-title a`
- Image: `img.attachment-woocommerce_thumbnail[src]`
- Category: `div.wd-product-cats a`
- Price: embedded in `window.wpmDataLayer.products[id]` JSON inside `<script>`
- Ingco SKU: same wpmDataLayer JSON (key `"sku"`)

Product detail page selectors (verified):

- Description: `div.woocommerce-Tabs-panel--description`
- Breadcrumbs: `nav.woocommerce-breadcrumb a` — skip first two ("Prima pagină", "Catalog")

---

## File Map

| File                                 | Role                                                  |
| ------------------------------------ | ----------------------------------------------------- |
| `tools/scraper/requirements.txt`     | Python dependencies                                   |
| `tools/scraper/config.py`            | URLs, delays, file paths                              |
| `tools/scraper/scrape.py`            | Catalog pagination, detail fetch, atomic JSON writes  |
| `tools/scraper/group.py`             | Dimension extraction + confidence scoring + grouping  |
| `tools/scraper/server.py`            | Flask app: REST endpoints + SSE stream                |
| `tools/scraper/templates/index.html` | Single-page curation UI                               |
| `tools/scraper/run.py`               | Entry point: starts Flask + spawns scraper subprocess |
| `tools/scraper/download_images.py`   | Standalone bulk image downloader                      |
| `tools/scraper/tests/__init__.py`    | Empty                                                 |
| `tools/scraper/tests/test_scrape.py` | Tests for HTML/JSON parsing                           |
| `tools/scraper/tests/test_group.py`  | Tests for grouping logic                              |
| `tools/scraper/tests/test_server.py` | Tests for Flask endpoints                             |

---

### Task 1: Project Setup

**Files:**

- Create: `tools/scraper/requirements.txt`
- Create: `tools/scraper/config.py`
- Create: `tools/scraper/tests/__init__.py`
- Create: `tools/scraper/data/.gitkeep`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p tools/scraper/templates tools/scraper/tests tools/scraper/data
touch tools/scraper/tests/__init__.py tools/scraper/data/.gitkeep
```

- [ ] **Step 2: Create requirements.txt**

`tools/scraper/requirements.txt`:

```
requests==2.32.3
beautifulsoup4==4.12.3
lxml==5.2.2
flask==3.1.1
pytest==8.3.5
```

Install: `pip install -r tools/scraper/requirements.txt`

- [ ] **Step 3: Create config.py**

`tools/scraper/config.py`:

```python
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"

CATALOG_START_URL = (
    "https://ingcomoldova.md/catalog/page/2/"
    "?filter_product_brand=dyllu"
    "&query_type_product_brand=and"
    "&loop=0"
    "&woo_ajax=1"
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://ingcomoldova.md/catalog/",
    "Accept": "application/json, text/javascript, */*; q=0.01",
}

DELAY_BETWEEN_PRODUCTS = 1.5
DELAY_BETWEEN_PAGES = 3.0
MAX_RETRIES = 3

PRODUCTS_FILE = DATA_DIR / "products.json"
GROUPS_FILE = DATA_DIR / "groups.json"
PROGRESS_FILE = DATA_DIR / "progress.json"
EXPORT_FILE = DATA_DIR / "products_curated.json"

FLASK_PORT = 5001
```

- [ ] **Step 4: Verify structure**

```bash
find tools/scraper -type f | sort
```

Expected: `config.py`, `requirements.txt`, `tests/__init__.py`, `data/.gitkeep`

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/
git commit -m "feat: scaffold scraper project structure"
```

---

### Task 2: Catalog Page Parser

**Files:**

- Create: `tools/scraper/tests/test_scrape.py`
- Create: `tools/scraper/scrape.py`

- [ ] **Step 1: Write failing tests**

`tools/scraper/tests/test_scrape.py`:

```python
import pytest
from scrape import parse_catalog_page

SAMPLE_CARD_HTML = """
<div class="wd-product" data-id="10008">
  <div class="product-wrapper">
    <div class="product-element-top">
      <a class="product-image-link"
         href="https://ingcomoldova.md/catalog/scule-manuale/perii/set-pensule-artistice-10buc-dyllu-dtxa1k10/">
        <img class="attachment-woocommerce_thumbnail"
             src="https://ingcomoldova.md/wp-content/uploads/2026/03/DTXA1K10.webp"
             width="500" height="400" />
      </a>
    </div>
    <div class="product-element-bottom">
      <h3 class="wd-entities-title">
        <a href="https://ingcomoldova.md/catalog/scule-manuale/perii/set-pensule-artistice-10buc-dyllu-dtxa1k10/">
          Set pensule artistice 10buc. DYLLU DTXA1K10
        </a>
      </h3>
      <div class="wd-product-cats">
        <a href="https://ingcomoldova.md/categorie-produs/perii/">Perii</a>
      </div>
      <span class="price">
        <span class="woocommerce-Price-amount amount">
          <bdi>60<span class="woocommerce-Price-currencySymbol">MDL</span></bdi>
        </span>
      </span>
      <script>
        (window.wpmDataLayer = window.wpmDataLayer || {}).products =
          window.wpmDataLayer.products || {};
        window.wpmDataLayer.products[10008] = {
          "id": "10008", "sku": "51543", "price": 60,
          "brand": "DYLLU", "name": "Set pensule artistice 10buc. DYLLU DTXA1K10",
          "category": ["Perii"], "is_variable": false, "type": "simple"
        };
      </script>
    </div>
  </div>
</div>
"""

SAMPLE_CATALOG_JSON = {
    "items": SAMPLE_CARD_HTML,
    "status": "have-posts",
    "nextPage": "https://ingcomoldova.md/catalog/page/2/?filter_product_brand=dyllu&query_type_product_brand=and&loop=12&woo_ajax=1",
    "currentPage": "https://ingcomoldova.md/catalog/page/1",
    "resultCount": "<p>Afișez 1 - 12 din 903 rezultate</p>",
}


def test_parse_catalog_page_returns_one_product():
    products, next_url = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert len(products) == 1
    assert next_url == SAMPLE_CATALOG_JSON["nextPage"]


def test_parse_product_card_name():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert products[0]["name"] == "Set pensule artistice 10buc. DYLLU DTXA1K10"


def test_parse_product_card_sku():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert products[0]["sku"] == "DTXA1K10"


def test_parse_product_card_price():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert products[0]["price_mdl"] == 60.0


def test_parse_product_card_image():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert products[0]["image_url"] == "https://ingcomoldova.md/wp-content/uploads/2026/03/DTXA1K10.webp"


def test_parse_product_card_url():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert "set-pensule-artistice" in products[0]["source_url"]


def test_parse_product_card_source_id():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert products[0]["source_id"] == "10008"


def test_parse_product_card_category():
    products, _ = parse_catalog_page(SAMPLE_CATALOG_JSON)
    assert products[0]["category_path"] == ["Perii"]


def test_parse_catalog_page_no_next_when_none():
    data = {**SAMPLE_CATALOG_JSON, "nextPage": None}
    products, next_url = parse_catalog_page(data)
    assert next_url is None
```

- [ ] **Step 2: Run tests to confirm failure**

```bash
cd tools/scraper && python -m pytest tests/test_scrape.py -v 2>&1 | head -10
```

Expected: `ModuleNotFoundError: No module named 'scrape'`

- [ ] **Step 3: Implement scrape.py (catalog parsing)**

`tools/scraper/scrape.py`:

```python
import json
import re
from bs4 import BeautifulSoup


def parse_catalog_page(data: dict) -> tuple[list[dict], str | None]:
    soup = BeautifulSoup(data.get("items", ""), "lxml")
    cards = soup.find_all("div", class_="wd-product")
    products = [p for card in cards if (p := _parse_product_card(card)) is not None]
    next_page = data.get("nextPage") or None
    return products, next_page


def _parse_product_card(card) -> dict | None:
    source_id = card.get("data-id")
    title_a = card.select_one("h3.wd-entities-title a")
    if not title_a:
        return None

    name = title_a.get_text(strip=True)
    source_url = title_a.get("href", "")

    img = card.select_one("img.attachment-woocommerce_thumbnail")
    image_url = img.get("src") if img else None

    cat_a = card.select_one("div.wd-product-cats a")
    category_name = cat_a.get_text(strip=True) if cat_a else None

    wpm = _extract_wpm_data(card)
    price_mdl = float(wpm["price"]) if wpm and "price" in wpm else _parse_price_fallback(card)

    sku = _extract_dyllu_sku(name)

    return {
        "id": sku.lower() if sku else source_id,
        "source_url": source_url,
        "source_id": source_id,
        "ingco_sku": wpm.get("sku") if wpm else None,
        "name": name,
        "sku": sku,
        "price_mdl": price_mdl,
        "category_path": [category_name] if category_name else [],
        "image_url": image_url,
        "description": None,
        "status": "scraped",
    }


def _extract_wpm_data(card) -> dict | None:
    script = card.find("script")
    if not script:
        return None
    m = re.search(
        r"wpmDataLayer\.products\[\d+\]\s*=\s*(\{.*?\})\s*;",
        script.get_text(),
        re.DOTALL,
    )
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return None


def _extract_dyllu_sku(name: str) -> str | None:
    m = re.search(r"\bDYLLU\s+([A-Z][A-Z0-9]+)\b", name)
    return m.group(1) if m else None


def _parse_price_fallback(card) -> float | None:
    amount = card.select_one("span.woocommerce-Price-amount bdi")
    if not amount:
        return None
    currency = amount.find("span", class_="woocommerce-Price-currencySymbol")
    if currency:
        currency.extract()
    text = amount.get_text(strip=True)
    text = re.sub(r"\.(?=\d{3})", "", text).replace(",", ".").strip()
    try:
        return float(text)
    except ValueError:
        return None
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
cd tools/scraper && python -m pytest tests/test_scrape.py -v
```

Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/scrape.py tools/scraper/tests/test_scrape.py
git commit -m "feat: implement catalog page parser with tests"
```

---

### Task 3: Product Detail Parser

**Files:**

- Modify: `tools/scraper/tests/test_scrape.py`
- Modify: `tools/scraper/scrape.py`

- [ ] **Step 1: Add failing tests**

Append to `tools/scraper/tests/test_scrape.py`:

```python
from scrape import parse_product_detail

SAMPLE_DETAIL_HTML = """
<!DOCTYPE html>
<html>
<body>
<nav class="woocommerce-breadcrumb">
  <a href="https://ingcomoldova.md/">Prima pagină</a> ›
  <a href="https://ingcomoldova.md/catalog/">Catalog</a> ›
  <a href="https://ingcomoldova.md/categorie-produs/scule-manuale/">Scule manuale</a> ›
  <a href="https://ingcomoldova.md/categorie-produs/scule-manuale/perii/">Perii</a> ›
  Set pensule artistice 10buc. DYLLU DTXA1K10
</nav>
<div class="entry-content woocommerce-Tabs-panel woocommerce-Tabs-panel--description wd-active panel wc-tab">
  Material pensulă: Nailon
  Include: 1 buc. pensulă rotundă #1
</div>
</body>
</html>
"""


def test_parse_product_detail_extracts_description():
    result = parse_product_detail(SAMPLE_DETAIL_HTML)
    assert result["description"] is not None
    assert "Nailon" in result["description"]


def test_parse_product_detail_extracts_category_path():
    result = parse_product_detail(SAMPLE_DETAIL_HTML)
    assert result["category_path"] == ["Scule manuale", "Perii"]


def test_parse_product_detail_empty_html():
    result = parse_product_detail("<html><body></body></html>")
    assert result["description"] is None
    assert result["category_path"] == []
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd tools/scraper && python -m pytest tests/test_scrape.py::test_parse_product_detail_extracts_description -v
```

Expected: `ImportError` — `parse_product_detail` not defined

- [ ] **Step 3: Implement parse_product_detail**

Append to `tools/scraper/scrape.py`:

```python
def parse_product_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "lxml")

    desc_div = soup.find("div", class_="woocommerce-Tabs-panel--description")
    description = desc_div.get_text(separator="\n", strip=True) if desc_div else None

    breadcrumb = soup.find("nav", class_="woocommerce-breadcrumb")
    category_path = []
    if breadcrumb:
        links = breadcrumb.find_all("a")
        category_path = [a.get_text(strip=True) for a in links[2:]]

    return {"description": description, "category_path": category_path}
```

- [ ] **Step 4: Run all tests**

```bash
cd tools/scraper && python -m pytest tests/test_scrape.py -v
```

Expected: all 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/scrape.py tools/scraper/tests/test_scrape.py
git commit -m "feat: add product detail parser"
```

---

### Task 4: Scraper Orchestration (fetch, checkpoints, main loop)

**Files:**

- Modify: `tools/scraper/tests/test_scrape.py`
- Modify: `tools/scraper/scrape.py`

- [ ] **Step 1: Add failing tests**

Append to `tools/scraper/tests/test_scrape.py`:

```python
import json
from pathlib import Path
from scrape import load_checkpoint, save_checkpoint, write_products_atomic


def test_save_and_load_checkpoint(tmp_path):
    f = tmp_path / "progress.json"
    data = {"next_url": "https://example.com/page/2/", "scraped_urls": ["https://example.com/p/1/"]}
    save_checkpoint(data, f)
    loaded = load_checkpoint(f)
    assert loaded["next_url"] == "https://example.com/page/2/"
    assert "https://example.com/p/1/" in loaded["scraped_urls"]


def test_load_checkpoint_returns_defaults_when_missing(tmp_path):
    loaded = load_checkpoint(tmp_path / "nonexistent.json")
    assert loaded["next_url"] is None
    assert loaded["scraped_urls"] == []


def test_write_products_atomic(tmp_path):
    f = tmp_path / "products.json"
    write_products_atomic([{"id": "test"}], f)
    assert f.exists()
    assert json.loads(f.read_text())[0]["id"] == "test"
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd tools/scraper && python -m pytest tests/test_scrape.py::test_save_and_load_checkpoint -v
```

Expected: `ImportError`

- [ ] **Step 3: Add checkpoint, fetch, and run_scraper to scrape.py**

Append to `tools/scraper/scrape.py`:

```python
import logging
import time
from pathlib import Path

import requests

logger = logging.getLogger(__name__)


def load_checkpoint(path: Path) -> dict:
    if not path.exists():
        return {"next_url": None, "scraped_urls": []}
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return {"next_url": None, "scraped_urls": []}


def save_checkpoint(data: dict, path: Path) -> None:
    write_json_atomic(data, path)


def write_products_atomic(products: list, path: Path) -> None:
    write_json_atomic(products, path)


def write_json_atomic(obj, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2))
    tmp.replace(path)


def fetch_page(url: str, session: requests.Session, retries: int = 3) -> dict | None:
    from config import HEADERS
    backoff = 3.0
    for attempt in range(retries):
        try:
            resp = session.get(url, headers=HEADERS, timeout=30)
            if resp.status_code in (429, 503):
                logger.warning("Rate limited (%s), backing off %.0fs", resp.status_code, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            logger.warning("Fetch error attempt %d: %s", attempt + 1, exc)
            time.sleep(backoff)
            backoff *= 2
    return None


def run_scraper(
    start_url: str,
    products_file: Path,
    progress_file: Path,
    groups_file: Path,
    delay_product: float = 1.5,
    delay_page: float = 3.0,
    on_progress=None,
) -> None:
    from group import group_products
    from config import HEADERS

    session = requests.Session()
    checkpoint = load_checkpoint(progress_file)
    scraped_urls: set[str] = set(checkpoint["scraped_urls"])
    products: list[dict] = []

    if products_file.exists():
        try:
            products = json.loads(products_file.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    next_url: str | None = checkpoint["next_url"] or start_url

    while next_url:
        logger.info("Fetching: %s", next_url)
        data = fetch_page(next_url, session)
        if data is None:
            logger.error("Failed to fetch %s — stopping", next_url)
            break

        if data.get("status") != "have-posts":
            logger.info("No more posts — complete")
            break

        page_products, next_url = parse_catalog_page(data)

        for product in page_products:
            detail_url = product["source_url"]
            if detail_url in scraped_urls:
                products = [p for p in products if p["source_url"] != detail_url]
                products.append(product)
                continue

            time.sleep(delay_product)
            try:
                resp = session.get(
                    detail_url,
                    headers={**HEADERS, "X-Requested-With": ""},
                    timeout=30,
                )
                resp.raise_for_status()
                detail = parse_product_detail(resp.text)
                product["description"] = detail["description"]
                if detail["category_path"]:
                    product["category_path"] = detail["category_path"]
            except requests.RequestException as exc:
                logger.warning("Detail fetch failed %s: %s", detail_url, exc)
                product["status"] = "failed"

            scraped_urls.add(detail_url)
            products.append(product)
            write_products_atomic(products, products_file)

            if on_progress:
                on_progress({"total_found": len(products), "current_url": detail_url})

        groups = group_products(products)
        write_json_atomic(groups, groups_file)

        save_checkpoint({"next_url": next_url, "scraped_urls": list(scraped_urls)}, progress_file)

        if next_url:
            time.sleep(delay_page)

    save_checkpoint({"next_url": None, "scraped_urls": list(scraped_urls)}, progress_file)
    logger.info("Done. %d products.", len(products))
```

- [ ] **Step 4: Run all scrape tests**

```bash
cd tools/scraper && python -m pytest tests/test_scrape.py -v
```

Expected: all 15 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/scrape.py tools/scraper/tests/test_scrape.py
git commit -m "feat: add scraper orchestration loop with checkpointing and retry"
```

---

### Task 5: Auto-Grouper

**Files:**

- Create: `tools/scraper/group.py`
- Create: `tools/scraper/tests/test_group.py`

- [ ] **Step 1: Write failing tests**

`tools/scraper/tests/test_group.py`:

```python
import pytest
from group import extract_dimension, compute_group_key, group_products


def test_extract_dimension_metric_triple():
    assert extract_dimension("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351") == "125*1.0*22.2mm"


def test_extract_dimension_simple_mm():
    assert extract_dimension("Polizor unghiular 115mm DYLLU DAG1151") == "115mm"


def test_extract_dimension_voltage():
    assert extract_dimension("Bormasina cu acumulator 18V DYLLU DCD1182") == "18V"


def test_extract_dimension_capacity():
    assert extract_dimension("Acumulator 4Ah DYLLU DAB4182") == "4Ah"


def test_extract_dimension_none_when_no_match():
    assert extract_dimension("Set pensule artistice 10buc. DYLLU DTXA1K10") is None


def test_compute_group_key_strips_dimension_and_sku():
    key = compute_group_key("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351")
    assert "125" not in key
    assert "dtac1351" not in key
    assert "disc" in key


def test_compute_group_key_same_for_same_product_family():
    key1 = compute_group_key("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351")
    key2 = compute_group_key("Disc pentru taiat metal 115*1.0*22.2mm DYLLU DTAC1150")
    assert key1 == key2


def _make_product(name: str, sku: str, price: float, cat: str, i: int) -> dict:
    return {
        "id": sku.lower(), "name": name, "sku": sku, "price_mdl": price,
        "image_url": f"https://example.com/{i}.webp",
        "source_url": f"https://example.com/{i}/",
        "description": None, "category_path": [cat], "status": "scraped",
    }


def test_group_products_merges_same_family():
    products = [
        _make_product("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351", "DTAC1351", 10, "Discuri pe metal", 1),
        _make_product("Disc pentru taiat metal 115*1.0*22.2mm DYLLU DTAC1150", "DTAC1150", 9, "Discuri pe metal", 2),
        _make_product("Disc pentru taiat metal 230*2.0*22.2mm DYLLU DTAC2301", "DTAC2301", 15, "Discuri pe metal", 3),
    ]
    groups = group_products(products)
    assert len(groups) == 1
    assert len(groups[0]["variants"]) == 3


def test_group_products_high_confidence_for_three_variants():
    products = [
        _make_product(f"Polizor 1{i}5mm DYLLU DAG{i}", f"DAG{i}", 100, "Polizoare", i)
        for i in range(3)
    ]
    groups = group_products(products)
    assert groups[0]["confidence"] == "high"


def test_group_products_medium_confidence_for_two_variants():
    products = [
        _make_product("Disc 125mm DYLLU DTAC1351", "DTAC1351", 10, "Discuri", 1),
        _make_product("Disc 115mm DYLLU DTAC1150", "DTAC1150", 9, "Discuri", 2),
    ]
    groups = group_products(products)
    assert groups[0]["confidence"] == "medium"


def test_group_products_singleton_for_no_match():
    products = [_make_product("Set pensule DYLLU DTXA1K10", "DTXA1K10", 60, "Perii", 1)]
    groups = group_products(products)
    assert groups[0]["confidence"] == "singleton"
    assert len(groups[0]["variants"]) == 1


def test_group_products_preserves_approval_from_existing():
    products = [_make_product("Disc 125mm DYLLU DTAC1351", "DTAC1351", 10, "Discuri", 1)]
    existing = [{
        "group_id": "abc", "group_name": "Disc DYLLU", "category_path": ["Discuri"],
        "auto_grouped": False, "confidence": "singleton", "approved": True,
        "variants": [{"sku": "DTAC1351", "size": "125mm", "price_mdl": 10,
                      "image_url": "a.webp", "source_url": "https://example.com/1/", "description": None}],
    }]
    groups = group_products(products, existing_approvals=existing)
    assert groups[0]["approved"] is True
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd tools/scraper && python -m pytest tests/test_group.py -v 2>&1 | head -5
```

Expected: `ModuleNotFoundError: No module named 'group'`

- [ ] **Step 3: Implement group.py**

`tools/scraper/group.py`:

```python
import hashlib
import re


VARIANT_PATTERNS = [
    r"\d+[*×x]\d+(?:[.,]\d+)?[*×x]\d+(?:[.,]\d+)?mm",  # 125*1.0*22.2mm
    r"\d+(?:[.,]\d+)?mm",                                  # 115mm
    r"M\d+(?:[*×x]\d+(?:[.,]\d+)?)?",                    # M8, M8*1.25
    r"\d+(?:[.,]\d+)?\s*[Vv](?:\b|$)",                   # 18V
    r"\d+(?:[.,]\d+)?\s*[Ww](?:\b|$)",                   # 2000W
    r"\d+(?:[.,]\d+)?\s*[Aa]h",                           # 4Ah
    r"\d+(?:[.,]\d+)?\s*[Ll](?:\b|$)",                   # 2.5L
]


def extract_dimension(name: str) -> str | None:
    for pattern in VARIANT_PATTERNS:
        m = re.search(pattern, name, re.IGNORECASE)
        if m:
            return m.group(0)
    return None


def compute_group_key(name: str) -> str:
    result = name
    for pattern in VARIANT_PATTERNS:
        result = re.sub(pattern, " ", result, flags=re.IGNORECASE)
    result = re.sub(r"\bDYLLU\s+[A-Z][A-Z0-9]+\b", " ", result)
    return re.sub(r"\s+", " ", result).strip().lower()


def _score_confidence(variants: list[dict]) -> str:
    if len(variants) == 1:
        return "singleton"
    sizes_found = sum(1 for v in variants if v.get("size"))
    if len(variants) >= 3 and sizes_found >= 2:
        return "high"
    if len(variants) >= 2 and sizes_found >= 1:
        return "medium"
    return "low"


def _make_variant(product: dict) -> dict:
    return {
        "sku": product.get("sku"),
        "size": extract_dimension(product.get("name", "")),
        "price_mdl": product.get("price_mdl"),
        "image_url": product.get("image_url"),
        "source_url": product.get("source_url"),
        "description": product.get("description"),
    }


def _derive_group_name(products: list[dict]) -> str:
    name = products[0]["name"] if products else ""
    for pattern in VARIANT_PATTERNS:
        name = re.sub(pattern, "", name, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", name).strip()


def group_products(products: list[dict], existing_approvals: list[dict] | None = None) -> list[dict]:
    approved_skus: set[str] = set()
    if existing_approvals:
        for g in existing_approvals:
            if g.get("approved"):
                for v in g.get("variants", []):
                    if v.get("sku"):
                        approved_skus.add(v["sku"])

    buckets: dict[str, list[dict]] = {}
    for product in products:
        key = compute_group_key(product["name"])
        cat = (product.get("category_path") or [""])[0]
        buckets.setdefault(f"{cat}::{key}", []).append(product)

    groups = []
    for bucket_key, bucket_products in buckets.items():
        cat = bucket_key.split("::")[0]
        variants = [_make_variant(p) for p in bucket_products]
        confidence = _score_confidence(variants)
        gid = hashlib.md5(bucket_key.encode()).hexdigest()[:12]
        approved = confidence == "high" or any(
            v.get("sku") in approved_skus for v in variants
        )
        groups.append({
            "group_id": gid,
            "group_name": _derive_group_name(bucket_products),
            "category_path": bucket_products[0].get("category_path") or [cat],
            "auto_grouped": len(variants) > 1,
            "confidence": confidence,
            "approved": approved,
            "variants": variants,
        })

    return groups
```

- [ ] **Step 4: Run group tests**

```bash
cd tools/scraper && python -m pytest tests/test_group.py -v
```

Expected: all 11 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/group.py tools/scraper/tests/test_group.py
git commit -m "feat: implement auto-grouping with dimension extraction and confidence scoring"
```

---

### Task 6: Flask API Server

**Files:**

- Create: `tools/scraper/server.py`
- Create: `tools/scraper/tests/test_server.py`

- [ ] **Step 1: Write failing tests**

`tools/scraper/tests/test_server.py`:

```python
import json
import pytest
from pathlib import Path
from server import create_app


@pytest.fixture
def app(tmp_path):
    products = [
        {"id": "dtac1351", "name": "Disc 125mm DYLLU DTAC1351", "sku": "DTAC1351",
         "price_mdl": 10, "image_url": "a.webp", "source_url": "https://example.com/1/",
         "description": None, "category_path": ["Discuri"], "status": "scraped"},
    ]
    groups = [
        {"group_id": "abc123", "group_name": "Disc DYLLU", "category_path": ["Discuri"],
         "auto_grouped": False, "confidence": "singleton", "approved": False,
         "variants": [{"sku": "DTAC1351", "size": "125mm", "price_mdl": 10,
                       "image_url": "a.webp", "source_url": "https://example.com/1/",
                       "description": None}]},
    ]
    (tmp_path / "products.json").write_text(json.dumps(products))
    (tmp_path / "groups.json").write_text(json.dumps(groups))
    (tmp_path / "progress.json").write_text(json.dumps({"next_url": None, "scraped_urls": []}))
    app = create_app(data_dir=tmp_path)
    app.config["TESTING"] = True
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def test_get_products(client):
    r = client.get("/api/products")
    assert r.status_code == 200
    assert r.get_json()[0]["sku"] == "DTAC1351"


def test_get_groups(client):
    r = client.get("/api/groups")
    assert r.status_code == 200
    assert r.get_json()[0]["group_id"] == "abc123"


def test_get_progress(client):
    r = client.get("/api/progress")
    assert r.status_code == 200
    assert "scraped_urls" in r.get_json()


def test_approve_group(client, app):
    client.post("/api/groups/abc123/approve")
    groups = json.loads((app.config["DATA_DIR"] / "groups.json").read_text())
    assert groups[0]["approved"] is True


def test_split_group(client, app):
    client.post("/api/groups/abc123/split")
    groups = json.loads((app.config["DATA_DIR"] / "groups.json").read_text())
    assert all(len(g["variants"]) == 1 for g in groups)


def test_rename_group(client, app):
    client.patch("/api/groups/abc123", json={"group_name": "New Name"})
    groups = json.loads((app.config["DATA_DIR"] / "groups.json").read_text())
    assert groups[0]["group_name"] == "New Name"


def test_export(client, app):
    client.post("/api/groups/abc123/approve")
    client.post("/api/export")
    export_file = app.config["DATA_DIR"] / "products_curated.json"
    assert export_file.exists()
    assert len(json.loads(export_file.read_text())) == 1
```

- [ ] **Step 2: Run to confirm failures**

```bash
cd tools/scraper && python -m pytest tests/test_server.py -v 2>&1 | head -5
```

Expected: `ModuleNotFoundError: No module named 'server'`

- [ ] **Step 3: Implement server.py**

`tools/scraper/server.py`:

```python
import hashlib
import json
import time
from pathlib import Path

from flask import Flask, Response, jsonify, request, render_template

from scrape import write_json_atomic
from group import _score_confidence


def create_app(data_dir: Path | None = None) -> Flask:
    app = Flask(__name__)

    if data_dir is None:
        from config import DATA_DIR
        data_dir = DATA_DIR

    app.config["DATA_DIR"] = data_dir

    def _read(filename: str) -> list | dict:
        path = data_dir / filename
        if not path.exists():
            return {} if filename == "progress.json" else []
        try:
            return json.loads(path.read_text())
        except (json.JSONDecodeError, OSError):
            return {} if filename == "progress.json" else []

    def _write_groups(groups: list) -> None:
        write_json_atomic(groups, data_dir / "groups.json")

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.route("/api/products")
    def get_products():
        return jsonify(_read("products.json"))

    @app.route("/api/groups")
    def get_groups():
        return jsonify(_read("groups.json"))

    @app.route("/api/progress")
    def get_progress():
        return jsonify(_read("progress.json"))

    @app.route("/api/groups/<group_id>/approve", methods=["POST"])
    def approve_group(group_id: str):
        groups = _read("groups.json")
        for g in groups:
            if g["group_id"] == group_id:
                g["approved"] = True
        _write_groups(groups)
        return jsonify({"ok": True})

    @app.route("/api/groups/<group_id>/split", methods=["POST"])
    def split_group(group_id: str):
        groups = _read("groups.json")
        new_groups = []
        for g in groups:
            if g["group_id"] != group_id:
                new_groups.append(g)
                continue
            for variant in g["variants"]:
                gid = hashlib.md5(f"split:{variant['sku']}".encode()).hexdigest()[:12]
                new_groups.append({
                    "group_id": gid,
                    "group_name": g["group_name"],
                    "category_path": g["category_path"],
                    "auto_grouped": False,
                    "confidence": "singleton",
                    "approved": False,
                    "variants": [variant],
                })
        _write_groups(new_groups)
        return jsonify({"ok": True})

    @app.route("/api/groups/merge", methods=["POST"])
    def merge_groups():
        body = request.get_json() or {}
        source_id = body.get("source_id")
        target_id = body.get("target_id")
        groups = _read("groups.json")
        source = next((g for g in groups if g["group_id"] == source_id), None)
        target = next((g for g in groups if g["group_id"] == target_id), None)
        if not source or not target:
            return jsonify({"error": "group not found"}), 404
        target["variants"] = target["variants"] + source["variants"]
        target["auto_grouped"] = True
        target["approved"] = False
        target["confidence"] = _score_confidence(target["variants"])
        _write_groups([g for g in groups if g["group_id"] != source_id])
        return jsonify({"ok": True})

    @app.route("/api/groups/<group_id>", methods=["PATCH"])
    def update_group(group_id: str):
        body = request.get_json() or {}
        groups = _read("groups.json")
        for g in groups:
            if g["group_id"] == group_id:
                if "group_name" in body:
                    g["group_name"] = body["group_name"]
                if "category_path" in body:
                    g["category_path"] = body["category_path"]
        _write_groups(groups)
        return jsonify({"ok": True})

    @app.route("/api/export", methods=["POST"])
    def export():
        groups = _read("groups.json")
        approved = [g for g in groups if g.get("approved") or g.get("confidence") == "singleton"]
        write_json_atomic(approved, data_dir / "products_curated.json")
        return jsonify({"ok": True, "count": len(approved)})

    @app.route("/events")
    def events():
        def generate():
            last_mtime = 0.0
            watched = [data_dir / f for f in ("products.json", "groups.json", "progress.json")]
            while True:
                mtime = max((f.stat().st_mtime for f in watched if f.exists()), default=0.0)
                if mtime > last_mtime:
                    last_mtime = mtime
                    payload = {
                        "products": _read("products.json"),
                        "groups": _read("groups.json"),
                        "progress": _read("progress.json"),
                    }
                    yield f"data: {json.dumps(payload)}\n\n"
                time.sleep(1)

        return Response(
            generate(),
            mimetype="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return app
```

- [ ] **Step 4: Run server tests**

```bash
cd tools/scraper && python -m pytest tests/test_server.py -v
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/server.py tools/scraper/tests/test_server.py
git commit -m "feat: implement Flask API server with approve/split/merge/export and SSE"
```

---

### Task 7: Curation UI

**Files:**

- Create: `tools/scraper/templates/index.html`

- [ ] **Step 1: Create the single-page UI**

`tools/scraper/templates/index.html`:

```html
<!DOCTYPE html>
<html lang="ro">
  <head>
    <meta charset="UTF-8" />
    <title>DYLLU Scraper</title>
    <style>
      *,
      *::before,
      *::after {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      body {
        font-family: system-ui, sans-serif;
        font-size: 14px;
        background: #f5f5f5;
        color: #222;
      }

      #topbar {
        position: sticky;
        top: 0;
        z-index: 100;
        background: #1a1a2e;
        color: #fff;
        padding: 10px 16px;
        display: flex;
        gap: 24px;
        align-items: center;
      }
      #topbar .stat {
        display: flex;
        flex-direction: column;
      }
      #topbar .stat span:first-child {
        font-size: 11px;
        opacity: 0.7;
        text-transform: uppercase;
      }
      #topbar .stat span:last-child {
        font-weight: 700;
        font-size: 16px;
      }
      #status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #888;
        margin-right: 6px;
      }
      #status-dot.running {
        background: #4caf50;
        animation: pulse 1.5s infinite;
      }
      #status-dot.done {
        background: #2196f3;
      }
      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.4;
        }
      }
      #export-btn {
        margin-left: auto;
        padding: 8px 18px;
        background: #4caf50;
        color: #fff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
      }
      #export-btn:hover {
        background: #388e3c;
      }
      #export-count {
        font-size: 12px;
        opacity: 0.8;
        margin-left: 8px;
      }

      #tabs {
        display: flex;
        border-bottom: 2px solid #ddd;
        background: #fff;
        padding: 0 16px;
      }
      .tab {
        padding: 10px 20px;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -2px;
        color: #666;
      }
      .tab.active {
        color: #1a1a2e;
        border-bottom-color: #1a1a2e;
        font-weight: 600;
      }

      #filters {
        padding: 10px 16px;
        background: #fff;
        border-bottom: 1px solid #eee;
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      #filters select {
        padding: 5px 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
      }

      #main {
        padding: 16px;
        max-width: 1400px;
        margin: 0 auto;
      }

      .group-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 12px;
      }
      .group-card {
        background: #fff;
        border-radius: 8px;
        border: 1px solid #e0e0e0;
        padding: 14px;
      }
      .group-card.confidence-high {
        border-left: 4px solid #4caf50;
      }
      .group-card.confidence-medium {
        border-left: 4px solid #ff9800;
      }
      .group-card.confidence-low {
        border-left: 4px solid #f44336;
      }
      .group-card.confidence-singleton {
        border-left: 4px solid #9e9e9e;
      }
      .group-card.approved {
        opacity: 0.8;
      }
      .group-name {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 6px;
        cursor: text;
      }
      .group-name:focus {
        outline: 1px dashed #aaa;
      }
      .group-meta {
        font-size: 12px;
        color: #888;
        margin-bottom: 8px;
        display: flex;
        gap: 10px;
      }
      .badge {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
      }
      .badge-high {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .badge-medium {
        background: #fff3e0;
        color: #e65100;
      }
      .badge-low {
        background: #ffebee;
        color: #c62828;
      }
      .badge-singleton {
        background: #f5f5f5;
        color: #616161;
      }
      .variants {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 10px;
      }
      .variant-chip {
        padding: 3px 10px;
        background: #f0f4ff;
        border-radius: 12px;
        font-size: 12px;
        cursor: default;
        position: relative;
      }
      .variant-chip:hover .chip-preview {
        display: block;
      }
      .chip-preview {
        display: none;
        position: absolute;
        bottom: calc(100% + 6px);
        left: 0;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 6px;
        padding: 8px;
        z-index: 200;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      .chip-preview img {
        width: 80px;
        height: 64px;
        object-fit: contain;
        display: block;
        margin-bottom: 4px;
      }
      .group-actions {
        display: flex;
        gap: 6px;
      }
      .btn {
        padding: 5px 12px;
        border-radius: 4px;
        border: 1px solid #ddd;
        background: #fff;
        cursor: pointer;
        font-size: 12px;
      }
      .btn-approve {
        background: #4caf50;
        color: #fff;
        border-color: #4caf50;
      }
      .btn-approve:hover {
        background: #388e3c;
      }
      .btn-split {
        color: #e65100;
        border-color: #ffcc80;
      }
      .btn-split:hover {
        background: #fff3e0;
      }

      #products-table {
        width: 100%;
        border-collapse: collapse;
        background: #fff;
        border-radius: 8px;
        overflow: hidden;
      }
      #products-table th {
        background: #f5f5f5;
        text-align: left;
        padding: 8px 10px;
        font-size: 12px;
        text-transform: uppercase;
        color: #888;
      }
      #products-table td {
        padding: 8px 10px;
        border-top: 1px solid #f0f0f0;
        font-size: 13px;
      }
      .status-badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
      }
      .status-grouped {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .status-singleton {
        background: #f5f5f5;
        color: #616161;
      }
      .status-failed {
        background: #ffebee;
        color: #c62828;
      }

      #progress-panel {
        background: #fff;
        border-radius: 8px;
        padding: 20px;
      }
      .progress-bar-wrap {
        background: #e0e0e0;
        border-radius: 4px;
        height: 8px;
        margin: 8px 0 16px;
      }
      .progress-bar-fill {
        background: #4caf50;
        height: 100%;
        border-radius: 4px;
        transition: width 0.4s;
      }
      #current-url {
        font-size: 12px;
        color: #888;
        word-break: break-all;
        margin-top: 8px;
      }
    </style>
  </head>
  <body>
    <div id="topbar">
      <span id="status-dot"></span>
      <div class="stat">
        <span>Products</span><span id="stat-products">0</span>
      </div>
      <div class="stat"><span>Groups</span><span id="stat-groups">0</span></div>
      <div class="stat">
        <span>Approved</span><span id="stat-approved">0</span>
      </div>
      <button id="export-btn" onclick="doExport()">Export</button>
      <span id="export-count"></span>
    </div>

    <div id="tabs">
      <div class="tab active" onclick="showTab('progress')">Progress</div>
      <div class="tab" onclick="showTab('groups')">Groups</div>
      <div class="tab" onclick="showTab('products')">All Products</div>
    </div>

    <div id="filters" style="display:none">
      <select id="filter-confidence" onchange="renderGroups()">
        <option value="">All confidence</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
        <option value="singleton">Singleton</option>
      </select>
      <select id="filter-approved" onchange="renderGroups()">
        <option value="">All status</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
      </select>
      <select id="filter-category" onchange="renderGroups()">
        <option value="">All categories</option>
      </select>
    </div>

    <div id="main">
      <div id="tab-progress">
        <div id="progress-panel">
          <h3>Scraping Progress</h3>
          <div class="progress-bar-wrap">
            <div
              class="progress-bar-fill"
              id="progress-fill"
              style="width:0%"
            ></div>
          </div>
          <div id="progress-label">Waiting for scraper...</div>
          <div id="current-url"></div>
        </div>
      </div>

      <div id="tab-groups" style="display:none">
        <div class="group-grid" id="groups-grid"></div>
      </div>

      <div id="tab-products" style="display:none">
        <table id="products-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Price (MDL)</th>
              <th>Category</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="products-body"></tbody>
        </table>
      </div>
    </div>

    <script>
      let _products = [],
        _groups = [],
        _progress = {};

      const es = new EventSource("/events");
      es.onmessage = (e) => {
        const d = JSON.parse(e.data);
        _products = d.products || [];
        _groups = d.groups || [];
        _progress = d.progress || {};
        updateTopBar();
        renderCurrentTab();
      };

      function updateTopBar() {
        const dot = document.getElementById("status-dot");
        dot.className = _progress.next_url ? "running" : "done";
        document.getElementById("stat-products").textContent = _products.length;
        document.getElementById("stat-groups").textContent = _groups.length;
        document.getElementById("stat-approved").textContent = _groups.filter(
          (g) => g.approved
        ).length;
        const cats = [
          ...new Set(_groups.flatMap((g) => g.category_path || [])),
        ].sort();
        const sel = document.getElementById("filter-category");
        const cur = sel.value;
        sel.innerHTML =
          '<option value="">All categories</option>' +
          cats
            .map(
              (c) =>
                `<option value="${esc(c)}"${c === cur ? " selected" : ""}>${esc(c)}</option>`
            )
            .join("");
      }

      function showTab(name) {
        ["progress", "groups", "products"].forEach((t) => {
          document.getElementById("tab-" + t).style.display =
            t === name ? "" : "none";
        });
        document
          .querySelectorAll(".tab")
          .forEach((el, i) =>
            el.classList.toggle(
              "active",
              ["progress", "groups", "products"][i] === name
            )
          );
        document.getElementById("filters").style.display =
          name === "groups" ? "" : "none";
        renderCurrentTab();
      }

      function renderCurrentTab() {
        const active = ["progress", "groups", "products"].find(
          (t) => document.getElementById("tab-" + t).style.display !== "none"
        );
        if (active === "groups") renderGroups();
        if (active === "products") renderProducts();
        if (active === "progress") renderProgress();
      }

      function renderProgress() {
        const scraped = (_progress.scraped_urls || []).length;
        document.getElementById("progress-label").textContent =
          scraped +
          " products scraped" +
          (_progress.next_url ? " — running..." : " — complete");
        document.getElementById("current-url").textContent =
          _progress.next_url || "";
        document.getElementById("progress-fill").style.width =
          Math.min(100, (scraped / 903) * 100) + "%";
      }

      function renderGroups() {
        const conf = document.getElementById("filter-confidence").value;
        const status = document.getElementById("filter-approved").value;
        const cat = document.getElementById("filter-category").value;
        let list = _groups;
        if (conf) list = list.filter((g) => g.confidence === conf);
        if (status === "approved") list = list.filter((g) => g.approved);
        if (status === "pending") list = list.filter((g) => !g.approved);
        if (cat)
          list = list.filter((g) => (g.category_path || []).includes(cat));

        document.getElementById("groups-grid").innerHTML = list
          .map(
            (g) => `
      <div class="group-card confidence-${g.confidence}${g.approved ? " approved" : ""}" data-id="${esc(g.group_id)}">
        <div class="group-name" contenteditable="true"
             onblur="renameGroup('${esc(g.group_id)}',this.textContent)">${esc(g.group_name)}</div>
        <div class="group-meta">
          <span class="badge badge-${g.confidence}">${g.confidence}</span>
          <span>${esc((g.category_path || []).join(" › "))}</span>
        </div>
        <div class="variants">
          ${(g.variants || [])
            .map(
              (v) => `
            <span class="variant-chip">${esc(v.size || v.sku || "?")}
              <div class="chip-preview">
                ${v.image_url ? `<img src="${esc(v.image_url)}" />` : ""}
                <div>${esc(v.sku || "")}</div><div>${v.price_mdl} MDL</div>
              </div>
            </span>`
            )
            .join("")}
        </div>
        <div class="group-actions">
          ${
            !g.approved
              ? `<button class="btn btn-approve" onclick="approve('${esc(g.group_id)}')">Approve</button>`
              : '<span style="color:#4caf50;font-size:12px;">✓ Approved</span>'
          }
          <button class="btn btn-split" onclick="split('${esc(g.group_id)}')">Split</button>
        </div>
      </div>`
          )
          .join("");
      }

      function renderProducts() {
        const grouped = new Set(
          _groups.flatMap((g) =>
            g.variants.length > 1 ? g.variants.map((v) => v.sku) : []
          )
        );
        document.getElementById("products-body").innerHTML = _products
          .map(
            (p) => `
      <tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.sku || "")}</td>
        <td>${p.price_mdl || ""}</td>
        <td>${esc((p.category_path || []).join(" › "))}</td>
        <td><span class="status-badge status-${grouped.has(p.sku) ? "grouped" : p.status}">${grouped.has(p.sku) ? "grouped" : p.status}</span></td>
      </tr>`
          )
          .join("");
      }

      function esc(s) {
        return String(s || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      async function approve(gid) {
        await fetch(`/api/groups/${gid}/approve`, { method: "POST" });
      }

      async function split(gid) {
        if (!confirm("Split this group into individual products?")) return;
        await fetch(`/api/groups/${gid}/split`, { method: "POST" });
      }

      async function renameGroup(gid, name) {
        await fetch(`/api/groups/${gid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_name: name.trim() }),
        });
      }

      async function doExport() {
        const r = await fetch("/api/export", { method: "POST" });
        const d = await r.json();
        document.getElementById("export-count").textContent =
          `${d.count} products exported`;
      }
    </script>
  </body>
</html>
```

- [ ] **Step 2: Verify Flask renders it**

```bash
cd tools/scraper && python -c "
import tempfile
from pathlib import Path
from server import create_app
with tempfile.TemporaryDirectory() as tmp:
    app = create_app(Path(tmp))
    with app.test_client() as c:
        r = c.get('/')
        print('Status:', r.status_code)
        print('Has groups-grid:', b'groups-grid' in r.data)
"
```

Expected: `Status: 200`, `Has groups-grid: True`

- [ ] **Step 3: Commit**

```bash
git add tools/scraper/templates/index.html
git commit -m "feat: add single-page curation UI with tabs, SSE, and group management"
```

---

### Task 8: Entry Point & Image Downloader

**Files:**

- Create: `tools/scraper/run.py`
- Create: `tools/scraper/download_images.py`

- [ ] **Step 1: Create run.py**

`tools/scraper/run.py`:

```python
import logging
import subprocess
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

BASE = Path(__file__).parent


def main() -> None:
    from config import (
        CATALOG_START_URL, PRODUCTS_FILE, PROGRESS_FILE, GROUPS_FILE,
        FLASK_PORT, DELAY_BETWEEN_PRODUCTS, DELAY_BETWEEN_PAGES,
    )

    server_proc = subprocess.Popen(
        [sys.executable, "-m", "flask", "--app", "server:create_app()",
         "run", "--port", str(FLASK_PORT), "--no-debugger", "--no-reload"],
        cwd=BASE,
    )
    print(f"\nCuration UI → http://localhost:{FLASK_PORT}\n")
    time.sleep(2)

    try:
        from scrape import run_scraper
        run_scraper(
            start_url=CATALOG_START_URL,
            products_file=PRODUCTS_FILE,
            progress_file=PROGRESS_FILE,
            groups_file=GROUPS_FILE,
            delay_product=DELAY_BETWEEN_PRODUCTS,
            delay_page=DELAY_BETWEEN_PAGES,
        )
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server_proc.terminate()


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Create download_images.py**

`tools/scraper/download_images.py`:

```python
import json
import sys
import time
from pathlib import Path

import requests


def download_images(curated_file: Path, out_dir: Path, delay: float = 0.5) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    groups = json.loads(curated_file.read_text())
    headers = {"User-Agent": "Mozilla/5.0"}
    total = sum(len(g["variants"]) for g in groups)
    done = 0
    for group in groups:
        for variant in group["variants"]:
            url = variant.get("image_url")
            sku = variant.get("sku") or "unknown"
            if not url:
                done += 1
                continue
            ext = url.rsplit(".", 1)[-1].split("?")[0]
            dest = out_dir / f"{sku}.{ext}"
            if dest.exists():
                done += 1
                continue
            try:
                resp = requests.get(url, headers=headers, timeout=20)
                resp.raise_for_status()
                dest.write_bytes(resp.content)
                done += 1
                print(f"[{done}/{total}] {sku}.{ext}")
            except requests.RequestException as exc:
                print(f"FAILED {sku}: {exc}", file=sys.stderr)
            time.sleep(delay)


if __name__ == "__main__":
    from config import EXPORT_FILE, DATA_DIR
    download_images(EXPORT_FILE, DATA_DIR / "images")
```

- [ ] **Step 3: Verify imports**

```bash
cd tools/scraper && python -c "import run; import download_images; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Run full test suite**

```bash
cd tools/scraper && python -m pytest tests/ -v
```

Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add tools/scraper/run.py tools/scraper/download_images.py
git commit -m "feat: add entry point and image downloader"
```

---

## Usage

```bash
# Install dependencies
pip install -r tools/scraper/requirements.txt

# Run scraper + UI together
cd tools/scraper && python run.py
# → Open http://localhost:5001

# After export, download images
cd tools/scraper && python download_images.py
```

---

## Self-Review

**Spec coverage:**

- ✓ Python + requests + BeautifulSoup — all tasks
- ✓ WooCommerce JSON API (`woo_ajax=1`) pagination — Task 2/4
- ✓ Product detail fetch: description + category breadcrumbs — Task 3
- ✓ 1.5s/3.0s configurable delays — config.py + run_scraper
- ✓ Exponential backoff on 429/503 — fetch_page
- ✓ Resume via progress.json checkpoint — Task 4
- ✓ Auto-grouping with dimension regex extraction — Task 5
- ✓ High/medium/low/singleton confidence — Task 5
- ✓ Flask SSE real-time updates — server.py /events
- ✓ Three tabs: Progress, Groups, All Products — index.html
- ✓ Approve / Split / Merge / Rename — server.py + index.html
- ✓ Export to products_curated.json — Task 6
- ✓ run.py launches both processes — Task 8
- ✓ download_images.py — Task 8
- ✓ Failed products marked status="failed" + visible in UI

**Type consistency:**

- `parse_catalog_page` → `tuple[list[dict], str | None]` — matches usage in `run_scraper`
- `group_products` → `list[dict]` — called correctly in `run_scraper` and `server.py`
- `_score_confidence` imported in `server.py` from `group` — defined in `group.py`
- `write_json_atomic` imported in `server.py` from `scrape` — defined in `scrape.py`
