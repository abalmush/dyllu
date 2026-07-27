import hashlib
import sqlite3
from pathlib import Path

from tools.specification_normalization import apply_preview, build_preview


BASE_SCHEMA = """
CREATE TABLE source_specification (
  id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
  value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE specification (
  id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
  value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE variant (sku TEXT PRIMARY KEY, product_id TEXT);
CREATE TABLE catalog_spec_override (sku TEXT PRIMARY KEY, mode TEXT, updated_at TEXT);
CREATE TABLE catalog_availability (sku TEXT PRIMARY KEY, available INTEGER);
CREATE TABLE spec_canonical_key (
  key TEXT PRIMARY KEY, label_ro TEXT, label_ro_confidence TEXT, canonical_unit TEXT
);
CREATE TABLE spec_alias_proposal (
  alias_key TEXT PRIMARY KEY, canonical_key TEXT, confidence TEXT,
  evidence_count INTEGER, status TEXT
);
CREATE TABLE spec_family_rule (
  product_id TEXT, canonical_key TEXT, mode TEXT, coverage REAL,
  distinct_values INTEGER, missing_skus TEXT, safe_fill_candidate INTEGER,
  status TEXT
);
"""


def seed(conn: sqlite3.Connection) -> None:
    conn.executescript(BASE_SCHEMA)
    conn.executemany(
        "INSERT INTO variant VALUES (?,?)",
        [("A", "family-1"), ("B", "family-1")],
    )
    conn.executemany(
        "INSERT INTO source_specification VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (1, "A", "Colour", "colour", "Color", "Red", None, None, 0),
            (2, "A", "Length", "length", "Length", "10", 10, "mm", 1),
            (3, "A", "Length", "length", "Length", "10", 10, "mm", 2),
            (4, "A", "Include case", "include_case", "Include case", None, None, None, 3),
            (5, "A", "Voltage", "voltage", "Voltage", "18", 18, "volt", 4),
            (6, "B", "Material", "material", "Material", "Steel", None, None, 0),
        ],
    )
    conn.executemany(
        "INSERT INTO spec_canonical_key VALUES (?,?,?,?)",
        [
            ("color", "Culoare", "high", None),
            ("length", "Lungime", "high", "mm"),
            ("material", "Material", "approved", None),
            ("voltage", "Tensiune", "high", "V"),
        ],
    )
    conn.execute(
        "INSERT INTO spec_alias_proposal VALUES (?,?,?,?,?)",
        ("colour", "color", "deterministic", 1, "suggested"),
    )
    conn.execute(
        "INSERT INTO spec_family_rule VALUES (?,?,?,?,?,?,?,?)",
        ("family-1", "voltage", "shared", 0.5, 1, '["B"]', 1, "suggested"),
    )
    conn.execute("INSERT INTO catalog_availability VALUES ('A',1)")
    conn.commit()


def test_build_preview_covers_aliases_duplicates_units_and_family_fill() -> None:
    conn = sqlite3.connect(":memory:")
    seed(conn)

    preview = build_preview(conn)
    actions = {(item["action"], item["state"], item["sku"]) for item in preview["items"]}

    assert preview["summary"]["skus_total"] == 2
    assert preview["summary"]["skus_with_effective_specs"] == 2
    assert preview["summary"]["technical_effective_rows"] == 5
    assert preview["summary"]["relationship_rows"] == 1
    assert ("rename_key", "needs_approval", "A") in actions
    assert ("align_label", "blocked_by_alias", "A") in actions
    assert ("deduplicate_exact", "ready", "A") in actions
    assert ("normalize_unit", "ready", "A") in actions
    assert ("move_to_relationship", "needs_approval", "A") in actions
    assert ("propagate_shared", "needs_approval", "B") in actions
    propagation = next(
        item for item in preview["items"] if item["action"] == "propagate_shared"
    )
    assert propagation["proposed_value"] == "18"
    assert propagation["proposed_unit"] == "volt"


def _table_digest(conn: sqlite3.Connection, table: str) -> str:
    rows = conn.execute(f"SELECT * FROM {table} ORDER BY 1").fetchall()
    return hashlib.sha256(repr(rows).encode()).hexdigest()


def test_apply_preview_writes_only_preview_tables(tmp_path: Path) -> None:
    database = tmp_path / "catalog.db"
    conn = sqlite3.connect(database)
    seed(conn)
    source_before = _table_digest(conn, "source_specification")
    curated_before = _table_digest(conn, "specification")
    conn.close()

    report = apply_preview(database, backup_dir=tmp_path / "backups")

    conn = sqlite3.connect(database)
    assert _table_digest(conn, "source_specification") == source_before
    assert _table_digest(conn, "specification") == curated_before
    assert conn.execute("SELECT count(*) FROM spec_normalization_run").fetchone()[0] == 1
    assert conn.execute("SELECT count(*) FROM spec_normalization_item").fetchone()[0] > 0
    conn.close()
    assert report["writes_to_product_specifications"] == 0
    assert Path(report["backup_path"]).exists()
