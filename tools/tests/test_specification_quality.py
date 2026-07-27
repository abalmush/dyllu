from __future__ import annotations

import sqlite3

from tools.specification_quality import audit_database, merge_effective_specs


def test_merge_effective_specs_overlays_matching_key_and_keeps_source_only() -> None:
    source = [
        {"id": 1, "key_norm": "voltage", "key_raw": "Voltage", "value_raw": "20V", "position": 0},
        {"id": 2, "key_norm": "speed", "key_raw": "Speed", "value_raw": "1000rpm", "position": 1},
    ]
    curated = [
        {"id": 3, "key_norm": "voltage", "key_raw": "Voltage", "value_raw": "18V", "position": 0},
    ]
    merged = merge_effective_specs(source, curated, replace_all=False)
    assert [(row["key_norm"], row["value_raw"]) for row in merged] == [
        ("voltage", "18V"),
        ("speed", "1000rpm"),
    ]


def test_audit_separates_safe_and_conflicting_duplicates_and_family_modes() -> None:
    conn = sqlite3.connect(":memory:")
    conn.executescript(
        """
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
        INSERT INTO source_specification(sku,key_raw,key_norm,value_raw,position) VALUES
          ('A','Rate voltage','rate_voltage','20V',0),
          ('A','Rate voltage','rate_voltage','20V',1),
          ('A','Speed','speed','1000rpm',2),
          ('A','Speed','speed','2000rpm',3),
          ('B','Rate voltage','rate_voltage','40V',0),
          ('B','Material','material','Steel',1);
        INSERT INTO spec_key VALUES ('material','material','Material',NULL);
        INSERT INTO specification(sku,key_raw,key_norm,label_ro,value_raw,position) VALUES
          ('A','Tensiune nominală','tensiune_nominala','Tensiune nominală','20V',0),
          ('B','Tensiune nominală','tensiune_nominala','Tensiune nominală','40V',0);
        """
    )
    report = audit_database(conn)
    assert report["summary"]["exact_duplicate_groups"] == 1
    assert report["summary"]["conflicting_duplicate_groups"] == 1
    assert report["alias_proposals"][0]["to"] == "rated_voltage"
    assert report["contextual_alias_proposals"][0]["to"] == "rate_voltage"
    rules = {rule["key"]: rule for rule in report["families"]["families"][0]["rules"]}
    assert rules["rate_voltage"]["mode"] == "variant"
    assert rules["material"]["mode"] == "optional"
