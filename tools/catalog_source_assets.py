# /// script
# requires-python = ">=3.12"
# dependencies = ["numbers-parser==4.18.5"]
# ///

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import struct
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from numbers_parser import Document


SKU_HEADER = "Dyllu item No."
PICTURE_HEADER = "Picture"


def number(value: str | None) -> float:
    normalized = (value or "").strip().replace(",", "")
    if not normalized:
        return 0
    try:
        return float(normalized)
    except ValueError:
        return 0


def quality(width: int, height: int) -> str:
    shorter = min(width, height)
    if shorter >= 500:
        return "good"
    if shorter >= 300:
        return "review"
    if shorter >= 200:
        return "low"
    return "poor"


def image_dimensions(image_bytes: bytes, image_format: str) -> tuple[int, int] | None:
    if image_format == "PNG" and image_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return struct.unpack(">II", image_bytes[16:24])
    if image_format not in {"JPG", "JPEG"} or not image_bytes.startswith(b"\xff\xd8"):
        return None

    position = 2
    start_of_frame = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }
    while position + 4 <= len(image_bytes):
        if image_bytes[position] != 0xFF:
            position += 1
            continue
        while position < len(image_bytes) and image_bytes[position] == 0xFF:
            position += 1
        if position >= len(image_bytes):
            break
        marker = image_bytes[position]
        position += 1
        if marker in {0xD8, 0xD9, 0x01} or 0xD0 <= marker <= 0xD7:
            continue
        if position + 2 > len(image_bytes):
            break
        segment_length = int.from_bytes(image_bytes[position : position + 2], "big")
        if segment_length < 2 or position + segment_length > len(image_bytes):
            break
        if marker in start_of_frame and segment_length >= 7:
            height = int.from_bytes(image_bytes[position + 3 : position + 5], "big")
            width = int.from_bytes(image_bytes[position + 5 : position + 7], "big")
            return width, height
        position += segment_length
    return None


def locate_sources(catalog_dir: Path) -> tuple[Path, Path]:
    numbers_files = sorted(catalog_dir.glob("*.numbers"))
    if len(numbers_files) != 1:
        raise ValueError(f"Expected one .numbers file in {catalog_dir}, found {len(numbers_files)}")
    numbers_path = numbers_files[0]
    csv_path = numbers_path.with_suffix(".csv")
    if not csv_path.exists():
        raise FileNotFoundError(f"Matching CSV not found: {csv_path}")
    return csv_path, numbers_path


def read_csv(csv_path: Path) -> tuple[list[str], dict[str, dict[str, str]], dict[str, int]]:
    with csv_path.open(newline="", encoding="utf-8-sig") as source:
        rows = list(csv.reader(source))
    header_index = next(
        index for index, row in enumerate(rows) if row and row[0].strip() == SKU_HEADER
    )
    headers = rows[header_index]
    by_sku: dict[str, dict[str, str]] = {}
    source_rows: dict[str, int] = {}
    for source_row, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        padded = row + [""] * max(0, len(headers) - len(row))
        record = dict(zip(headers, padded, strict=False))
        sku = record.get(SKU_HEADER, "").strip()
        if not sku:
            continue
        by_sku[sku] = record
        source_rows[sku] = source_row
    return headers, by_sku, source_rows


