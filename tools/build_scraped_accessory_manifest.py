from __future__ import annotations

import json
import re
from pathlib import Path

from bundle_catalog import parse_description


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "apps/backend/data/ingco/products"
OUTPUT = ROOT / "tools/scraped-accessory-manifest.json"
POWER_RE = re.compile(
    r"\b(acumulator(?:i)?|bater(?:ie|ii)|battery|batteries|battery\s+pack|"
    r"încărcător|incarcator|charger)\b",
    re.IGNORECASE,
)


def main() -> None:
    entries: list[dict[str, object]] = []
    for path in sorted(SOURCE_DIR.glob("*.json")):
        source = json.loads(path.read_text(encoding="utf-8"))
        parsed = parse_description(source.get("descriptionText", ""))
        components = [
            {
                "qty": component["qty"],
                "unit": component["unit"],
                "name": component["name"],
                "sku": component["component_sku"],
                "resolution": "linked" if component["component_sku"] else "loose",
            }
            for component in [
                *parsed["components"],
                *parsed["included_items"],
            ]
        ]
        power_components = [
            component
            for component in components
            if POWER_RE.search(str(component["name"])) and component["sku"]
        ]
        if not power_components:
            continue
        entries.append(
            {
                "source_id": str(source["sourceId"]),
                "source_url": source["sourceUrl"],
                "components": components,
            }
        )

    OUTPUT.write_text(
        json.dumps(entries, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"entries={len(entries)} manifest={OUTPUT}")


if __name__ == "__main__":
    main()
