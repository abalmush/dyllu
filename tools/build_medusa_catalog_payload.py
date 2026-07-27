from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path
from typing import Any

try:
    from .catalog_sync import load_source_rows, parse_source_specifications
    from .specification_translations import DOMAIN_LABELS
except ImportError:
    from catalog_sync import load_source_rows, parse_source_specifications
    from specification_translations import DOMAIN_LABELS


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_SOURCE = (
    REPOSITORY_ROOT
    / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
)

_BATTERY_RE = re.compile(
    r"\b(acumulator(?:i)?|bater(?:ie|ii)|battery|batteries|battery\s+pack)\b",
    re.IGNORECASE,
)
_CHARGER_RE = re.compile(r"\b(încărcător|incarcator|charger)\b", re.IGNORECASE)
_BATTERY_CAPACITY_RE = re.compile(r"\b(\d+(?:[.,]\d+)?)\s*Ah\b", re.IGNORECASE)
_SOLD_SEPARATELY_RE = re.compile(
    r"(?:battery|batteries|acumulator(?:i)?|bater(?:ie|ii)).{0,40}"
    r"(?:sold\s+separately|not\s+included|v[aâ]ndut(?:e)?\s+separat|"
    r"nu\s+(?:este|sunt)\s+inclus)",
    re.IGNORECASE,
)
_CHARGER_SOLD_SEPARATELY_RE = re.compile(
    r"(?:charger|încărcător|incarcator).{0,20}"
    r"(?:sold\s+separately|not\s+included|v[aâ]ndut\s+separat|nu\s+este\s+inclus)",
    re.IGNORECASE,
)
_FEATURE_LABELS_RO = {
    "brushless motor": "Motor fără perii",
    "metal chuck": "Mandrină metalică",
    "mechanical 2-speed gear": "Transmisie mecanică cu 2 trepte",
    "spindle lock function": "Funcție de blocare a axului",
    "integrated led work light": "Lumină de lucru LED integrată",
    "integrated work light": "Lumină de lucru integrată",
    "led battery power indicator": "Indicator LED pentru nivelul acumulatorului",
}


def _battery_capacity(components: list[dict[str, Any]]) -> str | None:
    capacities: set[float] = set()
    for component in components:
        if not _BATTERY_RE.search(component["name"]):
            continue
        for match in _BATTERY_CAPACITY_RE.finditer(component["name"]):
            capacities.add(float(match.group(1).replace(",", ".")))
    if not capacities:
        return None
    values = [f"{capacity:.1f}" for capacity in sorted(capacities)]
    return f"{' / '.join(values)} Ah"


def _spec_value(
    specs: list[dict[str, Any]], *keys: str
) -> str | None:
    wanted = set(keys)
    for spec in specs:
        if spec["key_norm"] in wanted:
            return spec["value_raw"]
    return None


def _component_display_name(name: str) -> str:
    normalized = " ".join(name.split())
    capacity = _BATTERY_CAPACITY_RE.search(normalized)
    if _BATTERY_RE.search(normalized):
        return (
            f"Acumulator {capacity.group(1).replace(',', '.')} Ah"
            if capacity
            else "Acumulator"
        )
    if _CHARGER_RE.search(normalized):
        return "Încărcător"
    if normalized.casefold() == "masonry drill bits":
        return "Burghie pentru zidărie"
    bit = re.fullmatch(r"Cr-V\s+(\d+)\s*mm\s+bit", normalized, re.IGNORECASE)
    if bit:
        return f"Bit Cr-V de {bit.group(1)} mm"
    return normalized


def _feature_highlights(
    description: str, components: list[dict[str, Any]]
) -> list[str]:
    component_lines = {component["source_line"].strip() for component in components}
    highlights: list[str] = []
    seen: set[str] = set()
    for raw_line in description.splitlines():
        line = " ".join(raw_line.split()).strip(" .")
        normalized = line.casefold()
        if (
            not line
            or line in component_lines
            or normalized in {"include:", "included:", "includes:"}
            or normalized.startswith(("packed by", "packaged by"))
            or "sold separately" in normalized
            or ":" in line
            or re.match(r"^(?:\d+|[lI]\s+pcs?\b)", line)
            or line.count(",") > 2
            or len(line) > 120
        ):
            continue
        translated = _FEATURE_LABELS_RO.get(normalized, line)
        marker = translated.casefold()
        if marker in seen:
            continue
        seen.add(marker)
        highlights.append(translated)
    return highlights[:12]