def image_assets(numbers_path: Path) -> tuple[dict[str, dict[str, Any]], dict[str, bytes]]:
    document = Document(numbers_path)
    table = document.default_table
    header_row = next(
        row for row in range(table.num_rows) if str(table.cell(row, 0).value or "").strip() == SKU_HEADER
    )
    picture_column = next(
        column
        for column in range(table.num_cols)
        if str(table.cell(header_row, column).value or "").strip() == PICTURE_HEADER
    )
    sku_rows = [
        (row, str(table.cell(row, 0).value or "").strip())
        for row in range(header_row + 1, table.num_rows)
        if str(table.cell(row, 0).value or "").strip()
    ]
    picture_left = sum(table.col_width(column) for column in range(picture_column))
    picture_right = picture_left + table.col_width(picture_column)
    drawings = []
    objects = document._model.objects
    for object_id, value in objects._objects.items():
        if type(value).__name__ != "ImageArchive" or not value.HasField("data"):
            continue
        geometry = value.super.geometry
        center_x = geometry.position.x + geometry.size.width / 2
        if picture_left <= center_x < picture_right:
            drawings.append((geometry.position.y, object_id, value))
    drawings.sort(key=lambda item: (item[0], item[1]))
    if len(drawings) != len(sku_rows):
        raise ValueError(
            f"Cannot map images safely: found {len(drawings)} product drawings for {len(sku_rows)} SKU rows"
        )

    file_by_identifier: dict[int, str] = {}
    for filename in objects.file_store:
        match = re.search(r"-(\d+)\.[^.]+$", filename)
        if match:
            file_by_identifier[int(match.group(1))] = filename

    index: dict[str, dict[str, Any]] = {}
    content: dict[str, bytes] = {}
    for (_, sku), (_, _, drawing) in zip(sku_rows, drawings, strict=True):
        identifier = drawing.data.identifier
        filename = file_by_identifier.get(identifier)
        if not filename:
            raise ValueError(f"Image data {identifier} for {sku} has no embedded file")
        image_bytes = objects.file_store[filename]
        image_format = Path(filename).suffix.lstrip(".").upper()
        dimensions = image_dimensions(image_bytes, image_format)
        if dimensions:
            width, height = dimensions
        elif drawing.HasField("naturalSize"):
            width = round(drawing.naturalSize.width)
            height = round(drawing.naturalSize.height)
        else:
            raise ValueError(f"Image for {sku} has no dimensions")
        index[sku] = {
            "file": filename,
            "width": width,
            "height": height,
            "bytes": len(image_bytes),
            "format": image_format,
            "quality": quality(width, height),
            "sha256": hashlib.sha256(image_bytes).hexdigest(),
        }
        content[sku] = image_bytes
    return index, content


def build_report(csv_path: Path, numbers_path: Path) -> tuple[dict[str, Any], dict[str, bytes]]:
    _, source_items, source_rows = read_csv(csv_path)
    images, image_content = image_assets(numbers_path)
    if set(source_items) != set(images):
        missing_images = sorted(set(source_items) - set(images))
        missing_rows = sorted(set(images) - set(source_items))
        raise ValueError(
            f"Source mismatch: {len(missing_images)} SKUs without images and {len(missing_rows)} images without CSV rows"
        )

    items = []
    for sku, record in source_items.items():
        received = number(record.get("Qty received"))
        on_way = number(record.get("Qty on the way"))
        planned = number(record.get("Plan to ship Qty"))
        items.append(
            {
                "sku": sku,
                "sourceRow": source_rows[sku],
                "nameEn": record.get("Product name", "").strip(),
                "qtyReceived": received,
                "qtyOnWay": on_way,
                "qtyPlanned": planned,
                "image": images[sku],
            }
        )

    logistics = [
        item
        for item in items
        if item["qtyReceived"] > 0 or item["qtyOnWay"] > 0 or item["qtyPlanned"] > 0
    ]
    image_quality = Counter(item["image"]["quality"] for item in items)
    report = {
        "generatedAt": datetime.now(UTC).isoformat(),
        "sourceCsv": str(csv_path.resolve()),
        "sourceNumbers": str(numbers_path.resolve()),
        "sourceSha256": hashlib.sha256(csv_path.read_bytes()).hexdigest(),
        "summary": {
            "sourceSkus": len(items),
            "embeddedImages": len(images),
            "logisticsSkus": len(logistics),
            "receivedSkus": sum(item["qtyReceived"] > 0 for item in items),
            "onWaySkus": sum(item["qtyOnWay"] > 0 for item in items),
            "plannedSkus": sum(item["qtyPlanned"] > 0 for item in items),
            "imageQuality": dict(sorted(image_quality.items())),
        },
        "items": items,
    }
    return report, image_content


def write_extracted_images(
    report: dict[str, Any],
    content: dict[str, bytes],
    output_dir: Path,
    scope: str,
) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    count = 0
    for item in report["items"]:
        if scope == "received" and item["qtyReceived"] <= 0:
            continue
        if scope == "logistics" and not (
            item["qtyReceived"] > 0 or item["qtyOnWay"] > 0 or item["qtyPlanned"] > 0
        ):
            continue
        extension = Path(item["image"]["file"]).suffix.lower() or ".jpg"
        safe_sku = re.sub(r"[^A-Za-z0-9._-]+", "-", item["sku"])
        (output_dir / f"{safe_sku}{extension}").write_bytes(content[item["sku"]])
        count += 1
    return count


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--extract-dir", type=Path)
    parser.add_argument("--extract-scope", choices=["all", "logistics", "received"], default="all")
    args = parser.parse_args()

    csv_path, numbers_path = locate_sources(args.catalog_dir)
    report, content = build_report(csv_path, numbers_path)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    if args.extract_dir:
        count = write_extracted_images(report, content, args.extract_dir, args.extract_scope)
        print(f"Extracted {count} images to {args.extract_dir}")


if __name__ == "__main__":
    main()
