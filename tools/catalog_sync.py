"""Synchronize the latest DYLLU CSV into the catalog-admin SQLite database.

The sync is additive and idempotent:

* CSV rows are the source layer for names, specifications, packaging, contents,
  bundles, and compatibility relationships.
* Existing dashboard products/variants and their curated fields are preserved.
* Existing ``specification`` rows remain editorial overrides; source specs live
  in ``source_specification`` and are merged by the dashboard query layer.
* SKUs missing from the latest file are marked, never deleted.
* No Medusa calls are made.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sqlite3
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable, Sequence

try:
    from .bundle_catalog import parse_description
except ImportError:  # direct ``python tools/catalog_sync.py`` execution
    from bundle_catalog import parse_description


REQUIRED_COLUMNS = (
    "Dyllu item No.",
    "Picture",
    "Type",
    "Product name",
    "Description & Features",
    "Unit",
    "PRICE MDL Preventiv",
    "Qty",
    "Basic Qty",
    "Qty/Ctn",
    "Carton",
    "CBM",
    "GW",
    "Packed by",
    "Vol/Ctn m³",
    "GW/Ctn Kg",
    "Qty received",
    "Qty on the way",
    "Plan to ship Qty",
    "discount",
    "isGift",
)

_QUANTIFIED_LINE = re.compile(
    r"^\s*(?:with\s+)?(?:\d+|[lI])(?:\s+\d+)?\s*"
    r"(?:pcs?|pieces?|sets?|pairs?|x|×)\b",
    re.IGNORECASE,
)
_INCLUDE_LINE = re.compile(r"^\s*(?:include(?:d|s)?|nclude)\s*:?", re.IGNORECASE)
_NUMBER_UNIT = re.compile(r"^([-+]?\d+(?:[.,]\d+)?)\s*([^\d\s].*)?$")
_AXIS_PREFERENCE = (
    "size",
    "diameter",
    "length",
    "voltage",
    "input_power",
    "rated_power",
    "power",
    "capacity",
    "thickness",
    "width",
    "color",
    "material",
)


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS catalog_import (
  id INTEGER PRIMARY KEY,
  source_file TEXT NOT NULL,
  source_sha256 TEXT NOT NULL,
  imported_at TEXT NOT NULL,
  counts_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_source_item (
  sku TEXT PRIMARY KEY,
  name_en TEXT,
  description TEXT,
  marketing_type TEXT,
  sales_unit TEXT,
  packaging TEXT,
  source_row INTEGER,
  source_file TEXT,
  source_hash TEXT,
  imported_at TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL,
  family_id TEXT,
  family_method TEXT,
  family_confidence TEXT
);

CREATE TABLE IF NOT EXISTS source_specification (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  key_raw TEXT,
  key_norm TEXT,
  label_ro TEXT,
  value_raw TEXT,
  value_num REAL,
  unit TEXT,
  position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog_relationship (
  id INTEGER PRIMARY KEY,
  parent_sku TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  relation_type TEXT NOT NULL,
  qty INTEGER,
  unit TEXT,
  name TEXT,
  target_sku TEXT,
  target_status TEXT,
  source_line TEXT
);

CREATE TABLE IF NOT EXISTS catalog_spec_override (
  sku TEXT PRIMARY KEY,
  mode TEXT NOT NULL DEFAULT 'replace',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_variant_exclusion (
  sku TEXT PRIMARY KEY,
  product_id TEXT,
  excluded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS catalog_availability (
  sku TEXT PRIMARY KEY,
  available INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_spec_sku ON source_specification(sku);
CREATE INDEX IF NOT EXISTS idx_source_spec_keynorm ON source_specification(key_norm);
CREATE INDEX IF NOT EXISTS idx_catalog_relationship_parent ON catalog_relationship(parent_sku);
CREATE INDEX IF NOT EXISTS idx_catalog_relationship_target ON catalog_relationship(target_sku);
CREATE INDEX IF NOT EXISTS idx_catalog_source_current ON catalog_source_item(is_current);
"""


def _header_index(rows: Sequence[Sequence[str]]) -> int:
    for index, row in enumerate(rows):
        values = set(row)
        if all(column in values for column in REQUIRED_COLUMNS):
            return index
    raise ValueError(f"CSV header does not contain required columns: {', '.join(REQUIRED_COLUMNS)}")


