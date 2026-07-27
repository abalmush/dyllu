from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path
from typing import Any

try:
    from .build_medusa_catalog_payload import CANONICAL_SOURCE, build_payload
except ImportError:
    from build_medusa_catalog_payload import CANONICAL_SOURCE, build_payload


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMAGE_MANIFEST = REPOSITORY_ROOT / "tools/transparent-manifest.json"


def audit_components(
    payload: dict[str, Any], image_manifest: list[dict[str, Any]]
) -> dict[str, Any]:
    items = payload["items"]
    parents_by_component: dict[str, set[str]] = defaultdict(set)
    for parent_sku, entry in items.items():
        for component in entry["components"]:
            component_sku = component.get("component_sku")
            if component_sku:
                parents_by_component[component_sku].add(parent_sku)

    image_skus = {
        str(entry.get("name", "")).strip().upper()
        for entry in image_manifest
        if entry.get("url")
    }
    missing_catalog_rows = sorted(
        sku for sku in parents_by_component if sku not in items
    )
    missing_images = sorted(
        sku
        for sku in parents_by_component
        if sku not in image_skus
        and (sku not in items or not items[sku].get("picture"))
    )

    def issue(sku: str) -> dict[str, Any]:
        return {
            "sku": sku,
            "referenced_by": sorted(parents_by_component[sku]),
        }

    return {
        "source": payload["source"],
        "referenced_component_skus": len(parents_by_component),
        "missing_catalog_rows": [issue(sku) for sku in missing_catalog_rows],
        "missing_component_images": [issue(sku) for sku in missing_images],
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Audit included component references from the canonical catalog."
    )
    parser.add_argument("--source", type=Path, default=CANONICAL_SOURCE)
    parser.add_argument(
        "--image-manifest", type=Path, default=DEFAULT_IMAGE_MANIFEST
    )
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()

    payload = build_payload(args.source)
    image_manifest = json.loads(args.image_manifest.read_text(encoding="utf-8"))
    report = audit_components(payload, image_manifest)
    serialized = json.dumps(report, ensure_ascii=False, indent=2) + "\n"

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
    else:
        print(serialized, end="")


if __name__ == "__main__":
    main()
