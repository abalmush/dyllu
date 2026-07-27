from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path

from tools.audit_catalog_components import audit_components
from tools.build_medusa_catalog_payload import build_payload
from tools.catalog_sync import (
    apply_sync,
    build_sync_plan,
    load_availability_skus,
    load_source_rows,
    parse_source_specifications,
)


BASE_SCHEMA = """
CREATE TABLE category(id INTEGER PRIMARY KEY, name_ro TEXT, medusa_handle TEXT);
CREATE TABLE product(
 id TEXT PRIMARY KEY, handle TEXT, title_ro TEXT, title_en TEXT, category_id INTEGER,
 product_type TEXT, power_source TEXT, group_name_ro TEXT, group_name_en TEXT,
 axis TEXT, description_ro TEXT, status TEXT, spec_reference_sku TEXT, extras TEXT
);
CREATE TABLE variant(
 sku TEXT PRIMARY KEY, product_id TEXT, name_ro TEXT, category_id INTEGER, value TEXT,
 variant_key TEXT, price_mdl REAL, currency TEXT, position INTEGER, reviewed_type TEXT,
 battery_included TEXT, battery_count TEXT, battery_capacity TEXT, charger_included TEXT,
 case_included TEXT, variant_size TEXT, variant_val TEXT, qa_ok TEXT, qa_reason TEXT,
 group_confirmed TEXT, raw_text TEXT
);
CREATE TABLE specification(
 id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
 value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE spec_key(key_raw TEXT PRIMARY KEY, key_norm TEXT, label_ro TEXT, unit_hint TEXT);
CREATE TABLE bundle_component(
 id INTEGER PRIMARY KEY, parent_sku TEXT, position INTEGER, qty INTEGER, name TEXT,
 component_sku TEXT, type TEXT, is_sub_bundle INTEGER, packaging TEXT
);
"""


def write_csv(path: Path) -> None:
    header = [
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
    ]
    rows = [
        [
            "OLD1", "", "", "Cordless drill",
            "Voltage: 20V\nInclude:\n1 Pcs bit", "PCS", "100 MDL",
            "", "1", "1", "", "", "", "Color box", "", "", "2", "0", "0", "0", "0",
        ],
        [
            "NEW1", "", "Best seller", "Cordless drill",
            "Voltage: 40V\nInclude:\n1 Pcs bit", "PCS", "200 MDL",
            "", "1", "1", "", "", "", "Color box", "", "", "3", "0", "0", "0", "0",
        ],
        [
            "SET1", "", "", "2 Pcs Tool set",
            "1 Pcs drill(OLD1)\n1 Pcs loose bit", "SET", "300 MDL",
            "", "1", "1", "", "", "", "Case", "", "", "4", "0", "0", "0", "0",
        ],
    ]
    with path.open("w", newline="", encoding="utf-8") as target:
        writer = csv.writer(target)
        writer.writerow(["Table 1"])
        writer.writerow(header)
        writer.writerows(rows)


def create_db(path: Path) -> None:
    conn = sqlite3.connect(path)
    conn.executescript(BASE_SCHEMA)
    conn.execute(
        "INSERT INTO product(id,title_ro,status,extras) VALUES ('family1','Mașină','approved','{}')"
    )
    conn.execute(
        "INSERT INTO variant(sku,product_id,value,price_mdl,currency,position) "
        "VALUES ('OLD1','family1','20V',100,'mdl',0)"
    )
    conn.execute(
        "INSERT INTO specification(sku,key_raw,key_norm,label_ro,value_raw,position) "
        "VALUES ('OLD1','Voltage','voltage','Tensiune','curated 20V',0)"
    )
    conn.execute(
        "INSERT INTO spec_key(key_raw,key_norm,label_ro) VALUES ('voltage','voltage','Tensiune')"
    )
    conn.commit()
    conn.close()


