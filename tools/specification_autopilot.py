"""Normalize effective specifications and build category contracts."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

try:
    from .specification_quality import merge_effective_specs
    from .specification_semantics import (
        METADATA_KEYS,
        RELATIONSHIP_KEYS,
        contextual_key,
        power_source_for_variant,
        profile_for_variant,
        semantic_decision,
    )
    from .specification_translations import DOMAIN_LABELS
except ImportError:
    from specification_quality import merge_effective_specs
    from specification_semantics import (
        METADATA_KEYS,
        RELATIONSHIP_KEYS,
        contextual_key,
        power_source_for_variant,
        profile_for_variant,
        semantic_decision,
    )
    from specification_translations import DOMAIN_LABELS


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS spec_category_contract (
  id INTEGER PRIMARY KEY,
  scope_type TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  scope_label TEXT NOT NULL,
  category_id INTEGER,
  profile_key TEXT NOT NULL DEFAULT 'generic',
  profile_label TEXT NOT NULL DEFAULT 'Profil tehnic general',
  power_sources TEXT NOT NULL DEFAULT '[]',
  canonical_key TEXT NOT NULL,
  label_ro TEXT NOT NULL,
  canonical_unit TEXT,
  requirement TEXT NOT NULL,
  semantic_status TEXT NOT NULL DEFAULT 'aligned',
  rationale TEXT NOT NULL DEFAULT '',
  coverage REAL NOT NULL,
  sku_count INTEGER NOT NULL,
  position INTEGER NOT NULL,
  generated_at TEXT NOT NULL,
  UNIQUE(scope_type, scope_key, canonical_key)
);

CREATE TABLE IF NOT EXISTS spec_normalization_application (
  id INTEGER PRIMARY KEY,
  generated_at TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  output_fingerprint TEXT NOT NULL,
  backup_path TEXT NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spec_semantic_exclusion (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  label_ro TEXT NOT NULL,
  profile_key TEXT NOT NULL,
  rationale TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  UNIQUE(sku, canonical_key)
);

CREATE TABLE IF NOT EXISTS spec_variant_profile (
  sku TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  category_id INTEGER,
  profile_key TEXT NOT NULL,
  profile_label TEXT NOT NULL,
  power_source TEXT NOT NULL,
  generated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spec_category_contract_scope
  ON spec_category_contract(scope_type, scope_key, position);
CREATE INDEX IF NOT EXISTS idx_spec_category_contract_category
  ON spec_category_contract(category_id, position);
CREATE INDEX IF NOT EXISTS idx_spec_semantic_exclusion_sku
  ON spec_semantic_exclusion(sku, canonical_key);
CREATE INDEX IF NOT EXISTS idx_spec_variant_profile_profile
  ON spec_variant_profile(profile_key, category_id);
"""

INDUSTRY_LABELS = DOMAIN_LABELS | {
    "fuel_inlet_pipe": "Conductă de alimentare cu combustibil",
    "mating_engine": "Motor compatibil",
    "max_cutting_path": "Lățime maximă de tăiere",
    "tank_capacity": "Capacitate rezervor",
    "chuck_type": "Tip mandrină",
    "core_bit": "Diametru maxim de găurire cu carotă",
    "max_drilling_diameter_concrete": "Diametru maxim de găurire în beton",
    "max_drilling_diameter_steel": "Diametru maxim de găurire în oțel",
    "max_drilling_diameter_wood": "Diametru maxim de găurire în lemn",
    "tool_holder": "Sistem de prindere",
}

MANUAL_ALIASES = {
    "alezaj": "arbor",
    "alimentare": "power_supply",
    "capacitate": "capacity",
    "cilindree": "displacement",
    "diametru": "diameter",
    "dimensiuni": "dimensions",
    "frecventa_impact": "impact_rate",
    "fuel_tank": "fuel_tank_capacity",
    "greutate": "weight",
    "grosime": "thickness",
    "latime": "width",
    "latime_lama": "blade_width",
    "lungime": "length",
    "lungime_lama": "blade_length",
    "material_lama": "blade_material",
    "max_cutting_path": "cutting_width",
    "maximum_cutting_diameter": "max_cutting_diameter",
    "presiune_maxima": "max_pressure",
    "putere_nominala": "rated_power",
    "rate_voltage": "rated_voltage",
    "tensiune": "voltage",
    "turatie_in_gol": "no_load_speed",
}

