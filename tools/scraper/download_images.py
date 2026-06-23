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