def write_manifest(path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as target:
        writer = csv.DictWriter(target, fieldnames=["image", "status"])
        writer.writeheader()
        writer.writerows(
            [
                {"image": "OLD1", "status": "approved"},
                {"image": "NEW1", "status": ""},
                {"image": "SET1", "status": "corrected"},
            ]
        )


def test_source_spec_parser_uses_dictionary_and_skips_contents() -> None:
    specs = parse_source_specifications(
        [
            {
                "sku": "A1",
                "description": "Voltage: 20V\nInclude:\n1 Pcs bit: PH2\nPacked by box",
            }
        ],
        {"voltage": ("voltage", "Tensiune")},
    )["A1"]
    assert [(spec["key_norm"], spec["label_ro"]) for spec in specs] == [
        ("voltage", "Tensiune")
    ]


def test_full_catalog_is_the_normalized_source_for_product_facts() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    row = next(item for item in load_source_rows(source) if item["sku"] == "DTCDP6281")

    assert row["price_mdl"] == 1391
    assert row["name_en"] == "Compact brushless cordless impact drill"
    assert row["stock"]["received"] == 450
    assert [(item["qty"], item["component_sku"]) for item in row["components"]] == [
        (1, None),
        (3, None),
        (2, "DTLBP520"),
        (1, "DTFCP502"),
    ]
    assert all("indicator" not in item["name"].lower() for item in row["components"])


def test_medusa_payload_derives_product_details_only_from_full_catalog() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    payload = build_payload(source)
    entry = payload["items"]["DTCDP6281"]

    assert payload["source"]["name"] == "Dyllu Full range price MDL.csv"
    assert entry["price_mdl"] == 1391
    assert entry["power"] == {
        "power_source": "cordless_battery",
        "platform": "dyllu-20v",
        "battery_voltage": "20V",
        "battery_included": "yes",
        "battery_count": 2,
        "battery_capacity": "2.0 Ah",
        "charger_included": "yes",
        "requires_battery": False,
    }
    assert [(item["qty"], item["component_sku"]) for item in entry["components"]] == [
        (1, None),
        (3, None),
        (2, "DTLBP520"),
        (1, "DTFCP502"),
    ]
    assert [item["display_name_ro"] for item in entry["components"]] == [
        "Bit Cr-V de 65 mm",
        "Burghie pentru zidărie",
        "Acumulator 2.0 Ah",
        "Încărcător",
    ]
    assert ("Cuplu maxim", "62Nm") in [
        (spec["label"], spec["value"]) for spec in entry["specs"]
    ]
    assert ("Trepte de cuplu", "22+1+1") in [
        (spec["label"], spec["value"]) for spec in entry["specs"]
    ]
    assert entry["highlights_ro"] == [
        "Motor fără perii",
        "Mandrină metalică",
        "Transmisie mecanică cu 2 trepte",
        "Funcție de blocare a axului",
        "Lumină de lucru LED integrată",
        "Lumină de lucru integrată",
        "Indicator LED pentru nivelul acumulatorului",
    ]


def test_cordless_tool_without_power_accessories_requires_compatible_set() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    entry = build_payload(source)["items"]["DTLM1516"]

    assert entry["power"] == {
        "power_source": "cordless_battery",
        "platform": "dyllu-20v",
        "battery_voltage": "20V",
        "battery_included": "no",
        "battery_count": None,
        "battery_capacity": None,
        "charger_included": "no",
        "requires_battery": True,
    }
    assert "Charger sold separately" not in entry["highlights_ro"]


def test_charger_uses_output_voltage_for_compatible_platform() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    entry = build_payload(source)["items"]["DTFCP540"]

    assert entry["power"] == {
        "power_source": "charger",
        "platform": "dyllu-20v",
        "battery_voltage": "20V",
        "battery_included": "no",
        "battery_count": None,
        "battery_capacity": None,
        "charger_included": "no",
        "requires_battery": False,
    }


def test_bare_cordless_saws_share_the_same_power_classification() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    items = build_payload(source)["items"]

    for sku in ("DTLWP5630", "DTLS1565"):
        assert items[sku]["power"] == {
            "power_source": "cordless_battery",
            "platform": "dyllu-20v",
            "battery_voltage": "20V",
            "battery_included": "no",
            "battery_count": None,
            "battery_capacity": None,
            "charger_included": "no",
            "requires_battery": True,
        }


def test_dtzy1501_maps_its_exact_battery_and_charger_from_the_catalog() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    entry = build_payload(source)["items"]["DTZY1501"]

    assert entry["power"] == {
        "power_source": "cordless_battery",
        "platform": "dyllu-20v",
        "battery_voltage": "20V",
        "battery_included": "yes",
        "battery_count": 1,
        "battery_capacity": "4.0 Ah",
        "charger_included": "yes",
        "requires_battery": False,
    }
    assert [
        (item["qty"], item["component_sku"]) for item in entry["components"]
    ] == [
        (3, None),
        (1, "DTLBP540"),
        (1, "DTFCP502"),
    ]


def test_component_audit_finds_unrenderable_catalog_references() -> None:
    source = (
        Path(__file__).parents[2]
        / "apps/backend/data/ingco/catalog-latest/Dyllu Full range price MDL.csv"
    )
    image_manifest_path = Path(__file__).parents[1] / "transparent-manifest.json"
    report = audit_components(
        build_payload(source),
        json.loads(image_manifest_path.read_text(encoding="utf-8")),
    )
    missing_rows = {item["sku"] for item in report["missing_catalog_rows"]}
    missing_images = {item["sku"] for item in report["missing_component_images"]}

    assert "DTJC1410" in missing_rows
    assert "DTFCP502" in missing_images
    assert "DTLBP520" not in missing_images


def test_availability_manifest_uses_every_sku_regardless_of_review_status(tmp_path: Path) -> None:
    manifest = tmp_path / "manifest.csv"
    write_manifest(manifest)
    assert load_availability_skus(manifest) == {"OLD1", "NEW1", "SET1"}


def test_plan_preserves_existing_family_and_adds_exact_name_sibling(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog.db"
    csv_path = tmp_path / "catalog.csv"
    create_db(db_path)
    write_csv(csv_path)
    conn = sqlite3.connect(db_path)
    report, state = build_sync_plan(conn, csv_path)
    conn.close()

    assert report["new_skus"] == 2
    assert state["families"]["NEW1"]["family_id"] == "family1"
    assert report["new_products"] == 1


def test_apply_is_idempotent_and_preserves_curated_rows(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog.db"
    csv_path = tmp_path / "catalog.csv"
    create_db(db_path)
    write_csv(csv_path)

    first = apply_sync(db_path, csv_path, backup_dir=tmp_path / "backups")
    second = apply_sync(db_path, csv_path, backup_dir=tmp_path / "backups-2")
    conn = sqlite3.connect(db_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM variant").fetchone()[0] == 3
        assert conn.execute("SELECT COUNT(*) FROM source_specification").fetchone()[0] == 2
        assert conn.execute("SELECT COUNT(*) FROM bundle_component").fetchone()[0] == 4
        assert conn.execute("SELECT title_ro FROM product WHERE id='family1'").fetchone()[0] == "Mașină"
        assert conn.execute("SELECT price_mdl FROM variant WHERE sku='OLD1'").fetchone()[0] == 100
        assert (
            conn.execute("SELECT value_raw FROM specification WHERE sku='OLD1'").fetchone()[0]
            == "curated 20V"
        )
    finally:
        conn.close()
    assert first["final_variants"] == second["final_variants"] == 3


def test_apply_does_not_restore_an_explicitly_excluded_variant(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog.db"
    csv_path = tmp_path / "catalog.csv"
    create_db(db_path)
    write_csv(csv_path)
    apply_sync(db_path, csv_path, backup_dir=tmp_path / "backups")

    conn = sqlite3.connect(db_path)
    conn.execute(
        "INSERT INTO catalog_variant_exclusion(sku,product_id,excluded_at) "
        "VALUES ('NEW1','family1',datetime('now'))"
    )
    conn.execute("DELETE FROM variant WHERE sku='NEW1'")
    conn.commit()
    conn.close()

    report = apply_sync(db_path, csv_path, backup_dir=tmp_path / "backups-2")
    conn = sqlite3.connect(db_path)
    try:
        assert conn.execute("SELECT COUNT(*) FROM variant WHERE sku='NEW1'").fetchone()[0] == 0
        assert (
            conn.execute(
                "SELECT sync_status FROM catalog_source_item WHERE sku='NEW1'"
            ).fetchone()[0]
            == "excluded"
        )
    finally:
        conn.close()
    assert report["excluded_skus"] == 1
    assert report["final_variants"] == 2


def test_apply_replaces_sellable_assortment_from_manifest(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog.db"
    csv_path = tmp_path / "catalog.csv"
    manifest_path = tmp_path / "manifest.csv"
    create_db(db_path)
    write_csv(csv_path)
    write_manifest(manifest_path)

    report = apply_sync(
        db_path,
        csv_path,
        backup_dir=tmp_path / "backups",
        availability_manifest=manifest_path,
    )
    conn = sqlite3.connect(db_path)
    try:
        assert conn.execute(
            "SELECT COUNT(*) FROM catalog_availability WHERE available=1"
        ).fetchone()[0] == 3
    finally:
        conn.close()
    assert report["available_for_purchase"] == 3
