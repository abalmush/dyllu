"""Build a versioned, read-only normalization preview for all catalog SKUs.

The command writes only preview metadata. Source specifications, curated
overrides, variant membership, and family values are never changed.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

try:
    from .specification_quality import merge_effective_specs
except ImportError:  # direct ``python tools/specification_normalization.py`` execution
    from specification_quality import merge_effective_specs


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS spec_normalization_run (
  id INTEGER PRIMARY KEY,
  generated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'preview',
  source_fingerprint TEXT NOT NULL,
  summary_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spec_normalization_item (
  id INTEGER PRIMARY KEY,
  run_id INTEGER NOT NULL,
  sku TEXT NOT NULL,
  product_id TEXT,
  available INTEGER NOT NULL DEFAULT 0,
  source_kind TEXT NOT NULL,
  source_row_id INTEGER,
  action TEXT NOT NULL,
  state TEXT NOT NULL,
  current_key TEXT,
  canonical_key TEXT,
  current_label TEXT,
  proposed_label TEXT,
  current_value TEXT,
  proposed_value TEXT,
  current_unit TEXT,
  proposed_unit TEXT,
  family_mode TEXT,
  reason TEXT NOT NULL,
  FOREIGN KEY(run_id) REFERENCES spec_normalization_run(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS spec_normalization_decision (
  id INTEGER PRIMARY KEY,
  run_id INTEGER NOT NULL,
  batch_key TEXT NOT NULL,
  decision TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  UNIQUE(run_id, batch_key),
  FOREIGN KEY(run_id) REFERENCES spec_normalization_run(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_spec_normalization_item_run
  ON spec_normalization_item(run_id);
CREATE INDEX IF NOT EXISTS idx_spec_normalization_item_run_action
  ON spec_normalization_item(run_id, action);
CREATE INDEX IF NOT EXISTS idx_spec_normalization_item_run_state
  ON spec_normalization_item(run_id, state);
CREATE INDEX IF NOT EXISTS idx_spec_normalization_item_run_sku
  ON spec_normalization_item(run_id, sku);
CREATE INDEX IF NOT EXISTS idx_spec_normalization_item_run_available
  ON spec_normalization_item(run_id, available);
CREATE INDEX IF NOT EXISTS idx_spec_normalization_decision_run
  ON spec_normalization_decision(run_id);
"""

_RELATIONSHIP_LABEL = re.compile(r"^(?:include|included|compatibil)", re.IGNORECASE)


