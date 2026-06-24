import json
import logging
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


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
    image_url = (img.get("data-src") or img.get("src")) if img else None
    if image_url and image_url.endswith("lazy.svg"):
        image_url = None

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
            save_checkpoint({"next_url": next_url, "scraped_urls": list(scraped_urls)}, progress_file)
            return

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
