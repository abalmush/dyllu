"""Audit catalog specifications without mutating source or curated data.

The report is the first stage of specification normalization. It measures the
effective rows shown by the dashboard, proposes only deterministic key aliases,
and classifies family keys as shared, variant-specific, or optional. Applying
changes is intentionally a separate, reviewable step.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable


SAFE_KEY_ALIASES = {
    "barrel_diamater": "barrel_diameter",
    "blades_size": "blade_size",
    "bore_diamter": "bore_diameter",
    "brad_lenght": "brad_length",
    "colour": "color",
    "displacemetn": "displacement",
    "meterial": "material",
    "rate_voltage": "rated_voltage",
    "weigh": "weight",
}

_PROSE_KEY = re.compile(r"^(?:with|include|included|optional)(?:_|$)", re.IGNORECASE)
_RELATIONSHIP_LABEL = re.compile(r"^(?:include|compatibil)", re.IGNORECASE)


def _clean(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _value_token(value: Any) -> str:
    return (
        _clean(value)
        .replace("–", "-")
        .replace("—", "-")
        .replace("×", "x")
        .replace(",", ".")
        .replace(" ", "")
    )


def _identity(row: dict[str, Any]) -> str:
    return _clean(row.get("key_norm")) or _clean(row.get("key_raw")) or (
        f"position:{row.get('position') or 0}"
    )


def _ordered(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(rows, key=lambda row: (row.get("position") or 0, row.get("id") or 0))


def _occurrence_rows(rows: Iterable[dict[str, Any]]) -> list[tuple[str, dict[str, Any]]]:
    occurrences: Counter[str] = Counter()
    out: list[tuple[str, dict[str, Any]]] = []
    for row in _ordered(rows):
        base = _identity(row)
        key = f"{base}:{occurrences[base]}"
        occurrences[base] += 1
        out.append((key, row))
    return out


def merge_effective_specs(
    source_rows: Iterable[dict[str, Any]],
    curated_rows: Iterable[dict[str, Any]],
    replace_all: bool,
) -> list[dict[str, Any]]:
    curated = _ordered(curated_rows)
    if replace_all:
        return curated
    result = [row for _, row in _occurrence_rows(source_rows)]
    indexes = {
        key: index for index, (key, _) in enumerate(_occurrence_rows(source_rows))
    }
    for key, row in _occurrence_rows(curated):
        if key in indexes:
            result[indexes[key]] = row
        else:
            result.append(row)
    return result


def _rows_by_sku(rows: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    out: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if row.get("sku"):
            out[str(row["sku"])].append(row)
    return out


def _duplicate_findings(rows_by_sku: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    exact: list[dict[str, Any]] = []
    conflicting: list[dict[str, Any]] = []
    for sku, rows in rows_by_sku.items():
        by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in rows:
            by_key[_identity(row)].append(row)
        for key, matches in by_key.items():
            if len(matches) < 2:
                continue
            finding = {
                "sku": sku,
                "key": key,
                "row_ids": [row.get("id") for row in matches],
                "values": [row.get("value_raw") for row in matches],
            }
            values = {_clean(row.get("value_raw")) for row in matches}
            if len(values) == 1:
                exact.append(finding)
            else:
                conflicting.append(finding)
    return {
        "exact_groups": exact,
        "exact_extra_rows": sum(len(item["row_ids"]) - 1 for item in exact),
        "conflicting_groups": conflicting,
        "conflicting_extra_rows": sum(
            len(item["row_ids"]) - 1 for item in conflicting
        ),
    }


def _family_findings(
    conn: sqlite3.Connection,
    effective_by_sku: dict[str, list[dict[str, Any]]],
) -> dict[str, Any]:
    variants_by_family: dict[str, list[str]] = defaultdict(list)
    for row in conn.execute("SELECT sku, product_id FROM variant"):
        if row["product_id"]:
            variants_by_family[row["product_id"]].append(row["sku"])
    product_meta = {
        row["id"]: dict(row)
        for row in conn.execute("SELECT id, title_ro, title_en, axis FROM product")
    }

    families: list[dict[str, Any]] = []
    mode_counts: Counter[str] = Counter()
    safe_fill_candidates = 0
    for product_id, skus in variants_by_family.items():
        if len(skus) < 2:
            continue
        values_by_key: dict[str, dict[str, list[str]]] = defaultdict(
            lambda: defaultdict(list)
        )
        for sku in skus:
            for spec in effective_by_sku.get(sku, []):
                values_by_key[_identity(spec)][sku].append(
                    _clean(spec.get("value_raw"))
                )
        key_rules: list[dict[str, Any]] = []
        for key, sku_values in values_by_key.items():
            coverage = len(sku_values) / len(skus)
            distinct_values = {
                value
                for values in sku_values.values()
                for value in values
                if value
            }
            if coverage <= 0.5:
                mode = "optional"
            elif len(distinct_values) <= 1:
                mode = "shared"
            else:
                mode = "variant"
            mode_counts[mode] += 1
            missing_skus = [sku for sku in skus if sku not in sku_values]
            safe_fill = mode == "shared" and coverage >= 0.7 and bool(missing_skus)
            if safe_fill:
                safe_fill_candidates += len(missing_skus)
            if missing_skus or mode != "shared":
                key_rules.append(
                    {
                        "key": key,
                        "mode": mode,
                        "coverage": round(coverage, 4),
                        "distinct_values": len(distinct_values),
                        "missing_skus": missing_skus,
                        "safe_fill_candidate": safe_fill,
                    }
                )
        if key_rules:
            meta = product_meta.get(product_id, {})
            families.append(
                {
                    "product_id": product_id,
                    "title": meta.get("title_ro") or meta.get("title_en") or product_id,
                    "axis": meta.get("axis"),
                    "sku_count": len(skus),
                    "rules": sorted(
                        key_rules,
                        key=lambda rule: (
                            rule["mode"] != "variant",
                            -len(rule["missing_skus"]),
                            rule["key"],
                        ),
                    ),
                }
            )
    return {
        "multi_variant_families": sum(
            len(skus) > 1 for skus in variants_by_family.values()
        ),
        "families_with_alignment_findings": len(families),
        "key_mode_counts": dict(mode_counts),
        "safe_shared_value_fill_candidates": safe_fill_candidates,
        "families": sorted(
            families,
            key=lambda family: (-family["sku_count"], family["product_id"]),
        ),
    }


def _contextual_aliases(
    source_by_sku: dict[str, list[dict[str, Any]]],
    curated_by_sku: dict[str, list[dict[str, Any]]],
) -> list[dict[str, Any]]:
    matches: dict[str, Counter[str]] = defaultdict(Counter)
    totals: Counter[str] = Counter()
    for sku, curated_rows in curated_by_sku.items():
        source_rows = source_by_sku.get(sku, [])
        for row in curated_rows:
            alias = _identity(row)
            token = _value_token(row.get("value_raw"))
            if not token:
                continue
            totals[alias] += 1
            candidates = {
                _identity(source_row)
                for source_row in source_rows
                if _value_token(source_row.get("value_raw")) == token
            }
            if len(candidates) == 1:
                matches[alias][next(iter(candidates))] += 1

    proposals: list[dict[str, Any]] = []
    for alias, candidates in matches.items():
        target, support = candidates.most_common(1)[0]
        matched = sum(candidates.values())
        purity = support / matched
        coverage = support / totals[alias]
        if alias == target or support < 2 or purity < 0.9:
            continue
        proposals.append(
            {
                "from": alias,
                "to": target,
                "supporting_rows": support,
                "total_curated_rows": totals[alias],
                "coverage": round(coverage, 4),
                "purity": round(purity, 4),
                "confidence": "high" if coverage >= 0.7 and support >= 3 else "review",
                "reason": "same normalized value on the same SKU in source and curated rows",
            }
        )
    return sorted(
        proposals,
        key=lambda proposal: (-proposal["supporting_rows"], proposal["from"]),
    )


def _label_conflicts(rows: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    labels_by_key: dict[str, Counter[str]] = defaultdict(Counter)
    for row in rows:
        label = str(row.get("label_ro") or "").strip()
        if label:
            labels_by_key[_identity(row)][label] += 1
    return [
        {
            "key": key,
            "labels": dict(labels.most_common()),
            "rows": sum(labels.values()),
        }
        for key, labels in sorted(labels_by_key.items())
        if len(labels) > 1
    ]


def audit_database(conn: sqlite3.Connection) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    source = [dict(row) for row in conn.execute("SELECT * FROM source_specification")]
    curated = [dict(row) for row in conn.execute("SELECT * FROM specification")]
    source_by_sku = _rows_by_sku(source)
    curated_by_sku = _rows_by_sku(curated)
    override_skus = {
        row["sku"] for row in conn.execute("SELECT sku FROM catalog_spec_override")
    }
    variant_skus = [row["sku"] for row in conn.execute("SELECT sku FROM variant")]
    effective_by_sku = {
        sku: merge_effective_specs(
            source_by_sku.get(sku, []),
            curated_by_sku.get(sku, []),
            sku in override_skus,
        )
        for sku in variant_skus
    }
    effective = [row for rows in effective_by_sku.values() for row in rows]
    technical_effective = [
        row
        for row in effective
        if _clean(row.get("value_raw")) or row.get("value_num") is not None
    ]
    technical_by_sku = _rows_by_sku(technical_effective)
    feature_candidates = [
        row
        for row in effective
        if not _clean(row.get("value_raw")) and row.get("value_num") is None
    ]
    relationship_candidates = [
        row
        for row in feature_candidates
        if _RELATIONSHIP_LABEL.match(str(row.get("label_ro") or row.get("key_raw") or ""))
    ]
    dictionary = {
        _clean(row["key_raw"]): dict(row)
        for row in conn.execute("SELECT * FROM spec_key")
    }

    profiles: dict[str, dict[str, Any]] = {}
    by_key: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in technical_effective:
        by_key[_identity(row)].append(row)
    for key, rows in by_key.items():
        profiles[key] = {
            "rows": len(rows),
            "skus": len({row.get("sku") for row in rows}),
            "raw_names": sorted({str(row.get("key_raw") or "") for row in rows}),
            "labels": sorted({str(row.get("label_ro") or "") for row in rows}),
            "units": sorted({str(row.get("unit") or "") for row in rows}),
            "canonical_alias_proposal": SAFE_KEY_ALIASES.get(key),
            "parser_review": bool(_PROSE_KEY.match(key)),
        }

    duplicates = _duplicate_findings(technical_by_sku)
    families = _family_findings(conn, technical_by_sku)
    aliases = [
        {
            "from": key,
            "to": target,
            "rows": profiles.get(key, {}).get("rows", 0),
            "confidence": "deterministic",
            "reason": "spelling or terminology normalization",
        }
        for key, target in SAFE_KEY_ALIASES.items()
        if key in profiles
    ]
    contextual_aliases = _contextual_aliases(source_by_sku, curated_by_sku)
    curated_label_conflicts = _label_conflicts(curated)
    parser_review = [
        {"key": key, "rows": profile["rows"], "raw_names": profile["raw_names"]}
        for key, profile in profiles.items()
        if profile["parser_review"]
    ]
    key_frequency = Counter(_identity(row) for row in technical_effective)

    return {
        "schema_version": 1,
        "generated_at": datetime.now(UTC).isoformat(),
        "summary": {
            "source_rows": len(source),
            "source_skus": len(source_by_sku),
            "curated_rows": len(curated),
            "curated_skus": len(curated_by_sku),
            "effective_rows": len(effective),
            "effective_skus_with_specs": sum(bool(rows) for rows in effective_by_sku.values()),
            "technical_effective_rows": len(technical_effective),
            "feature_rows_misclassified_as_specs": len(feature_candidates),
            "relationship_rows_misclassified_as_specs": len(relationship_candidates),
            "effective_keys": len(profiles),
            "keys_used_once": sum(count == 1 for count in key_frequency.values()),
            "keys_used_at_most_twice": sum(count <= 2 for count in key_frequency.values()),
            "dictionary_keys": len(dictionary),
            "effective_rows_with_dictionary_mapping": sum(
                _clean(row.get("key_raw")) in dictionary for row in effective
            ),
            "exact_duplicate_groups": len(duplicates["exact_groups"]),
            "conflicting_duplicate_groups": len(duplicates["conflicting_groups"]),
            "deterministic_alias_proposals": len(aliases),
            "contextual_alias_proposals": len(contextual_aliases),
            "curated_keys_with_conflicting_labels": len(curated_label_conflicts),
            "parser_review_keys": len(parser_review),
        },
        "normalization_contract": {
            "raw_source_is_immutable": True,
            "curated_override_wins": True,
            "blank_value_row": "move out of specifications into features or relationships",
            "exact_duplicate_same_value": "auto-dedupe after preview",
            "duplicate_different_value": "review and add component context; never discard",
            "shared_family_key": "inherit missing values only after family rule approval",
            "variant_family_key": "align key/label/unit/order; preserve each SKU value",
            "optional_family_key": "do not propagate automatically",
        },
        "alias_proposals": aliases,
        "contextual_alias_proposals": contextual_aliases,
        "curated_label_conflicts": curated_label_conflicts,
        "parser_review": parser_review,
        "duplicates": duplicates,
        "families": families,
        "key_profiles": dict(sorted(profiles.items())),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    conn = sqlite3.connect(args.db_path)
    try:
        report = audit_database(conn)
    finally:
        conn.close()
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(rendered, encoding="utf-8")
    print(json.dumps(report["summary"], indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
