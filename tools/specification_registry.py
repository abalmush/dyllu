"""Build the reviewable specification registry from the quality audit.

This command never rewrites product specification rows. It creates or refreshes
canonical-key candidates, alias proposals, family-rule proposals, and an audit
snapshot. Existing manual review statuses are preserved across repeated runs.
"""

from __future__ import annotations

import argparse
import json
import sqlite3
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

try:
    from .specification_quality import audit_database
except ImportError:  # direct ``python tools/specification_registry.py`` execution
    from specification_quality import audit_database


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS spec_canonical_key (
  key TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  label_ro TEXT,
  label_ro_source TEXT,
  label_ro_confidence TEXT,
  search_terms_ro TEXT NOT NULL DEFAULT '[]',
  canonical_unit TEXT,
  value_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'candidate',
  row_count INTEGER NOT NULL DEFAULT 0,
  sku_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spec_alias_proposal (
  alias_key TEXT PRIMARY KEY,
  canonical_key TEXT NOT NULL,
  confidence TEXT NOT NULL,
  evidence_count INTEGER NOT NULL DEFAULT 0,
  coverage REAL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS spec_family_rule (
  product_id TEXT NOT NULL,
  canonical_key TEXT NOT NULL,
  mode TEXT NOT NULL,
  coverage REAL NOT NULL,
  distinct_values INTEGER NOT NULL,
  missing_skus TEXT NOT NULL,
  safe_fill_candidate INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'suggested',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(product_id, canonical_key)
);

CREATE TABLE IF NOT EXISTS spec_quality_snapshot (
  id INTEGER PRIMARY KEY,
  generated_at TEXT NOT NULL,
  summary_json TEXT NOT NULL,
  contract_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_spec_canonical_status ON spec_canonical_key(status);
CREATE INDEX IF NOT EXISTS idx_spec_alias_status ON spec_alias_proposal(status);
CREATE INDEX IF NOT EXISTS idx_spec_family_rule_status ON spec_family_rule(status);
CREATE INDEX IF NOT EXISTS idx_spec_family_rule_product ON spec_family_rule(product_id);
"""


def _label_from_key(key: str) -> str:
    return key.replace("_", " ").strip().title() or key


def build_registry_plan(conn: sqlite3.Connection) -> dict[str, Any]:
    conn.row_factory = sqlite3.Row
    audit = audit_database(conn)
    dictionary_labels: dict[str, Counter[str]] = defaultdict(Counter)
    dictionary_units: dict[str, Counter[str]] = defaultdict(Counter)
    for row in conn.execute("SELECT key_norm, label_ro, unit_hint FROM spec_key"):
        if row["label_ro"]:
            dictionary_labels[row["key_norm"]][row["label_ro"]] += 1
        if row["unit_hint"]:
            dictionary_units[row["key_norm"]][row["unit_hint"]] += 1

    keys: list[dict[str, Any]] = []
    for key, profile in audit["key_profiles"].items():
        labels = dictionary_labels.get(key)
        units = dictionary_units.get(key)
        raw_names = [name.strip() for name in profile["raw_names"] if name.strip()]
        keys.append(
            {
                "key": key,
                "label_en": min(raw_names, key=len) if raw_names else _label_from_key(key),
                "label_ro": labels.most_common(1)[0][0] if labels else None,
                "canonical_unit": units.most_common(1)[0][0] if units else None,
                "status": "approved" if labels else "candidate",
                "row_count": profile["rows"],
                "sku_count": profile["skus"],
            }
        )

    aliases_by_key: dict[str, dict[str, Any]] = {}
    for proposal in audit["alias_proposals"]:
        aliases_by_key[proposal["from"]] = {
            "alias_key": proposal["from"],
            "canonical_key": proposal["to"],
            "confidence": proposal["confidence"],
            "evidence_count": proposal["rows"],
            "coverage": 1.0,
            "reason": proposal["reason"],
        }
    for proposal in audit["contextual_alias_proposals"]:
        aliases_by_key.setdefault(
            proposal["from"],
            {
                "alias_key": proposal["from"],
                "canonical_key": proposal["to"],
                "confidence": proposal["confidence"],
                "evidence_count": proposal["supporting_rows"],
                "coverage": proposal["coverage"],
                "reason": proposal["reason"],
            },
        )

    key_names = {row["key"] for row in keys}
    for target in sorted({row["canonical_key"] for row in aliases_by_key.values()} - key_names):
        keys.append(
            {
                "key": target,
                "label_en": _label_from_key(target),
                "label_ro": None,
                "canonical_unit": None,
                "status": "candidate",
                "row_count": 0,
                "sku_count": 0,
            }
        )

    family_rules: list[dict[str, Any]] = []
    for family in audit["families"]["families"]:
        for rule in family["rules"]:
            family_rules.append(
                {
                    "product_id": family["product_id"],
                    "canonical_key": rule["key"],
                    "mode": rule["mode"],
                    "coverage": rule["coverage"],
                    "distinct_values": rule["distinct_values"],
                    "missing_skus": rule["missing_skus"],
                    "safe_fill_candidate": rule["safe_fill_candidate"],
                }
            )

    return {
        "keys": keys,
        "aliases": sorted(aliases_by_key.values(), key=lambda row: row["alias_key"]),
        "family_rules": family_rules,
        "summary": audit["summary"],
        "contract": audit["normalization_contract"],
    }


def _backup_database(conn: sqlite3.Connection, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = backup_dir / f"catalog-before-spec-registry-{timestamp}.db"
    destination = sqlite3.connect(backup_path)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return backup_path


def apply_registry(
    db_path: str | Path,
    *,
    backup_dir: str | Path | None = None,
) -> dict[str, Any]:
    database_path = Path(db_path)
    conn = sqlite3.connect(database_path, timeout=10)
    conn.row_factory = sqlite3.Row
    plan = build_registry_plan(conn)
    backup_path = _backup_database(
        conn,
        Path(backup_dir) if backup_dir else database_path.parent / "backups",
    )
    now = datetime.now(UTC).isoformat()
    try:
        conn.executescript(SCHEMA_SQL)
        conn.execute("BEGIN IMMEDIATE")
        key_upsert = conn.execute
        for row in plan["keys"]:
            key_upsert(
                "INSERT INTO spec_canonical_key"
                "(key,label_en,label_ro,canonical_unit,value_type,status,row_count,sku_count,created_at,updated_at) "
                "VALUES (?,?,?,?,'text',?,?,?,?,?) "
                "ON CONFLICT(key) DO UPDATE SET label_en=excluded.label_en,"
                "label_ro=COALESCE(spec_canonical_key.label_ro,excluded.label_ro),"
                "canonical_unit=COALESCE(spec_canonical_key.canonical_unit,excluded.canonical_unit),"
                "row_count=excluded.row_count,sku_count=excluded.sku_count,updated_at=excluded.updated_at",
                (
                    row["key"], row["label_en"], row["label_ro"], row["canonical_unit"],
                    row["status"], row["row_count"], row["sku_count"], now, now,
                ),
            )

        for row in plan["aliases"]:
            conn.execute(
                "INSERT INTO spec_alias_proposal"
                "(alias_key,canonical_key,confidence,evidence_count,coverage,reason,status,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,'suggested',?,?) "
                "ON CONFLICT(alias_key) DO UPDATE SET canonical_key=excluded.canonical_key,"
                "confidence=excluded.confidence,evidence_count=excluded.evidence_count,"
                "coverage=excluded.coverage,reason=excluded.reason,updated_at=excluded.updated_at "
                "WHERE spec_alias_proposal.status='suggested'",
                (
                    row["alias_key"], row["canonical_key"], row["confidence"],
                    row["evidence_count"], row["coverage"], row["reason"], now, now,
                ),
            )

        conn.execute("DELETE FROM spec_family_rule WHERE status='suggested'")
        for row in plan["family_rules"]:
            conn.execute(
                "INSERT INTO spec_family_rule"
                "(product_id,canonical_key,mode,coverage,distinct_values,missing_skus,"
                "safe_fill_candidate,status,created_at,updated_at) "
                "VALUES (?,?,?,?,?,?,?,'suggested',?,?) "
                "ON CONFLICT(product_id,canonical_key) DO UPDATE SET mode=excluded.mode,"
                "coverage=excluded.coverage,distinct_values=excluded.distinct_values,"
                "missing_skus=excluded.missing_skus,safe_fill_candidate=excluded.safe_fill_candidate,"
                "updated_at=excluded.updated_at WHERE spec_family_rule.status='suggested'",
                (
                    row["product_id"], row["canonical_key"], row["mode"], row["coverage"],
                    row["distinct_values"], json.dumps(row["missing_skus"]),
                    1 if row["safe_fill_candidate"] else 0, now, now,
                ),
            )

        conn.execute(
            "INSERT INTO spec_quality_snapshot(generated_at,summary_json,contract_json) VALUES (?,?,?)",
            (now, json.dumps(plan["summary"]), json.dumps(plan["contract"])),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    return {
        "canonical_keys": len(plan["keys"]),
        "approved_seed_keys": sum(row["status"] == "approved" for row in plan["keys"]),
        "alias_proposals": len(plan["aliases"]),
        "family_rule_proposals": len(plan["family_rules"]),
        "backup_path": str(backup_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if args.apply:
        report = apply_registry(args.db_path, backup_dir=args.backup_dir)
    else:
        conn = sqlite3.connect(args.db_path)
        try:
            plan = build_registry_plan(conn)
        finally:
            conn.close()
        report = {
            "canonical_keys": len(plan["keys"]),
            "approved_seed_keys": sum(row["status"] == "approved" for row in plan["keys"]),
            "alias_proposals": len(plan["aliases"]),
            "family_rule_proposals": len(plan["family_rules"]),
        }
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
