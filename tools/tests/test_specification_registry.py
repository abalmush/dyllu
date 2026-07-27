from __future__ import annotations

import sqlite3
from pathlib import Path

from tools.specification_registry import apply_registry, build_registry_plan


BASE_SCHEMA = """
CREATE TABLE source_specification(
 id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
 value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE specification(
 id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
 value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE catalog_spec_override(sku TEXT PRIMARY KEY, mode TEXT, updated_at TEXT);
CREATE TABLE spec_key(key_raw TEXT PRIMARY KEY, key_norm TEXT, label_ro TEXT, unit_hint TEXT);
CREATE TABLE product(id TEXT PRIMARY KEY, title_ro TEXT, title_en TEXT, axis TEXT);
CREATE TABLE variant(sku TEXT PRIMARY KEY, product_id TEXT);
INSERT INTO product VALUES ('p1','Mașină',NULL,'Voltage');
INSERT INTO variant VALUES ('A','p1'),('B','p1');
INSERT INTO source_specification(sku,key_raw,key_norm,label_ro,value_raw,position) VALUES
 ('A','Rate voltage','rate_voltage','Rate Voltage','20V',0),
 ('A','Material','material','Material','Steel',1),
 ('B','Rate voltage','rate_voltage','Rate Voltage','40V',0);
INSERT INTO specification(sku,key_raw,key_norm,label_ro,value_raw,position) VALUES
 ('A','Tensiune nominală','tensiune_nominala','Tensiune nominală','20V',0),
 ('B','Tensiune nominală','tensiune_nominala','Tensiune nominală','40V',0);
INSERT INTO spec_key VALUES ('material','material','Material','');
"""


def create_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(BASE_SCHEMA)
    conn.commit()
    conn.close()


def test_plan_builds_keys_aliases_and_family_rules(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog.db"
    create_db(db_path)
    conn = sqlite3.connect(db_path)
    plan = build_registry_plan(conn)
    conn.close()
    assert {row["key"] for row in plan["keys"]} >= {"material", "rate_voltage"}
    assert any(row["alias_key"] == "rate_voltage" for row in plan["aliases"])
    assert any(row["alias_key"] == "tensiune_nominala" for row in plan["aliases"])
    assert any(row["mode"] == "variant" for row in plan["family_rules"])


def test_apply_is_idempotent_and_preserves_review_status(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog.db"
    create_db(db_path)
    first = apply_registry(db_path, backup_dir=tmp_path / "backups")
    conn = sqlite3.connect(db_path)
    conn.execute(
        "UPDATE spec_alias_proposal SET status='approved' WHERE alias_key='rate_voltage'"
    )
    conn.commit()
    conn.close()
    second = apply_registry(db_path, backup_dir=tmp_path / "backups-2")
    conn = sqlite3.connect(db_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM spec_canonical_key").fetchone()[0] == 4
        assert conn.execute(
            "SELECT status FROM spec_alias_proposal WHERE alias_key='rate_voltage'"
        ).fetchone()[0] == "approved"
        assert conn.execute("SELECT COUNT(*) FROM spec_quality_snapshot").fetchone()[0] == 2
    finally:
        conn.close()
    assert first["canonical_keys"] == second["canonical_keys"] == 4
