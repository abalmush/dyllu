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