def _integer(value: str, *, field: str, sku: str, optional: bool = True) -> int | None:
    normalized = value.strip().replace(",", "")
    if not normalized and optional:
        return None
    try:
        number = float(normalized)
    except ValueError as error:
        raise ValueError(f"Invalid {field} for SKU {sku}: {value!r}") from error
    if not number.is_integer():
        raise ValueError(f"Invalid {field} for SKU {sku}: {value!r}")
    return int(number)


def _decimal(value: str, *, field: str, sku: str) -> float | None:
    normalized = value.strip().replace(",", "")
    if not normalized:
        return None
    try:
        return float(normalized)
    except ValueError as error:
        raise ValueError(f"Invalid {field} for SKU {sku}: {value!r}") from error


def _price_mdl(value: str, *, sku: str) -> int:
    normalized = re.sub(r"\s*MDL\s*$", "", value.strip(), flags=re.IGNORECASE)
    price = _integer(normalized, field="PRICE MDL Preventiv", sku=sku, optional=False)
    if price is None or price <= 0:
        raise ValueError(f"Invalid PRICE MDL Preventiv for SKU {sku}: {value!r}")
    return price


def _flag(value: str, *, field: str, sku: str) -> bool:
    normalized = value.strip()
    if normalized not in {"0", "1"}:
        raise ValueError(f"Invalid {field} for SKU {sku}: {value!r}")
    return normalized == "1"


def load_source_rows(path: str | Path) -> list[dict[str, Any]]:
    source_path = Path(path)
    with source_path.open(newline="", encoding="utf-8-sig") as source:
        rows = list(csv.reader(source))
    header_index = _header_index(rows)
    header = list(rows[header_index])
    column = {name: header.index(name) for name in REQUIRED_COLUMNS}
    width = max(column.values()) + 1
    out: list[dict[str, Any]] = []
    seen: set[str] = set()
    for source_row, row in enumerate(rows[header_index + 1 :], start=header_index + 2):
        if len(row) < width:
            continue
        sku = row[column["Dyllu item No."]].strip().upper()
        if not sku:
            continue
        if sku in seen:
            raise ValueError(f"Duplicate SKU {sku} on CSV row {source_row}")
        seen.add(sku)
        record = {
            "sku": sku,
            "picture": row[column["Picture"]].strip() or None,
            "marketing_type": row[column["Type"]].strip() or None,
            "name_en": row[column["Product name"]].strip(),
            "description": row[column["Description & Features"]].strip(),
            "sales_unit": row[column["Unit"]].strip() or None,
            "price_mdl": _price_mdl(row[column["PRICE MDL Preventiv"]], sku=sku),
            "order_quantity": _decimal(
                row[column["Qty"]], field="Qty", sku=sku
            ),
            "basic_quantity": _decimal(
                row[column["Basic Qty"]], field="Basic Qty", sku=sku
            ),
            "quantity_per_carton": _decimal(
                row[column["Qty/Ctn"]], field="Qty/Ctn", sku=sku
            ),
            "cartons": _decimal(row[column["Carton"]], field="Carton", sku=sku),
            "cbm": _decimal(row[column["CBM"]], field="CBM", sku=sku),
            "gross_weight": _decimal(row[column["GW"]], field="GW", sku=sku),
            "packaging": row[column["Packed by"]].strip() or None,
            "carton_volume_m3": _decimal(
                row[column["Vol/Ctn m³"]], field="Vol/Ctn m³", sku=sku
            ),
            "carton_gross_weight_kg": _decimal(
                row[column["GW/Ctn Kg"]], field="GW/Ctn Kg", sku=sku
            ),
            "stock": {
                "received": _integer(
                    row[column["Qty received"]], field="Qty received", sku=sku
                ),
                "on_the_way": _integer(
                    row[column["Qty on the way"]], field="Qty on the way", sku=sku
                ),
                "planned_to_ship": _integer(
                    row[column["Plan to ship Qty"]],
                    field="Plan to ship Qty",
                    sku=sku,
                ),
            },
            "discount": _decimal(
                row[column["discount"]], field="discount", sku=sku
            ),
            "is_gift": _flag(row[column["isGift"]], field="isGift", sku=sku),
            "source_row": source_row,
        }
        parsed = parse_description(
            record["description"],
            bundle_hint=bool(
                re.search(
                    r"(?:\b(?:set|kit|combo)\b|\b\d+\s*(?:pcs?|pieces?)\b|\b\d+[- ]?in[- ]?1\b)",
                    record["name_en"],
                    re.IGNORECASE,
                )
            ),
        )
        record.update(parsed)
        record["is_bundle"] = bool(parsed["components"])
        record["source_hash"] = hashlib.sha256(
            json.dumps(record, sort_keys=True, ensure_ascii=False).encode("utf-8")
        ).hexdigest()
        out.append(record)

    catalog_skus = {record["sku"] for record in out}
    bundle_skus = {record["sku"] for record in out if record["is_bundle"]}
    for record in out:
        for component in [*record["components"], *record["included_items"]]:
            component_sku = component["component_sku"]
            if not component_sku:
                component["type"] = "loose"
            elif component_sku in catalog_skus:
                component["type"] = "linked"
                component["is_sub_bundle"] = component_sku in bundle_skus
            else:
                component["type"] = "external"
                component["is_sub_bundle"] = False
        for accessory in record["accessories"]:
            accessory["type"] = (
                "linked" if accessory["target_sku"] in catalog_skus else "external"
            )
    return out


