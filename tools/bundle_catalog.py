"""Pure DYLLU catalog parsing for included items and SKU relationships.

The catalog is intentionally treated as an external input boundary.  This
module does not know about SQLite and performs no writes; callers can inspect
the resulting graph before choosing whether to migrate it.
"""

from __future__ import annotations

import csv
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable, Sequence


REQUIRED_COLUMNS = (
    "Dyllu item No.",
    "Product name",
    "Description & Features",
    "Packed by",
)

_INCLUDE_SECTION = re.compile(
    r"^\s*(?:include(?:d|s)?|nclude)\s*:?\s*(.*)$",
    re.IGNORECASE,
)
_INCLUDE_WORD = re.compile(r"\binclude(?:d|s)?\b", re.IGNORECASE)
_NEGATIVE_INCLUSION = re.compile(
    r"\b(?:not\s+include(?:d)?|without|sold\s+separately|no\s+.+\s+included|"
    r"v[aâ]ndut(?:e)?\s+separat|se\s+vinde\s+separat)\b",
    re.IGNORECASE,
)
_PACKAGING_LINE = re.compile(
    r"^\s*(?:packed\s+by|packaged?\s+by|label\s+packaging|ambalat|ambalare)\b",
    re.IGNORECASE,
)
_COMPATIBILITY_LINE = re.compile(
    r"\b(?:compatible\s+with|can\s+be\s+worn\s+on|suitable\s+for|fits?|for\s+use\s+with)\b",
    re.IGNORECASE,
)
_QUANTIFIED_COMPONENT = re.compile(
    r"^\s*(?:[-–—•*]\s*)?(?P<with>with\s+)?"
    r"(?P<qty>\d+|[lI](?=\s+(?:pcs?|pieces?|sets?|pairs?|x|×)\b))"
    r"(?:\s+(?P<duplicate>\d+))?\s*"
    r"(?:(?P<unit>pcs?|pieces?|sets?|pairs?|x|×)\b\s*)?(?P<name>.+?)\s*$",
    re.IGNORECASE,
)
_NEXT_QUANTIFIED_SEGMENT = re.compile(
    r",(?=\s*(?:\d+|[lI])(?:\s+\d+)?\s*(?:pcs?|pieces?|sets?|pairs?|x|×)\b)",
    re.IGNORECASE,
)
_SKU_IN_PARENS = re.compile(r"\(\s*([A-Z][A-Z0-9 -]{2,})\s*\)")
_BUNDLE_NAME = re.compile(
    r"(?:\b(?:set|kit|combo)\b|\b\d+\s*(?:pcs?|pieces?)\b|\b\d+[- ]?in[- ]?1\b)",
    re.IGNORECASE,
)


def _looks_like_sku(value: str) -> bool:
    return bool(re.search(r"[A-Z]", value)) and bool(re.search(r"\d", value))


def _normalize_sku(value: str) -> str | None:
    candidate = re.sub(r"\s+", "", value).upper()
    if not _looks_like_sku(candidate):
        return None
    if not re.fullmatch(r"[A-Z0-9-]{4,}", candidate):
        return None
    return candidate


def _sku_from_line(line: str) -> str | None:
    for match in _SKU_IN_PARENS.finditer(line):
        candidate = _normalize_sku(match.group(1))
        if candidate:
            return candidate
    return None


def _remove_sku_parenthetical(line: str, sku: str | None) -> str:
    if not sku:
        return line

    def replace(match: re.Match[str]) -> str:
        return "" if _normalize_sku(match.group(1)) == sku else match.group(0)

    return _SKU_IN_PARENS.sub(replace, line)


def _quantity(value: str, duplicate: str | None) -> int:
    if duplicate is not None:
        return int(duplicate)
    if value.lower() in {"l", "i"}:
        return 1
    return int(value)


def _unit(value: str | None) -> str:
    if value is None:
        return "pcs"
    normalized = value.lower()
    if normalized in {"pc", "pcs", "piece", "pieces"}:
        return "pcs"
    if normalized in {"set", "sets"}:
        return "set"
    if normalized in {"pair", "pairs"}:
        return "pair"
    return "x"


def _parse_component_segment(segment: str) -> dict[str, Any] | None:
    match = _QUANTIFIED_COMPONENT.match(segment)
    if not match:
        return None
    sku = _sku_from_line(match.group("name"))
    name = _remove_sku_parenthetical(match.group("name"), sku).strip(" .,:;-")
    if not name:
        return None
    return {
        "qty": _quantity(match.group("qty"), match.group("duplicate")),
        "unit": _unit(match.group("unit")),
        "name": name,
        "component_sku": sku,
        "relationship": "included",
        "source_line": segment.strip(),
    }


def _parse_component_line(line: str) -> list[dict[str, Any]]:
    # A few rows use one line such as "1 x safe, 2 x key, 4x bolts".
    segments = _NEXT_QUANTIFIED_SEGMENT.split(line)
    parsed = [_parse_component_segment(segment) for segment in segments]
    return [component for component in parsed if component is not None]