def _power_facts(
    row: dict[str, Any],
    specs: list[dict[str, Any]],
    components: list[dict[str, Any]],
) -> dict[str, Any] | None:
    batteries = [
        component for component in components if _BATTERY_RE.search(component["name"])
    ]
    chargers = [
        component for component in components if _CHARGER_RE.search(component["name"])
    ]
    description = row["description"]
    name = row["name_en"]
    battery_sold_separately = bool(_SOLD_SEPARATELY_RE.search(description))
    charger_sold_separately = bool(
        _CHARGER_SOLD_SEPARATELY_RE.search(description)
    )
    normalized_name = name.casefold()
    cordless = bool(
        re.search(
            r"\b(?:cordless|lithium-ion|li-ion)\b",
            f"{name}\n{description}",
            re.IGNORECASE,
        )
    )

    if row["sku"].startswith("DTLBP") or re.search(
        r"\b(?:battery|acumulator)\s+pack\b", normalized_name
    ):
        power_source = "battery"
    elif row["sku"].startswith("DTFCP") or _CHARGER_RE.search(name):
        power_source = "charger"
    elif batteries or battery_sold_separately or charger_sold_separately or cordless:
        power_source = "cordless_battery"
    else:
        return None

    battery_voltage = (
        _spec_value(specs, "output_voltage", "voltage")
        if power_source == "charger"
        else _spec_value(specs, "voltage")
    )
    voltage_match = re.search(r"\b(\d+(?:[.,]\d+)?)\s*V\b", battery_voltage or "")
    platform = (
        f"dyllu-{voltage_match.group(1).replace(',', '.')}v"
        if voltage_match
        else None
    )
    battery_count = sum(component["qty"] for component in batteries)
    return {
        "power_source": power_source,
        "platform": platform,
        "battery_voltage": battery_voltage,
        "battery_included": "yes" if battery_count > 0 else "no",
        "battery_count": battery_count or None,
        "battery_capacity": _battery_capacity(batteries),
        "charger_included": "yes" if chargers else "no",
        "requires_battery": battery_sold_separately
        or (power_source == "cordless_battery" and battery_count == 0),
    }


def build_payload(source_path: str | Path = CANONICAL_SOURCE) -> dict[str, Any]:
    source = Path(source_path).resolve()
    rows = load_source_rows(source)
    specs_by_sku = parse_source_specifications(rows, {})
    items: dict[str, dict[str, Any]] = {}

    for row in rows:
        sku = row["sku"]
        specs = specs_by_sku[sku]
        components = [
            {
                **component,
                "display_name_ro": _component_display_name(component["name"]),
            }
            for component in [*row["components"], *row["included_items"]]
        ]
        items[sku] = {
            "source_row": row["source_row"],
            "name_en": row["name_en"],
            "description": row["description"],
            "marketing_type": row["marketing_type"],
            "sales_unit": row["sales_unit"],
            "price_mdl": row["price_mdl"],
            "picture": row["picture"],
            "packaging": row["packaging"],
            "stock": row["stock"],
            "discount": row["discount"],
            "is_gift": row["is_gift"],
            "highlights_ro": _feature_highlights(row["description"], components),
            "specs": [
                {
                    "label": DOMAIN_LABELS.get(
                        spec["key_norm"], spec["key_raw"].title()
                    ),
                    "value": spec["value_raw"],
                }
                for spec in specs
            ],
            "components": components,
            "accessories": row["accessories"],
            "power": _power_facts(row, specs, components),
        }

    return {
        "schema_version": 1,
        "source": {
            "name": source.name,
            "sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "row_count": len(rows),
        },
        "items": items,
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the Medusa projection from the authoritative DYLLU CSV."
    )
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    payload = build_payload()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