def load_availability_skus(path: str | Path) -> set[str]:
    with Path(path).open(newline="", encoding="utf-8-sig") as source:
        reader = csv.DictReader(source)
        if not reader.fieldnames or "image" not in reader.fieldnames:
            raise ValueError("Availability manifest must contain an 'image' SKU column")
        skus = {row["image"].strip().upper() for row in reader if row.get("image", "").strip()}
    if not skus:
        raise ValueError("Availability manifest contains no SKUs")
    return skus


def normalize_key(key_raw: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", key_raw.strip().lower()).strip("_") or "spec"


def parse_source_specifications(
    source_rows: Iterable[dict[str, Any]],
    dictionary: dict[str, tuple[str, str]],
) -> dict[str, list[dict[str, Any]]]:
    specs_by_sku: dict[str, list[dict[str, Any]]] = {}
    for row in source_rows:
        specs: list[dict[str, Any]] = []
        for position, raw_line in enumerate(row["description"].splitlines()):
            line = raw_line.strip()
            if ":" not in line or _QUANTIFIED_LINE.match(line) or _INCLUDE_LINE.match(line):
                continue
            key_raw, _, value_raw = line.partition(":")
            key_raw = key_raw.strip()
            value_raw = value_raw.strip()
            if not key_raw or not value_raw or key_raw.lower().startswith(("packed", "include")):
                continue
            dictionary_hit = dictionary.get(key_raw.lower())
            key_norm = dictionary_hit[0] if dictionary_hit else normalize_key(key_raw)
            label_ro = dictionary_hit[1] if dictionary_hit else key_raw.title()
            value_num: float | None = None
            unit: str | None = None
            match = _NUMBER_UNIT.match(value_raw)
            if match:
                try:
                    value_num = float(match.group(1).replace(",", "."))
                except ValueError:
                    value_num = None
                unit = (match.group(2) or "").strip() or None
            specs.append(
                {
                    "sku": row["sku"],
                    "key_raw": key_raw,
                    "key_norm": key_norm,
                    "label_ro": label_ro,
                    "value_raw": value_raw,
                    "value_num": value_num,
                    "unit": unit,
                    "position": position,
                }
            )
        specs_by_sku[row["sku"]] = specs
    return specs_by_sku


def _source_name_key(name: str) -> str:
    return " ".join(name.casefold().split())


def _family_id(name_key: str) -> str:
    return f"csv{hashlib.sha1(name_key.encode('utf-8')).hexdigest()[:12]}"


def _slugify(value: str, suffix: str) -> str:
    folded = value.encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", folded).strip("-") or "product"
    return f"{slug}-{suffix[-8:]}"


def _infer_axis(
    skus: list[str], specs_by_sku: dict[str, list[dict[str, Any]]]
) -> tuple[str, dict[str, str]]:
    if len(skus) == 1:
        return "SKU", {skus[0]: skus[0]}
    values_by_key: dict[str, dict[str, str]] = defaultdict(dict)
    labels: dict[str, str] = {}
    for sku in skus:
        for spec in specs_by_sku.get(sku, []):
            key = spec["key_norm"]
            values_by_key[key].setdefault(sku, spec["value_raw"])
            labels.setdefault(key, spec["key_raw"])
    preference = {key: index for index, key in enumerate(_AXIS_PREFERENCE)}
    candidates: list[tuple[float, str]] = []
    for key, values in values_by_key.items():
        distinct = len(set(values.values()))
        if distinct < 2:
            continue
        coverage = len(values) / len(skus)
        preferred = preference.get(key, len(_AXIS_PREFERENCE) + 5)
        score = coverage * 100 + distinct - preferred
        candidates.append((score, key))
    if not candidates:
        return "SKU", {sku: sku for sku in skus}
    _, key = max(candidates)
    return labels.get(key, key.replace("_", " ").title()), {
        sku: values_by_key[key].get(sku, sku) for sku in skus
    }


def plan_families(
    source_rows: list[dict[str, Any]],
    existing_variants: dict[str, str],
    specs_by_sku: dict[str, list[dict[str, Any]]],
) -> tuple[dict[str, dict[str, str]], dict[str, dict[str, Any]], Counter[str]]:
    rows_by_sku = {row["sku"]: row for row in source_rows}
    existing_name_families: dict[str, set[str]] = defaultdict(set)
    for sku, product_id in existing_variants.items():
        row = rows_by_sku.get(sku)
        if row:
            existing_name_families[_source_name_key(row["name_en"])].add(product_id)

    source_name_skus: dict[str, list[str]] = defaultdict(list)
    for row in source_rows:
        source_name_skus[_source_name_key(row["name_en"])].append(row["sku"])

    planned: dict[str, dict[str, str]] = {}
    new_products: dict[str, dict[str, Any]] = {}
    methods: Counter[str] = Counter()
    for name_key, skus in source_name_skus.items():
        axis, values = _infer_axis(skus, specs_by_sku)
        existing_families = existing_name_families.get(name_key, set())
        for sku in skus:
            if sku in existing_variants:
                planned[sku] = {
                    "family_id": existing_variants[sku],
                    "family_method": "preserved_existing",
                    "family_confidence": "curated",
                    "axis": axis,
                    "value": values[sku],
                }
                methods["preserved_existing"] += 1
                continue
            if len(existing_families) == 1:
                family_id = next(iter(existing_families))
                method = "existing_exact_name"
                confidence = "high"
            elif len(existing_families) > 1:
                family_id = _family_id(name_key)
                method = "ambiguous_existing_name_new_family"
                confidence = "review"
            else:
                family_id = _family_id(name_key)
                method = "new_exact_name_family"
                confidence = "high"
            planned[sku] = {
                "family_id": family_id,
                "family_method": method,
                "family_confidence": confidence,
                "axis": axis,
                "value": values[sku],
            }
            methods[method] += 1
            if family_id not in existing_variants.values():
                new_products.setdefault(
                    family_id,
                    {
                        "id": family_id,
                        "name_en": rows_by_sku[sku]["name_en"],
                        "axis": axis,
                        "method": method,
                        "confidence": confidence,
                    },
                )
    return planned, new_products, methods


def _dictionary(conn: sqlite3.Connection) -> dict[str, tuple[str, str]]:
    try:
        rows = conn.execute("SELECT key_raw, key_norm, label_ro FROM spec_key").fetchall()
    except sqlite3.OperationalError:
        return {}
    return {row["key_raw"].strip().lower(): (row["key_norm"], row["label_ro"]) for row in rows}


def build_sync_plan(
    conn: sqlite3.Connection, csv_path: str | Path
) -> tuple[dict[str, Any], dict[str, Any]]:
    conn.row_factory = sqlite3.Row
    source_rows = load_source_rows(csv_path)
    source_by_sku = {row["sku"]: row for row in source_rows}
    existing_variants = {
        row["sku"]: row["product_id"]
        for row in conn.execute("SELECT sku, product_id FROM variant").fetchall()
    }
    try:
        excluded_skus = {
            row["sku"]
            for row in conn.execute("SELECT sku FROM catalog_variant_exclusion").fetchall()
        }
    except sqlite3.OperationalError:
        excluded_skus = set()
    active_source_rows = [row for row in source_rows if row["sku"] not in excluded_skus]
    specs_by_sku = parse_source_specifications(source_rows, _dictionary(conn))
    families, new_products, family_methods = plan_families(
        active_source_rows, existing_variants, specs_by_sku
    )
    graph = source_rows
    graph_by_sku = {product["sku"]: product for product in graph}
    source_skus = set(source_by_sku)
    active_source_skus = source_skus - excluded_skus
    existing_skus = set(existing_variants)
    relationship_counts = Counter()
    for product in graph:
        relationship_counts["bundle_component"] += len(product["components"])
        relationship_counts["included_item"] += len(product["included_items"])
        relationship_counts["compatible_with"] += len(product["accessories"])
    report = {
        "source_file": str(Path(csv_path).resolve()),
        "source_skus": len(source_skus),
        "existing_skus": len(existing_skus),
        "overlap_skus": len(source_skus & existing_skus),
        "new_skus": len(source_skus - existing_skus),
        "excluded_skus": len(excluded_skus & source_skus),
        "missing_from_latest_skus": len(existing_skus - source_skus),
        "source_specifications": sum(len(specs) for specs in specs_by_sku.values()),
        "source_skus_with_specs": sum(bool(specs) for specs in specs_by_sku.values()),
        "new_products": len(new_products),
        "final_products": len(set(existing_variants.values()) | set(new_products)),
        "final_variants": len(existing_skus | active_source_skus),
        "family_methods": dict(family_methods),
        "relationships": dict(relationship_counts),
        "review_family_skus": sorted(
            sku for sku, family in families.items() if family["family_confidence"] == "review"
        ),
        "unresolved_component_skus": sorted(
            {
                component["component_sku"]
                for product in graph
                for component in product["components"]
                if component["type"] == "external" and component["component_sku"]
            }
        ),
    }
    state = {
        "source_rows": source_rows,
        "source_by_sku": source_by_sku,
        "existing_variants": existing_variants,
        "specs_by_sku": specs_by_sku,
        "families": families,
        "new_products": new_products,
        "graph_by_sku": graph_by_sku,
        "excluded_skus": excluded_skus,
    }
    return report, state


def _backup_database(conn: sqlite3.Connection, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = backup_dir / f"catalog-before-latest-sync-{timestamp}.db"
    destination = sqlite3.connect(backup_path)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return backup_path


def apply_sync(
    db_path: str | Path,
    csv_path: str | Path,
    *,
    backup_dir: str | Path | None = None,
    availability_manifest: str | Path | None = None,
) -> dict[str, Any]:
    database_path = Path(db_path)
    conn = sqlite3.connect(database_path, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    report, state = build_sync_plan(conn, csv_path)
    availability_skus = (
        load_availability_skus(availability_manifest) if availability_manifest else None
    )
    if availability_skus is not None:
        known_skus = set(state["source_by_sku"]) | set(state["existing_variants"])
        unknown = availability_skus - known_skus
        if unknown:
            raise ValueError(
                f"Availability manifest contains {len(unknown)} unknown SKUs: "
                + ", ".join(sorted(unknown)[:20])
            )
        report["available_for_purchase"] = len(availability_skus)
    backup_path = _backup_database(
        conn,
        Path(backup_dir) if backup_dir else database_path.parent / "backups",
    )
    imported_at = datetime.now(UTC).isoformat()
    source_file = str(Path(csv_path).resolve())
    source_sha256 = hashlib.sha256(Path(csv_path).read_bytes()).hexdigest()

    try:
        # DDL is applied after the backup but before the explicit data
        # transaction because sqlite3.executescript commits an open transaction.
        conn.executescript(SCHEMA_SQL)
        conn.execute("BEGIN IMMEDIATE")
        if availability_skus is not None:
            conn.execute("DELETE FROM catalog_availability")
            conn.executemany(
                "INSERT INTO catalog_availability(sku,available,source,updated_at) "
                "VALUES (?,1,?,?)",
                (
                    (sku, str(Path(availability_manifest).resolve()), imported_at)
                    for sku in sorted(availability_skus)
                ),
            )
        conn.execute("UPDATE catalog_source_item SET is_current=0, sync_status='missing_from_latest'")

        for product in state["new_products"].values():
            conn.execute(
                "INSERT OR IGNORE INTO product"
                "(id,handle,title_en,group_name_en,axis,status,extras) VALUES (?,?,?,?,?,'draft',?)",
                (
                    product["id"],
                    _slugify(product["name_en"], product["id"]),
                    product["name_en"],
                    product["name_en"],
                    product["axis"],
                    json.dumps(
                        {
                            "catalog_source": {
                                "family_method": product["method"],
                                "family_confidence": product["confidence"],
                            }
                        },
                        ensure_ascii=False,
                    ),
                ),
            )

        next_position: dict[str, int] = {
            row["product_id"]: row["next_position"]
            for row in conn.execute(
                "SELECT product_id, COALESCE(MAX(position),-1)+1 AS next_position "
                "FROM variant GROUP BY product_id"
            ).fetchall()
        }
        for row in state["source_rows"]:
            if row["sku"] in state["excluded_skus"]:
                conn.execute(
                    "INSERT INTO catalog_source_item"
                    "(sku,name_en,description,marketing_type,sales_unit,packaging,source_row,"
                    "source_file,source_hash,imported_at,is_current,sync_status) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,1,'excluded') "
                    "ON CONFLICT(sku) DO UPDATE SET name_en=excluded.name_en,"
                    "description=excluded.description,marketing_type=excluded.marketing_type,"
                    "sales_unit=excluded.sales_unit,packaging=excluded.packaging,"
                    "source_row=excluded.source_row,source_file=excluded.source_file,"
                    "source_hash=excluded.source_hash,imported_at=excluded.imported_at,"
                    "is_current=1,sync_status='excluded'",
                    (
                        row["sku"], row["name_en"], row["description"],
                        row["marketing_type"], row["sales_unit"], row["packaging"],
                        row["source_row"], source_file, row["source_hash"], imported_at,
                    ),
                )
                continue
            family = state["families"][row["sku"]]
            if row["sku"] not in state["existing_variants"]:
                position = next_position.get(family["family_id"], 0)
                next_position[family["family_id"]] = position + 1
                conn.execute(
                    "INSERT INTO variant"
                    "(sku,product_id,value,currency,position,group_confirmed,raw_text) "
                    "VALUES (?,?,?,'mdl',?,?,?)",
                    (
                        row["sku"],
                        family["family_id"],
                        family["value"],
                        position,
                        family["family_method"],
                        json.dumps({"catalog_source": row["description"]}, ensure_ascii=False),
                    ),
                )
            conn.execute(
                "UPDATE product SET title_en=COALESCE(title_en,?), "
                "axis=COALESCE(axis,?) WHERE id=?",
                (row["name_en"], family["axis"], family["family_id"]),
            )
            conn.execute(
                "INSERT INTO catalog_source_item"
                "(sku,name_en,description,marketing_type,sales_unit,packaging,source_row,"
                "source_file,source_hash,imported_at,is_current,sync_status,family_id,"
                "family_method,family_confidence) VALUES (?,?,?,?,?,?,?,?,?,?,1,'current',?,?,?) "
                "ON CONFLICT(sku) DO UPDATE SET name_en=excluded.name_en,"
                "description=excluded.description,marketing_type=excluded.marketing_type,"
                "sales_unit=excluded.sales_unit,packaging=excluded.packaging,"
                "source_row=excluded.source_row,source_file=excluded.source_file,"
                "source_hash=excluded.source_hash,imported_at=excluded.imported_at,"
                "is_current=1,sync_status='current',family_id=excluded.family_id,"
                "family_method=excluded.family_method,family_confidence=excluded.family_confidence",
                (
                    row["sku"],
                    row["name_en"],
                    row["description"],
                    row["marketing_type"],
                    row["sales_unit"],
                    row["packaging"],
                    row["source_row"],
                    source_file,
                    row["source_hash"],
                    imported_at,
                    family["family_id"],
                    family["family_method"],
                    family["family_confidence"],
                ),
            )

        missing_skus = set(state["existing_variants"]) - set(state["source_by_sku"])
        for sku in missing_skus:
            conn.execute(
                "INSERT INTO catalog_source_item"
                "(sku,imported_at,is_current,sync_status,family_id,family_method,family_confidence) "
                "VALUES (?,?,0,'missing_from_latest',?,'preserved_existing','review') "
                "ON CONFLICT(sku) DO UPDATE SET imported_at=excluded.imported_at,is_current=0,"
                "sync_status='missing_from_latest',family_id=excluded.family_id,"
                "family_method='preserved_existing',family_confidence='review'",
                (sku, imported_at, state["existing_variants"][sku]),
            )

        conn.execute("DELETE FROM source_specification")
        source_spec_insert = conn.execute
        for specs in state["specs_by_sku"].values():
            for spec in specs:
                source_spec_insert(
                    "INSERT INTO source_specification"
                    "(sku,key_raw,key_norm,label_ro,value_raw,value_num,unit,position) "
                    "VALUES (?,?,?,?,?,?,?,?)",
                    (
                        spec["sku"],
                        spec["key_raw"],
                        spec["key_norm"],
                        spec["label_ro"],
                        spec["value_raw"],
                        spec["value_num"],
                        spec["unit"],
                        spec["position"],
                    ),
                )

        conn.execute("DELETE FROM catalog_relationship")
        conn.execute("DELETE FROM bundle_component")
        for product in state["graph_by_sku"].values():
            relationship_position = 0
            for relation_type, relationships in (
                ("bundle_component", product["components"]),
                ("included_item", product["included_items"]),
            ):
                for relationship in relationships:
                    conn.execute(
                        "INSERT INTO catalog_relationship"
                        "(parent_sku,position,relation_type,qty,unit,name,target_sku,"
                        "target_status,source_line) VALUES (?,?,?,?,?,?,?,?,?)",
                        (
                            product["sku"],
                            relationship_position,
                            relation_type,
                            relationship["qty"],
                            relationship["unit"],
                            relationship["name"],
                            relationship["component_sku"],
                            relationship["type"],
                            relationship["source_line"],
                        ),
                    )
                    if relation_type == "bundle_component":
                        conn.execute(
                            "INSERT INTO bundle_component"
                            "(parent_sku,position,qty,name,component_sku,type,is_sub_bundle,packaging) "
                            "VALUES (?,?,?,?,?,?,?,?)",
                            (
                                product["sku"],
                                relationship_position,
                                relationship["qty"],
                                relationship["name"],
                                relationship["component_sku"],
                                relationship["type"],
                                1 if relationship.get("is_sub_bundle") else 0,
                                product["packaging"],
                            ),
                        )
                    relationship_position += 1
            for accessory in product["accessories"]:
                conn.execute(
                    "INSERT INTO catalog_relationship"
                    "(parent_sku,position,relation_type,name,target_sku,target_status,source_line) "
                    "VALUES (?,?,'compatible_with',?,?,?,?)",
                    (
                        product["sku"],
                        relationship_position,
                        accessory["source_line"],
                        accessory["target_sku"],
                        accessory["type"],
                        accessory["source_line"],
                    ),
                )
                relationship_position += 1

        conn.execute(
            "INSERT INTO catalog_import(source_file,source_sha256,imported_at,counts_json) "
            "VALUES (?,?,?,?)",
            (source_file, source_sha256, imported_at, json.dumps(report, ensure_ascii=False)),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {**report, "backup_path": str(backup_path)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv_path", type=Path)
    parser.add_argument("db_path", type=Path)
    parser.add_argument("--apply", action="store_true", help="apply after creating a SQLite backup")
    parser.add_argument("--report", type=Path, help="write the dry-run/applied report as JSON")
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument(
        "--availability-manifest",
        type=Path,
        help="authoritative manifest.csv whose image column lists sellable SKUs",
    )
    args = parser.parse_args()

    if args.apply:
        report = apply_sync(
            args.db_path,
            args.csv_path,
            backup_dir=args.backup_dir,
            availability_manifest=args.availability_manifest,
        )
    else:
        conn = sqlite3.connect(args.db_path)
        try:
            report, _ = build_sync_plan(conn, args.csv_path)
        finally:
            conn.close()
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