UNIT_EQUIVALENTS = {
    "n.m": "N·m",
    "n·m": "N·m",
    "nm": "N·m",
    "n-m": "N·m",
    "r/min": "rpm",
    "rot/min": "rpm",
    "min-1": "rpm",
    "rpm": "rpm",
    "bpm": "bpm",
    "l/min.": "L/min",
    "l/mim": "L/min",
    "litri/min": "L/min",
    "bar": "bar",
    "kg": "kg",
    "kgs": "kg",
    "kw": "kW",
    "w": "W",
    "v": "V",
    "hz": "Hz",
    "mm": "mm",
    "cm": "cm",
    "m": "m",
    "ml": "ml",
    "l": "L",
    "cc": "cc",
    "ah": "Ah",
    "a": "A",
    "j": "J",
    "psi": "psi",
    "pa": "Pa",
    "kpa": "kPa",
    "mpa": "MPa",
    "m/s": "m/s",
    "m³/min": "m³/min",
    "m3/min": "m³/min",
    "db": "dB",
    "°c": "°C",
    "°": "°",
    "kn": "kN",
    "lm": "lm",
    "lux": "lux",
    "mah": "mAh",
    "wh": "Wh",
    "g": "g",
    "min": "min",
    "s": "s",
    "h": "h",
    "m²": "m²",
    "m³": "m³",
    "%": "%",
}

INDUSTRY_PRIORITY = {
    "voltage": 0,
    "battery_voltage": 0,
    "power_supply": 1,
    "input_power": 2,
    "rated_power": 2,
    "engine_power": 2,
    "battery_capacity": 3,
    "no_load_speed": 4,
    "rated_speed": 4,
    "max_speed": 4,
    "max_torque": 5,
    "impact_rate": 6,
    "impact_energy": 7,
    "capacity": 8,
    "max_pressure": 8,
    "max_flow": 9,
    "cutting_width": 10,
    "cutting_depth": 10,
    "blade_diameter": 11,
    "disc_diameter": 11,
    "dimensions": 80,
    "length": 81,
    "width": 82,
    "height": 83,
    "weight": 90,
    "net_weight": 90,
    "material": 91,
    "color": 92,
}


