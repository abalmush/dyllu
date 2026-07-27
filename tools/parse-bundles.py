#!/usr/bin/env python3
"""Build an auditable bundle/include/accessory graph from the DYLLU CSV."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from bundle_catalog import parse_catalog, summarize_catalog


def _write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(f"{path.suffix}.tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("output_path", nargs="?", type=Path, default=Path("bundles.json"))
    parser.add_argument("--report", type=Path, help="optional JSON summary/audit report")
    args = parser.parse_args()

    products = parse_catalog(args.csv_path)
    report = summarize_catalog(products)
    _write_json(args.output_path, products)
    if args.report:
        _write_json(args.report, report)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"wrote {args.output_path}")
    if args.report:
        print(f"wrote {args.report}")


if __name__ == "__main__":
    main()
