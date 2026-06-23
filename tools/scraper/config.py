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
