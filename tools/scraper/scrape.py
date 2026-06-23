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
