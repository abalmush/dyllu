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