def _clean(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _token(value: Any) -> str:
    return (
        unicodedata.normalize("NFKD", _clean(value))
        .encode("ascii", "ignore")
        .decode()
        .lower()
        .replace("–", "-")
        .replace("—", "-")
        .replace("×", "x")
        .replace(",", ".")
        .replace(" ", "")
    )


def _label_token(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", _token(value)).strip()


def _identity(row: dict[str, Any]) -> str:
    return _clean(row.get("key_norm") or row.get("key_raw")).lower().replace(" ", "_")


def _fingerprint(rows: Iterable[dict[str, Any]], fields: list[str]) -> str:
    digest = hashlib.sha256()
    for row in rows:
        digest.update(
            json.dumps(
                {field: row.get(field) for field in fields},
                sort_keys=True,
                ensure_ascii=False,
                default=str,
            ).encode()
        )
    return digest.hexdigest()


def _backup_database(conn: sqlite3.Connection, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    path = backup_dir / f"catalog-before-spec-autopilot-{timestamp}.db"
    destination = sqlite3.connect(path)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return path


def _ensure_contract_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_SQL)
    columns = {row[1] for row in conn.execute("PRAGMA table_info(spec_category_contract)")}
    additions = {
        "profile_key": "TEXT NOT NULL DEFAULT 'generic'",
        "profile_label": "TEXT NOT NULL DEFAULT 'Profil tehnic general'",
        "power_sources": "TEXT NOT NULL DEFAULT '[]'",
        "semantic_status": "TEXT NOT NULL DEFAULT 'aligned'",
        "rationale": "TEXT NOT NULL DEFAULT ''",
    }
    for column, definition in additions.items():
        if column not in columns:
            conn.execute(f"ALTER TABLE spec_category_contract ADD COLUMN {column} {definition}")


def _standard_aliases(
    canonical_rows: list[dict[str, Any]],
    alias_rows: list[dict[str, Any]],
) -> dict[str, str]:
    canonical_by_key = {row["key"]: row for row in canonical_rows}
    domain_targets: dict[str, list[str]] = defaultdict(list)
    for key, label in INDUSTRY_LABELS.items():
        if key in MANUAL_ALIASES:
            continue
        domain_targets[_label_token(label)].append(key)

    aliases: dict[str, str] = {}
    for row in canonical_rows:
        if row["key"] in MANUAL_ALIASES:
            continue
        label_key = _label_token(row.get("label_ro"))
        targets = [key for key in domain_targets.get(label_key, []) if key in canonical_by_key]
        if not targets:
            continue
        target = max(
            targets,
            key=lambda key: (
                canonical_by_key[key].get("label_ro_confidence") in {"approved", "high"},
                canonical_by_key[key].get("row_count") or 0,
                -len(key),
            ),
        )
        if row["key"] != target:
            aliases[row["key"]] = target

    for row in alias_rows:
        if row["alias_key"] in aliases:
            continue
        aliases[row["alias_key"]] = row["canonical_key"]
    aliases.update(MANUAL_ALIASES)
    return aliases


def _resolve_key(
    row: dict[str, Any],
    aliases: dict[str, str],
    variant: dict[str, Any] | None = None,
) -> str:
    key = _identity(row)
    value = _clean(row.get("value_raw"))
    unit = _clean(row.get("unit"))
    if key == "alimentare" and re.search(r"\d\s*(?:-|–|~|/)?\s*\d*\s*v\b", f"{value} {unit}", re.I):
        return "voltage"
    if key == "capacitate_rezervor":
        context = _token(f"{(variant or {}).get('title_ro')} {(variant or {}).get('title_en')}")
        if any(term in context for term in ("petrol", "benzina", "gasoline", "engine", "motor")):
            return "fuel_tank_capacity"
        return "tank_capacity"
    visited: set[str] = set()
    while key in aliases and key not in visited:
        visited.add(key)
        key = aliases[key]
    return key


def _canonical_unit(value: Any, configured: Any) -> str | None:
    configured_value = _clean(configured)
    if configured_value:
        configured_unit = UNIT_EQUIVALENTS.get(configured_value.lower())
        if configured_unit:
            return configured_unit
    unit = _clean(value)
    return UNIT_EQUIVALENTS.get(unit.lower())


def _row_unit(value_raw: Any, source_unit: Any, configured: Any) -> str | None:
    value = _clean(value_raw)
    pattern = re.compile(
        r"(?i)(?<=\d)\s*(m³/min|m3/min|l/min|rot/min|r/min|vib/min|bpm|spm|ipm|n[.·-]?m|rpm|kpa|mpa|psi|bar|kw|hz|kg|mm|cm|ml|cc|ah|db|pa|v|w|a|j|l|m)(?=$|[\s,;/~()])"
    )
    matches = {
        UNIT_EQUIVALENTS.get(match.lower().replace("·", "."), match)
        for match in pattern.findall(value)
    }
    if len(matches) == 1:
        return next(iter(matches))
    return _canonical_unit(source_unit, configured)


def _row_score(row: dict[str, Any]) -> tuple[int, int, int]:
    return (
        1 if row.get("source_kind") == "curated" else 0,
        len(_clean(row.get("value_raw"))),
        -int(row.get("position") or 0),
    )


def _is_synthetic_aggregate(rows: list[dict[str, Any]], source_rows: list[dict[str, Any]]) -> bool:
    if not source_rows or not any(row.get("source_kind") == "curated" for row in rows):
        return False
    source_tokens = {_token(row.get("value_raw")) for row in source_rows if _token(row.get("value_raw"))}
    for row in rows:
        value = _clean(row.get("value_raw"))
        if " / " not in value and "în funcție de variantă" not in value.lower():
            continue
        value_token = _token(value)
        if any(token in value_token for token in source_tokens):
            return True
    return False


def _collapse_values(rows: list[dict[str, Any]]) -> tuple[str, float | None, str | None, int]:
    ordered = sorted(rows, key=_row_score, reverse=True)
    distinct: list[dict[str, Any]] = []
    for row in ordered:
        token = _token(row.get("value_raw"))
        if not token:
            continue
        if any(token == _token(existing.get("value_raw")) for existing in distinct):
            continue
        distinct.append(row)
    if not distinct:
        return "", None, None, 0
    richest = distinct[0]
    richest_token = _token(richest.get("value_raw"))
    redundant = [row for row in distinct[1:] if _token(row.get("value_raw")) in richest_token]
    remaining = [row for row in distinct if row is richest or row not in redundant]
    values = [_clean(row.get("value_raw")) for row in remaining]
    return (
        " / ".join(values),
        richest.get("value_num") if len(remaining) == 1 else None,
        richest.get("unit"),
        max(len(remaining) - 1, 0),
    )


def build_plan(conn: sqlite3.Connection) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    source = [dict(row) | {"source_kind": "source"} for row in conn.execute(
        "SELECT * FROM source_specification ORDER BY id"
    )]
    curated = [dict(row) | {"source_kind": "curated"} for row in conn.execute(
        "SELECT * FROM specification ORDER BY id"
    )]
    variants = [dict(row) for row in conn.execute(
        "SELECT v.sku,v.product_id,COALESCE(v.category_id,p.category_id) category_id,"
        "COALESCE(c.name_ro,'') category_name,COALESCE(NULLIF(TRIM(v.name_ro),''),p.title_ro) title_ro,"
        "p.title_en,p.power_source "
        "FROM variant v JOIN product p ON p.id=v.product_id "
        "LEFT JOIN category c ON c.id=COALESCE(v.category_id,p.category_id) ORDER BY v.sku"
    )]
    overrides = {row["sku"] for row in conn.execute("SELECT sku FROM catalog_spec_override")}
    canonical_rows = [dict(row) for row in conn.execute("SELECT * FROM spec_canonical_key ORDER BY key")]
    alias_rows = [dict(row) for row in conn.execute("SELECT * FROM spec_alias_proposal ORDER BY alias_key")]
    family_rules = [dict(row) for row in conn.execute("SELECT * FROM spec_family_rule ORDER BY product_id,canonical_key")]
    canonical = {row["key"]: row for row in canonical_rows}
    aliases = _standard_aliases(canonical_rows, alias_rows)
    source_by_sku: dict[str, list[dict[str, Any]]] = defaultdict(list)
    curated_by_sku: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in source:
        source_by_sku[row["sku"]].append(row)
    for row in curated:
        curated_by_sku[row["sku"]].append(row)
    variant_by_sku = {row["sku"]: row for row in variants}
    profile_by_sku = {row["sku"]: profile_for_variant(row) for row in variants}
    power_source_by_sku = {row["sku"]: power_source_for_variant(row) for row in variants}
    family_skus: dict[str, list[str]] = defaultdict(list)
    for row in variants:
        family_skus[row["product_id"]].append(row["sku"])

    normalized_by_sku: dict[str, list[dict[str, Any]]] = defaultdict(list)
    excluded_descriptive = 0
    excluded_relationships = 0
    combined_conflicts = 0
    excluded_contract_keys: dict[str, dict[str, str]] = defaultdict(dict)
    has_semantic_exclusions = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='spec_semantic_exclusion'"
    ).fetchone()
    if has_semantic_exclusions:
        for row in conn.execute("SELECT sku,canonical_key,label_ro FROM spec_semantic_exclusion"):
            if row["sku"] in variant_by_sku:
                excluded_contract_keys[row["sku"]][row["canonical_key"]] = row["label_ro"]
    for variant in variants:
        sku = variant["sku"]
        profile = profile_by_sku[sku]
        for source_row in source_by_sku.get(sku, []):
            source_key = contextual_key(_resolve_key(source_row, aliases, variant), source_row, profile)
            if source_key in RELATIONSHIP_KEYS or source_key in METADATA_KEYS:
                excluded_contract_keys[sku][source_key] = _clean(source_row.get("label_ro")) or source_key
        effective = merge_effective_specs(
            source_by_sku.get(sku, []),
            curated_by_sku.get(sku, []),
            sku in overrides,
        )
        grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        source_grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for source_row in source_by_sku.get(sku, []):
            source_key = contextual_key(_resolve_key(source_row, aliases, variant), source_row, profile)
            if source_key not in RELATIONSHIP_KEYS and source_key not in METADATA_KEYS:
                source_grouped[source_key].append(source_row)
        for row in effective:
            if not _clean(row.get("value_raw")) and row.get("value_num") is None:
                excluded_descriptive += 1
                continue
            key = _resolve_key(row, aliases, variant)
            key = contextual_key(key, row, profile)
            if key in RELATIONSHIP_KEYS:
                excluded_relationships += 1
                excluded_contract_keys[sku][key] = _clean(row.get("label_ro")) or key
                continue
            if key in METADATA_KEYS:
                excluded_descriptive += 1
                excluded_contract_keys[sku][key] = _clean(row.get("label_ro")) or key
                continue
            if key == "steps" and not re.search(r"\d", _clean(row.get("value_raw"))):
                key = "material"
            grouped[key].append(row)

        for key, rows in grouped.items():
            original_rows = rows
            if _is_synthetic_aggregate(rows, source_grouped.get(key, [])):
                rows = source_grouped[key]
            value_raw, value_num, source_unit, conflicts = _collapse_values(rows)
            if not value_raw:
                continue
            combined_conflicts += conflicts
            canonical_row = canonical.get(key)
            label = INDUSTRY_LABELS.get(key) or _clean(canonical_row.get("label_ro") if canonical_row else "")
            if not label:
                label = _clean(rows[0].get("label_ro")) or key.replace("_", " ").capitalize()
            unit = _row_unit(value_raw, source_unit, canonical_row.get("canonical_unit") if canonical_row else None)
            if unit is None:
                previous_units = {_canonical_unit(row.get("unit"), None) for row in original_rows}
                previous_units.discard(None)
                if len(previous_units) == 1:
                    unit = next(iter(previous_units))
            normalized_by_sku[sku].append({
                "sku": sku,
                "key_raw": canonical_row.get("label_en") if canonical_row else key.replace("_", " ").title(),
                "key_norm": key,
                "label_ro": label,
                "value_raw": value_raw,
                "value_num": value_num,
                "unit": unit,
                "position": min(int(row.get("position") or 0) for row in rows),
            })
        if profile.key in {"rotary_hammer", "drill_driver"}:
            material_keys = {
                "max_drilling_diameter_concrete",
                "max_drilling_diameter_steel",
                "max_drilling_diameter_wood",
            }
            present_keys = {row["key_norm"] for row in normalized_by_sku[sku]}
            if present_keys & material_keys:
                normalized_by_sku[sku] = [
                    row
                    for row in normalized_by_sku[sku]
                    if row["key_norm"] != "max_drilling_capacity"
                    or not re.search(r"beton|concrete|oțel|otel|steel|lemn|wood", row["value_raw"], re.I)
                ]

    propagated = 0
    for rule in family_rules:
        if not rule["safe_fill_candidate"]:
            continue
        product_id = rule["product_id"]
        key = aliases.get(rule["canonical_key"], rule["canonical_key"])
        present = [
            row
            for sku in family_skus.get(product_id, [])
            for row in normalized_by_sku.get(sku, [])
            if row["key_norm"] == key
        ]
        values = {_token(row["value_raw"]) for row in present}
        if len(values) != 1 or not present:
            continue
        representative = present[0]
        for sku in family_skus.get(product_id, []):
            if any(row["key_norm"] == key for row in normalized_by_sku.get(sku, [])):
                continue
            normalized_by_sku[sku].append(representative | {"sku": sku})
            propagated += 1

    contracts: list[dict[str, Any]] = []
    contract_scopes: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    for variant in variants:
        sku = variant["sku"]
        profile = profile_by_sku[sku]
        if profile.contract_scope == "profile":
            base_key = profile.key
            scope_type = "profile"
        elif variant["category_id"] is not None:
            base_key = str(variant["category_id"])
            scope_type = "category"
        else:
            base_key = variant["product_id"]
            scope_type = "family"
        contract_scopes[(scope_type, base_key, profile.key)].add(sku)

    for (scope_type, base_key, profile_key), skus in contract_scopes.items():
        representative = variant_by_sku[next(iter(skus))]
        profile = profile_by_sku[next(iter(skus))]
        power_sources = frozenset(power_source_by_sku[sku] for sku in skus)
        counts = Counter(
            row["key_norm"]
            for sku in skus
            for row in normalized_by_sku.get(sku, [])
        )
        labels: dict[str, str] = {}
        for sku in skus:
            for row in normalized_by_sku.get(sku, []):
                labels.setdefault(row["key_norm"], row["label_ro"])
            for key, label in excluded_contract_keys.get(sku, {}).items():
                counts[key] += 1
                labels.setdefault(key, label)
        decisions = {
            key: semantic_decision(
                profile,
                key,
                known_industry_key=key in INDUSTRY_LABELS,
                power_sources=power_sources,
            )
            for key in counts
        }
        ranked = sorted(
            counts,
            key=lambda key: (
                {"aligned": 0, "conditional": 1, "rejected": 2}[decisions[key][0]],
                INDUSTRY_PRIORITY.get(key, 50),
                -(counts[key] / len(skus)),
                key,
            ),
        )
        if scope_type == "profile":
            category_id = None
            scope_label = profile.label_ro
        elif scope_type == "category":
            category_id = int(base_key)
            scope_label = representative["category_name"] or f"Categoria {category_id}"
        else:
            category_id = None
            scope_label = representative["title_ro"] or representative["title_en"] or base_key
        scope_key = profile_key if scope_type == "profile" else f"{base_key}:{profile_key}"
        for position, key in enumerate(ranked):
            coverage = counts[key] / len(skus)
            semantic_status, rationale = decisions[key]
            canonical_row = canonical.get(key)
            units = {
                row["unit"]
                for sku in skus
                for row in normalized_by_sku.get(sku, [])
                if row["key_norm"] == key
            }
            label = INDUSTRY_LABELS.get(key) or _clean(canonical_row.get("label_ro") if canonical_row else "") or labels.get(key) or key
            if semantic_status == "rejected":
                requirement = "rejected"
            elif semantic_status == "conditional":
                requirement = "conditional"
            elif scope_type == "family" and coverage == 1:
                requirement = "shared"
            else:
                requirement = "core" if coverage >= 0.65 else "recommended" if coverage >= 0.35 else "optional"
            contracts.append({
                "scope_type": scope_type,
                "scope_key": scope_key,
                "scope_label": scope_label,
                "category_id": category_id,
                "profile_key": profile.key,
                "profile_label": profile.label_ro,
                "power_sources": json.dumps(sorted(power_sources), ensure_ascii=False),
                "canonical_key": key,
                "label_ro": label,
                "canonical_unit": next(iter(units)) if len(units) == 1 and None not in units else None,
                "requirement": requirement,
                "semantic_status": semantic_status,
                "rationale": rationale,
                "coverage": coverage,
                "sku_count": counts[key],
                "position": position,
            })

    contract_positions = {
        (row["scope_type"], row["scope_key"], row["canonical_key"]): row["position"]
        for row in contracts
    }
    output: list[dict[str, Any]] = []
    for sku, rows in normalized_by_sku.items():
        variant = variant_by_sku[sku]
        profile = profile_by_sku[sku]
        if profile.contract_scope == "profile":
            scope_type = "profile"
            base_key = profile.key
        elif variant["category_id"] is not None:
            scope_type = "category"
            base_key = str(variant["category_id"])
        else:
            scope_type = "family"
            base_key = variant["product_id"]
        scope_key = profile.key if scope_type == "profile" else f"{base_key}:{profile.key}"
        rows.sort(key=lambda row: (
            contract_positions.get((scope_type, scope_key, row["key_norm"]), 1000 + INDUSTRY_PRIORITY.get(row["key_norm"], 50)),
            row["position"],
            row["key_norm"],
        ))
        for position, row in enumerate(rows):
            output.append(row | {"position": position})
    output.sort(key=lambda row: (row["sku"], row["position"], row["key_norm"]))

    derived_family_rules: list[dict[str, Any]] = []
    for product_id, all_skus in family_skus.items():
        keys = {
            row["key_norm"]
            for sku in all_skus
            for row in normalized_by_sku.get(sku, [])
        }
        for key in sorted(keys):
            present_skus = {
                sku
                for sku in all_skus
                if any(row["key_norm"] == key for row in normalized_by_sku.get(sku, []))
            }
            values = {
                _token(row["value_raw"])
                for sku in present_skus
                for row in normalized_by_sku[sku]
                if row["key_norm"] == key
            }
            coverage = len(present_skus) / len(all_skus)
            mode = "variant" if len(values) > 1 else "shared" if coverage == 1 else "optional"
            derived_family_rules.append({
                "product_id": product_id,
                "canonical_key": key,
                "mode": mode,
                "coverage": coverage,
                "distinct_values": len(values),
                "missing_skus": json.dumps(sorted(set(all_skus) - present_skus)),
                "safe_fill_candidate": 0,
            })

    source_fingerprint = _fingerprint(
        source + curated,
        ["sku", "key_raw", "key_norm", "label_ro", "value_raw", "value_num", "unit", "position", "source_kind"],
    )
    output_fingerprint = _fingerprint(
        output,
        ["sku", "key_raw", "key_norm", "label_ro", "value_raw", "value_num", "unit", "position"],
    )
    semantic_exclusions = []
    for sku, keys in excluded_contract_keys.items():
        profile = profile_by_sku[sku]
        for key, label in keys.items():
            _, rationale = semantic_decision(
                profile,
                key,
                known_industry_key=key in INDUSTRY_LABELS,
                power_sources=frozenset({power_source_by_sku[sku]}),
            )
            semantic_exclusions.append({
                "sku": sku,
                "canonical_key": key,
                "label_ro": label,
                "profile_key": profile.key,
                "rationale": rationale,
            })
    semantic_exclusions.sort(key=lambda row: (row["sku"], row["canonical_key"]))
    variant_profiles = [
        {
            "sku": variant["sku"],
            "product_id": variant["product_id"],
            "category_id": variant["category_id"],
            "profile_key": profile_by_sku[variant["sku"]].key,
            "profile_label": profile_by_sku[variant["sku"]].label_ro,
            "power_source": power_source_by_sku[variant["sku"]],
        }
        for variant in variants
    ]
    return {
        "rows": output,
        "contracts": contracts,
        "semantic_exclusions": semantic_exclusions,
        "variant_profiles": variant_profiles,
        "family_rules": derived_family_rules,
        "aliases": aliases,
        "source_fingerprint": source_fingerprint,
        "output_fingerprint": output_fingerprint,
        "summary": {
            "catalog_skus": len(variants),
            "normalized_skus": len(normalized_by_sku),
            "normalized_rows": len(output),
            "canonical_keys_used": len({row["key_norm"] for row in output}),
            "automatic_aliases": len(aliases),
            "descriptive_rows_excluded": excluded_descriptive,
            "relationship_rows_excluded": excluded_relationships,
            "conflicting_values_combined": combined_conflicts,
            "shared_values_propagated": propagated,
            "category_contracts": len({row["category_id"] for row in variants if row["category_id"] is not None}),
            "profile_contracts": len({row["scope_key"] for row in contracts if row["scope_type"] == "profile"}),
            "category_standard_contracts": len({row["scope_key"] for row in contracts if row["scope_type"] == "category"}),
            "family_fallback_contracts": len({row["scope_key"].split(":", 1)[0] for row in contracts if row["scope_type"] == "family"}),
            "semantic_profiles": len({row["profile_key"] for row in contracts if row["scope_type"] == "profile"}),
            "contract_scopes": len({(row["scope_type"], row["scope_key"]) for row in contracts}),
            "contract_rules": len(contracts),
            "aligned_contract_rules": sum(row["semantic_status"] == "aligned" for row in contracts),
            "conditional_contract_rules": sum(row["semantic_status"] == "conditional" for row in contracts),
            "rejected_contract_rules": sum(row["semantic_status"] == "rejected" for row in contracts),
            "family_rules": len(derived_family_rules),
            "variant_profile_rows": len(variant_profiles),
        },
    }


def apply_autopilot(
    db_path: str | Path,
    *,
    backup_dir: str | Path | None = None,
) -> dict[str, Any]:
    database_path = Path(db_path)
    conn = sqlite3.connect(database_path, timeout=30)
    conn.row_factory = sqlite3.Row
    plan = build_plan(conn)
    backup_path = _backup_database(
        conn,
        Path(backup_dir) if backup_dir else database_path.parent / "backups",
    )
    source_before = _fingerprint(
        [dict(row) for row in conn.execute("SELECT * FROM source_specification ORDER BY id")],
        ["id", "sku", "key_raw", "key_norm", "label_ro", "value_raw", "value_num", "unit", "position"],
    )
    variants_before = _fingerprint(
        [dict(row) for row in conn.execute("SELECT * FROM variant ORDER BY sku")],
        ["sku", "product_id", "category_id", "name_ro", "value", "position"],
    )
    now = datetime.now(UTC).isoformat()
    try:
        _ensure_contract_schema(conn)
        conn.execute("BEGIN IMMEDIATE")
        conn.execute("DELETE FROM specification")
        conn.executemany(
            "INSERT INTO specification(sku,key_raw,key_norm,label_ro,value_raw,value_num,unit,position) "
            "VALUES (:sku,:key_raw,:key_norm,:label_ro,:value_raw,:value_num,:unit,:position)",
            plan["rows"],
        )
        conn.execute("DELETE FROM catalog_spec_override")
        conn.executemany(
            "INSERT INTO catalog_spec_override(sku,mode,updated_at) VALUES (?,'replace',?)",
            [(sku, now) for sku in sorted({row["sku"] for row in plan["rows"]})],
        )
        conn.execute("DELETE FROM spec_category_contract")
        conn.executemany(
            "INSERT INTO spec_category_contract(scope_type,scope_key,scope_label,category_id,"
            "profile_key,profile_label,power_sources,canonical_key,label_ro,canonical_unit,requirement,semantic_status,"
            "rationale,coverage,sku_count,position,generated_at) "
            "VALUES (:scope_type,:scope_key,:scope_label,:category_id,:profile_key,:profile_label,:power_sources,"
            ":canonical_key,:label_ro,:canonical_unit,:requirement,:semantic_status,:rationale,"
            ":coverage,:sku_count,:position,:generated_at)",
            [row | {"generated_at": now} for row in plan["contracts"]],
        )
        conn.execute("DELETE FROM spec_semantic_exclusion")
        conn.executemany(
            "INSERT INTO spec_semantic_exclusion(sku,canonical_key,label_ro,profile_key,rationale,generated_at) "
            "VALUES (:sku,:canonical_key,:label_ro,:profile_key,:rationale,:generated_at)",
            [row | {"generated_at": now} for row in plan["semantic_exclusions"]],
        )
        conn.execute("DELETE FROM spec_variant_profile")
        conn.executemany(
            "INSERT INTO spec_variant_profile(sku,product_id,category_id,profile_key,profile_label,"
            "power_source,generated_at) VALUES (:sku,:product_id,:category_id,:profile_key,:profile_label,"
            ":power_source,:generated_at)",
            [row | {"generated_at": now} for row in plan["variant_profiles"]],
        )
        conn.execute("DELETE FROM spec_family_rule")
        conn.executemany(
            "INSERT INTO spec_family_rule(product_id,canonical_key,mode,coverage,distinct_values,"
            "missing_skus,safe_fill_candidate,status,created_at,updated_at) "
            "VALUES (:product_id,:canonical_key,:mode,:coverage,:distinct_values,:missing_skus,"
            ":safe_fill_candidate,'approved',:created_at,:updated_at)",
            [row | {"created_at": now, "updated_at": now} for row in plan["family_rules"]],
        )
        for alias_key, canonical_key in plan["aliases"].items():
            if alias_key == canonical_key:
                continue
            conn.execute(
                "INSERT INTO spec_alias_proposal(alias_key,canonical_key,confidence,evidence_count,coverage,"
                "reason,status,created_at,updated_at) VALUES (?,?,'autopilot',0,1.0,"
                "'Industry terminology and canonical-label equivalence','approved',?,?) "
                "ON CONFLICT(alias_key) DO UPDATE SET canonical_key=excluded.canonical_key,confidence='autopilot',"
                "reason=excluded.reason,status='approved',updated_at=excluded.updated_at",
                (alias_key, canonical_key, now, now),
            )
        conn.execute(
            "UPDATE spec_canonical_key SET label_ro_confidence='approved',status='approved',"
            "label_ro_source=CASE WHEN key IN ({}) THEN 'industry_glossary' ELSE 'autopilot_review' END,"
            "updated_at=?".format(",".join("?" for _ in INDUSTRY_LABELS)),
            (*INDUSTRY_LABELS.keys(), now),
        )
        for key, label in INDUSTRY_LABELS.items():
            conn.execute(
                "UPDATE spec_canonical_key SET label_ro=?,label_ro_source='industry_glossary',"
                "label_ro_confidence='approved',status='approved',updated_at=? WHERE key=?",
                (label, now, key),
            )
        units_by_key: dict[str, set[str | None]] = defaultdict(set)
        for row in plan["rows"]:
            units_by_key[row["key_norm"]].add(row["unit"])
        for key in {row["key_norm"] for row in plan["rows"]}:
            units = units_by_key.get(key, set())
            conn.execute(
                "UPDATE spec_canonical_key SET canonical_unit=?,updated_at=? WHERE key=?",
                (next(iter(units)) if len(units) == 1 and None not in units else None, now, key),
            )
        conn.execute(
            "INSERT INTO spec_normalization_application(generated_at,source_fingerprint,output_fingerprint,"
            "backup_path,summary_json) VALUES (?,?,?,?,?)",
            (now, plan["source_fingerprint"], plan["output_fingerprint"], str(backup_path), json.dumps(plan["summary"])),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise

    source_after = _fingerprint(
        [dict(row) for row in conn.execute("SELECT * FROM source_specification ORDER BY id")],
        ["id", "sku", "key_raw", "key_norm", "label_ro", "value_raw", "value_num", "unit", "position"],
    )
    variants_after = _fingerprint(
        [dict(row) for row in conn.execute("SELECT * FROM variant ORDER BY sku")],
        ["sku", "product_id", "category_id", "name_ro", "value", "position"],
    )
    conn.close()
    if source_before != source_after or variants_before != variants_after:
        raise RuntimeError("Source specifications or variant membership changed during normalization")
    return {
        **plan["summary"],
        "source_fingerprint": plan["source_fingerprint"],
        "output_fingerprint": plan["output_fingerprint"],
        "backup_path": str(backup_path),
        "source_rows_preserved": True,
        "variant_membership_preserved": True,
        "medusa_writes": 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.apply:
        report = apply_autopilot(args.db_path, backup_dir=args.backup_dir)
    else:
        conn = sqlite3.connect(args.db_path)
        try:
            plan = build_plan(conn)
        finally:
            conn.close()
        report = plan["summary"] | {
            "source_fingerprint": plan["source_fingerprint"],
            "output_fingerprint": plan["output_fingerprint"],
            "dry_run": True,
        }
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