def _clean(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def _identity(row: dict[str, Any]) -> str:
    return _clean(row.get("key_norm")) or _clean(row.get("key_raw")) or (
        f"position:{row.get('position') or 0}"
    )


def _value_token(value: Any) -> str:
    return (
        _clean(value)
        .replace("–", "-")
        .replace("—", "-")
        .replace("×", "x")
        .replace(",", ".")
        .replace(" ", "")
    )


def _unit_token(value: Any) -> str:
    token = _clean(value).replace(" ", "").replace("·", ".")
    equivalents = {
        "nm": "n.m",
        "n-m": "n.m",
        "rot/min": "rpm",
        "r/min": "rpm",
        "l/min.": "l/min",
        "litri/min": "l/min",
        "litru/min": "l/min",
        "volt": "v",
        "volts": "v",
        "watt": "w",
        "watts": "w",
        "kilowatt": "kw",
        "kilowatts": "kw",
    }
    return equivalents.get(token, token)


def _rows_by_sku(rows: Iterable[dict[str, Any]]) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        if row.get("sku"):
            result[str(row["sku"])].append(row)
    return result


def _fingerprint(tables: dict[str, list[dict[str, Any]]]) -> str:
    digest = hashlib.sha256()
    for table_name in sorted(tables):
        digest.update(table_name.encode())
        for row in tables[table_name]:
            digest.update(
                json.dumps(row, sort_keys=True, ensure_ascii=False, default=str).encode()
            )
    return digest.hexdigest()


def _item(
    *,
    sku: str,
    product_id: str | None,
    available: bool,
    source_kind: str,
    action: str,
    state: str,
    reason: str,
    row: dict[str, Any] | None = None,
    canonical_key: str | None = None,
    proposed_label: str | None = None,
    proposed_value: str | None = None,
    proposed_unit: str | None = None,
    family_mode: str | None = None,
) -> dict[str, Any]:
    row = row or {}
    return {
        "sku": sku,
        "product_id": product_id,
        "available": available,
        "source_kind": source_kind,
        "source_row_id": row.get("id"),
        "action": action,
        "state": state,
        "current_key": _identity(row) if row else None,
        "canonical_key": canonical_key,
        "current_label": row.get("label_ro"),
        "proposed_label": proposed_label,
        "current_value": row.get("value_raw"),
        "proposed_value": proposed_value,
        "current_unit": row.get("unit"),
        "proposed_unit": proposed_unit,
        "family_mode": family_mode,
        "reason": reason,
    }


def build_preview(conn: sqlite3.Connection) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    source = [dict(row) | {"source_kind": "source"} for row in conn.execute(
        "SELECT * FROM source_specification ORDER BY id"
    )]
    curated = [dict(row) | {"source_kind": "curated"} for row in conn.execute(
        "SELECT * FROM specification ORDER BY id"
    )]
    variants = [dict(row) for row in conn.execute(
        "SELECT sku,product_id FROM variant ORDER BY sku"
    )]
    overrides = [dict(row) for row in conn.execute(
        "SELECT sku,mode,updated_at FROM catalog_spec_override ORDER BY sku"
    )]
    canonical_rows = [dict(row) for row in conn.execute(
        "SELECT * FROM spec_canonical_key ORDER BY key"
    )]
    alias_rows = [dict(row) for row in conn.execute(
        "SELECT * FROM spec_alias_proposal ORDER BY alias_key"
    )]
    family_rows = [dict(row) for row in conn.execute(
        "SELECT * FROM spec_family_rule ORDER BY product_id,canonical_key"
    )]
    availability_rows = [dict(row) for row in conn.execute(
        "SELECT sku,available FROM catalog_availability ORDER BY sku"
    )]

    source_by_sku = _rows_by_sku(source)
    curated_by_sku = _rows_by_sku(curated)
    override_skus = {row["sku"] for row in overrides}
    variant_by_sku = {row["sku"]: row for row in variants}
    family_skus: dict[str, list[str]] = defaultdict(list)
    for row in variants:
        if row["product_id"]:
            family_skus[row["product_id"]].append(row["sku"])
    available_skus = {row["sku"] for row in availability_rows if row["available"]}
    canonical = {row["key"]: row for row in canonical_rows}
    aliases = {row["alias_key"]: row for row in alias_rows}
    family_rules = {
        (row["product_id"], row["canonical_key"]): row for row in family_rows
    }

    effective_by_sku: dict[str, list[dict[str, Any]]] = {}
    for sku in variant_by_sku:
        effective_by_sku[sku] = merge_effective_specs(
            source_by_sku.get(sku, []),
            curated_by_sku.get(sku, []),
            sku in override_skus,
        )

    items: list[dict[str, Any]] = []
    technical_rows = 0
    feature_rows = 0
    relationship_rows = 0
    for sku, rows in effective_by_sku.items():
        product_id = variant_by_sku[sku]["product_id"]
        is_available = sku in available_skus
        technical: list[dict[str, Any]] = []
        for row in rows:
            has_value = bool(_clean(row.get("value_raw"))) or row.get("value_num") is not None
            if not has_value:
                label = str(row.get("label_ro") or row.get("key_raw") or "")
                is_relationship = bool(_RELATIONSHIP_LABEL.match(label))
                if is_relationship:
                    relationship_rows += 1
                else:
                    feature_rows += 1
                items.append(
                    _item(
                        sku=sku,
                        product_id=product_id,
                        available=is_available,
                        source_kind=row["source_kind"],
                        action="move_to_relationship" if is_relationship else "move_to_feature",
                        state="needs_approval",
                        reason=(
                            "Blank-value relationship text does not belong in technical specifications"
                            if is_relationship
                            else "Blank-value descriptive text belongs in product features"
                        ),
                        row=row,
                    )
                )
                continue

            technical_rows += 1
            technical.append(row)
            current_key = _identity(row)
            alias = aliases.get(current_key)
            canonical_key = alias["canonical_key"] if alias else current_key
            family_rule = family_rules.get((product_id, current_key)) if product_id else None
            family_mode = family_rule["mode"] if family_rule else None
            alias_is_approved = not alias or alias["status"] == "approved"

            if alias and canonical_key != current_key:
                if alias["status"] == "approved":
                    state = "ready"
                elif alias["confidence"] in {"deterministic", "high"}:
                    state = "needs_approval"
                else:
                    state = "blocked"
                items.append(
                    _item(
                        sku=sku,
                        product_id=product_id,
                        available=is_available,
                        source_kind=row["source_kind"],
                        action="rename_key",
                        state=state,
                        reason=(
                            f"{alias['confidence']} alias based on {alias['evidence_count']} evidence rows"
                        ),
                        row=row,
                        canonical_key=canonical_key,
                        family_mode=family_mode,
                    )
                )

            canonical_row = canonical.get(canonical_key)
            proposed_label = canonical_row["label_ro"] if canonical_row else None
            if proposed_label and _clean(row.get("label_ro")) != _clean(proposed_label):
                if not alias_is_approved:
                    label_state = "blocked_by_alias"
                elif canonical_row["label_ro_confidence"] in {"approved", "high"}:
                    label_state = "ready"
                else:
                    label_state = "needs_translation_review"
                items.append(
                    _item(
                        sku=sku,
                        product_id=product_id,
                        available=is_available,
                        source_kind=row["source_kind"],
                        action="align_label",
                        state=label_state,
                        reason=(
                            "Use the canonical customer-facing Romanian label; values remain unchanged"
                        ),
                        row=row,
                        canonical_key=canonical_key,
                        proposed_label=proposed_label,
                        family_mode=family_mode,
                    )
                )

            canonical_unit = canonical_row["canonical_unit"] if canonical_row else None
            current_unit = row.get("unit")
            if canonical_unit and current_unit and current_unit != canonical_unit:
                equivalent = _unit_token(current_unit) == _unit_token(canonical_unit)
                items.append(
                    _item(
                        sku=sku,
                        product_id=product_id,
                        available=is_available,
                        source_kind=row["source_kind"],
                        action="normalize_unit",
                        state="ready" if equivalent else "blocked",
                        reason=(
                            "Equivalent unit spelling; numeric value is unchanged"
                            if equivalent
                            else "Unit conversion requires an explicit conversion rule"
                        ),
                        row=row,
                        canonical_key=canonical_key,
                        proposed_unit=canonical_unit,
                        family_mode=family_mode,
                    )
                )

        duplicate_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in technical:
            duplicate_groups[_identity(row)].append(row)
        for key, duplicates in duplicate_groups.items():
            if len(duplicates) < 2:
                continue
            values = {_value_token(row.get("value_raw")) for row in duplicates}
            if len(values) == 1:
                for duplicate in duplicates[1:]:
                    items.append(
                        _item(
                            sku=sku,
                            product_id=product_id,
                            available=is_available,
                            source_kind=duplicate["source_kind"],
                            action="deduplicate_exact",
                            state="ready",
                            reason="Same SKU, key, and normalized value already occur earlier",
                            row=duplicate,
                            canonical_key=key,
                        )
                    )
            else:
                values_display = " | ".join(
                    str(row.get("value_raw") or "") for row in duplicates
                )
                items.append(
                    _item(
                        sku=sku,
                        product_id=product_id,
                        available=is_available,
                        source_kind="effective",
                        action="resolve_conflict",
                        state="blocked",
                        reason=f"Conflicting values must be assigned component or variant context: {values_display}",
                        row=duplicates[0],
                        canonical_key=key,
                    )
                )

    propagation_count = 0
    for rule in family_rows:
        if not rule["safe_fill_candidate"]:
            continue
        product_id = rule["product_id"]
        key = rule["canonical_key"]
        missing_skus = json.loads(rule["missing_skus"])
        present_rows = [
            row
            for sku in family_skus.get(product_id, [])
            for row in effective_by_sku.get(sku, [])
            if _identity(row) == key
            and (bool(_clean(row.get("value_raw"))) or row.get("value_num") is not None)
        ]
        values = {
            _value_token(row.get("value_raw"))
            for row in present_rows
            if _value_token(row.get("value_raw"))
        }
        if len(values) != 1 or not present_rows:
            continue
        representative = Counter(
            str(row.get("value_raw") or "") for row in present_rows
        ).most_common(1)[0][0]
        representative_unit = Counter(
            str(row.get("unit") or "") for row in present_rows
        ).most_common(1)[0][0] or None
        canonical_row = canonical.get(key)
        for sku in missing_skus:
            if sku not in variant_by_sku:
                continue
            propagation_count += 1
            items.append(
                _item(
                    sku=sku,
                    product_id=product_id,
                    available=sku in available_skus,
                    source_kind="family_preview",
                    action="propagate_shared",
                    state="ready" if rule["status"] == "approved" else "needs_approval",
                    reason=(
                        f"Shared across {len(present_rows)} family rows at {round(rule['coverage'] * 100)}% coverage"
                    ),
                    canonical_key=key,
                    proposed_label=canonical_row["label_ro"] if canonical_row else None,
                    proposed_value=representative,
                    proposed_unit=representative_unit,
                    family_mode=rule["mode"],
                )
            )

    action_counts = Counter(item["action"] for item in items)
    state_counts = Counter(item["state"] for item in items)
    family_mode_counts = Counter(row["mode"] for row in family_rows)
    affected_skus = {item["sku"] for item in items}
    fingerprint = _fingerprint(
        {
            "source": source,
            "curated": curated,
            "variants": variants,
            "overrides": overrides,
            "canonical": canonical_rows,
            "aliases": alias_rows,
            "family_rules": family_rows,
        }
    )
    summary = {
        "product_families": len(family_skus),
        "skus_total": len(variants),
        "skus_with_effective_specs": sum(bool(rows) for rows in effective_by_sku.values()),
        "purchasable_skus": len(available_skus),
        "technical_effective_rows": technical_rows,
        "feature_rows": feature_rows,
        "relationship_rows": relationship_rows,
        "preview_actions": len(items),
        "affected_skus": len(affected_skus),
        "affected_purchasable_skus": len(affected_skus & available_skus),
        "family_rules": len(family_rows),
        "family_modes": dict(family_mode_counts),
        "shared_value_fill_proposals": propagation_count,
        "actions": dict(action_counts),
        "states": dict(state_counts),
    }
    return {"items": items, "summary": summary, "source_fingerprint": fingerprint}


def _backup_database(conn: sqlite3.Connection, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = backup_dir / f"catalog-before-spec-preview-{timestamp}.db"
    destination = sqlite3.connect(backup_path)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return backup_path


def apply_preview(
    db_path: str | Path,
    *,
    backup_dir: str | Path | None = None,
    retain_runs: int = 3,
) -> dict[str, Any]:
    database_path = Path(db_path)
    conn = sqlite3.connect(database_path, timeout=30)
    conn.row_factory = sqlite3.Row
    backup_path = _backup_database(
        conn, Path(backup_dir) if backup_dir else database_path.parent / "backups"
    )
    preview = build_preview(conn)
    now = datetime.now(UTC).isoformat()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.execute("BEGIN IMMEDIATE")
        cursor = conn.execute(
            "INSERT INTO spec_normalization_run"
            "(generated_at,status,source_fingerprint,summary_json) VALUES (?,'preview',?,?)",
            (now, preview["source_fingerprint"], json.dumps(preview["summary"])),
        )
        run_id = int(cursor.lastrowid)
        conn.executemany(
            "INSERT INTO spec_normalization_item"
            "(run_id,sku,product_id,available,source_kind,source_row_id,action,state,"
            "current_key,canonical_key,current_label,proposed_label,current_value,"
            "proposed_value,current_unit,proposed_unit,family_mode,reason) "
            "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            [
                (
                    run_id,
                    item["sku"],
                    item["product_id"],
                    1 if item["available"] else 0,
                    item["source_kind"],
                    item["source_row_id"],
                    item["action"],
                    item["state"],
                    item["current_key"],
                    item["canonical_key"],
                    item["current_label"],
                    item["proposed_label"],
                    item["current_value"],
                    item["proposed_value"],
                    item["current_unit"],
                    item["proposed_unit"],
                    item["family_mode"],
                    item["reason"],
                )
                for item in preview["items"]
            ],
        )
        old_runs = conn.execute(
            "SELECT id FROM spec_normalization_run ORDER BY id DESC LIMIT -1 OFFSET ?",
            (max(retain_runs, 1),),
        ).fetchall()
        if old_runs:
            old_ids = [row["id"] for row in old_runs]
            placeholders = ",".join("?" for _ in old_ids)
            conn.execute(
                f"DELETE FROM spec_normalization_item WHERE run_id IN ({placeholders})",
                old_ids,
            )
            conn.execute(
                f"DELETE FROM spec_normalization_run WHERE id IN ({placeholders})",
                old_ids,
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {
        "run_id": run_id,
        **preview["summary"],
        "source_fingerprint": preview["source_fingerprint"],
        "backup_path": str(backup_path),
        "writes_to_product_specifications": 0,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--retain-runs", type=int, default=3)
    args = parser.parse_args()
    if not args.apply:
        parser.error("Preview persistence is explicit; pass --apply")
    report = apply_preview(
        args.db_path,
        backup_dir=args.backup_dir,
        retain_runs=args.retain_runs,
    )
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