def parse_description(description: str, *, bundle_hint: bool = False) -> dict[str, list[Any]]:
    """Extract conservative graph edges and audit notes from one description.

    Loose components are accepted only inside an explicit Include section.
    Outside such a section, an item must either start with "With N..." or carry
    a SKU reference. This avoids turning numeric specifications into contents.
    """

    components: list[dict[str, Any]] = []
    included_items: list[dict[str, Any]] = []
    accessories: list[dict[str, Any]] = []
    review_notes: list[str] = []
    in_include_section = False
    saw_include_section = False

    normalized_description = re.sub(
        r"(?i)(?<!^)(include(?:d|s)?\s*:)", r"\n\1", description
    )
    for raw_line in normalized_description.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        if _NEGATIVE_INCLUSION.search(line):
            review_notes.append(line)
            continue

        marker = _INCLUDE_SECTION.match(line)
        if marker:
            in_include_section = True
            saw_include_section = True
            line = marker.group(1).strip()
            if not line:
                continue

        if _PACKAGING_LINE.match(line):
            in_include_section = False
            continue

        parsed = _parse_component_line(line)
        if parsed:
            explicit_with = bool(re.match(r"^\s*with\b", line, re.IGNORECASE))
            has_sku = any(component["component_sku"] for component in parsed)
            if in_include_section or bundle_hint:
                components.extend(parsed)
                continue
            if explicit_with or has_sku:
                included_items.extend(parsed)
                continue

        sku = _sku_from_line(line)
        if sku and _COMPATIBILITY_LINE.search(line):
            accessories.append(
                {
                    "target_sku": sku,
                    "relationship": "compatible_with",
                    "source_line": line,
                }
            )
            continue

        if _INCLUDE_WORD.search(line) and not marker:
            review_notes.append(line)

    if saw_include_section and not components:
        review_notes.append("Include section has no safely quantified components")

    return {
        "components": components,
        "included_items": included_items,
        "accessories": accessories,
        "review_notes": list(dict.fromkeys(review_notes)),
    }


def _header_index(rows: Sequence[Sequence[str]]) -> int:
    for index, row in enumerate(rows):
        values = set(row)
        if all(column in values for column in REQUIRED_COLUMNS):
            return index
    raise ValueError(f"CSV header does not contain required columns: {', '.join(REQUIRED_COLUMNS)}")


def parse_catalog_rows(rows: Sequence[Sequence[str]]) -> list[dict[str, Any]]:
    header_index = _header_index(rows)
    header = list(rows[header_index])
    column = {name: header.index(name) for name in REQUIRED_COLUMNS}
    required_width = max(column.values()) + 1

    products: list[dict[str, Any]] = []
    seen_skus: set[str] = set()
    for row_number, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        if len(row) < required_width:
            continue
        sku = row[column["Dyllu item No."]].strip().upper()
        if not sku:
            continue
        if sku in seen_skus:
            raise ValueError(f"Duplicate SKU {sku} on CSV row {row_number}")
        seen_skus.add(sku)

        name = row[column["Product name"]].strip()
        parsed = parse_description(
            row[column["Description & Features"]],
            bundle_hint=bool(_BUNDLE_NAME.search(name)),
        )
        # Some prose lists the product itself as an included item (for example
        # "1 x safe" on an Electronic safe). Keep the packaging contents, but
        # do not create a self-component with no SKU.
        normalized_name = re.sub(r"[^a-z0-9]+", " ", name.lower()).strip()
        parsed["included_items"] = [
            item
            for item in parsed["included_items"]
            if item["component_sku"]
            or item["qty"] != 1
            or not normalized_name.endswith(
                re.sub(r"[^a-z0-9]+", " ", item["name"].lower()).strip()
            )
        ]
        products.append(
            {
                "sku": sku,
                "name": name,
                "is_bundle": bool(parsed["components"]),
                "packaging": row[column["Packed by"]].strip().lower() or None,
                **parsed,
            }
        )

    catalog_skus = {product["sku"] for product in products}
    bundle_skus = {product["sku"] for product in products if product["is_bundle"]}
    for product in products:
        for component in [*product["components"], *product["included_items"]]:
            sku = component["component_sku"]
            if not sku:
                component["type"] = "loose"
            elif sku in catalog_skus:
                component["type"] = "linked"
                component["is_sub_bundle"] = sku in bundle_skus
            else:
                component["type"] = "external"
                component["is_sub_bundle"] = False
        for accessory in product["accessories"]:
            accessory["type"] = "linked" if accessory["target_sku"] in catalog_skus else "external"
    return products


def parse_catalog(path: str | Path) -> list[dict[str, Any]]:
    with Path(path).open(newline="", encoding="utf-8-sig") as source:
        return parse_catalog_rows(list(csv.reader(source)))


def summarize_catalog(products: Iterable[dict[str, Any]]) -> dict[str, Any]:
    product_list = list(products)
    components = [component for product in product_list for component in product["components"]]
    included_items = [item for product in product_list for item in product["included_items"]]
    accessories = [accessory for product in product_list for accessory in product["accessories"]]
    broken_components = Counter(
        component["component_sku"]
        for component in components
        if component["type"] == "external" and component["component_sku"]
    )
    review_products = [product["sku"] for product in product_list if product["review_notes"]]
    return {
        "products": len(product_list),
        "bundles": sum(product["is_bundle"] for product in product_list),
        "components": len(components),
        "linked_components": sum(component["type"] == "linked" for component in components),
        "loose_components": sum(component["type"] == "loose" for component in components),
        "external_components": sum(component["type"] == "external" for component in components),
        "component_units": dict(Counter(component["unit"] for component in components)),
        "additional_included_items": len(included_items),
        "linked_included_items": sum(item["type"] == "linked" for item in included_items),
        "accessory_edges": len(accessories),
        "sub_bundle_edges": sum(bool(component.get("is_sub_bundle")) for component in components),
        "broken_component_skus": dict(sorted(broken_components.items())),
        "review_products": review_products,
        "review_product_count": len(review_products),
    }
