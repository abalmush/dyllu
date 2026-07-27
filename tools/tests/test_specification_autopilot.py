import sqlite3

from tools.specification_autopilot import _row_unit, build_plan
from tools.specification_semantics import BATTERY, IMPACT_WRENCH, contextual_key, power_source_for_variant, profile_for_variant


SCHEMA = """
CREATE TABLE source_specification(
  id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
  value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE specification(
  id INTEGER PRIMARY KEY, sku TEXT, key_raw TEXT, key_norm TEXT, label_ro TEXT,
  value_raw TEXT, value_num REAL, unit TEXT, position INTEGER
);
CREATE TABLE variant(
  sku TEXT PRIMARY KEY, product_id TEXT, category_id INTEGER, name_ro TEXT,
  value TEXT, position INTEGER
);
CREATE TABLE product(id TEXT PRIMARY KEY,title_ro TEXT,title_en TEXT,category_id INTEGER,power_source TEXT);
CREATE TABLE category(id INTEGER PRIMARY KEY,name_ro TEXT);
CREATE TABLE catalog_spec_override(sku TEXT PRIMARY KEY,mode TEXT,updated_at TEXT);
CREATE TABLE spec_canonical_key(
  key TEXT PRIMARY KEY,label_en TEXT,label_ro TEXT,canonical_unit TEXT,value_type TEXT,
  status TEXT,row_count INTEGER,sku_count INTEGER,created_at TEXT,updated_at TEXT,
  label_ro_source TEXT,label_ro_confidence TEXT,search_terms_ro TEXT
);
CREATE TABLE spec_alias_proposal(
  alias_key TEXT PRIMARY KEY,canonical_key TEXT,confidence TEXT,evidence_count INTEGER,
  coverage REAL,reason TEXT,status TEXT,created_at TEXT,updated_at TEXT
);
CREATE TABLE spec_family_rule(
  product_id TEXT,canonical_key TEXT,mode TEXT,coverage REAL,distinct_values INTEGER,
  missing_skus TEXT,safe_fill_candidate INTEGER,status TEXT,created_at TEXT,updated_at TEXT
);
"""


def database() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript(SCHEMA)
    conn.execute("INSERT INTO category VALUES (1,'Scule electrice')")
    conn.execute("INSERT INTO product VALUES ('p1','Mașină de găurit','Drill',1,'cordless_battery')")
    conn.executemany(
        "INSERT INTO variant VALUES (?, 'p1', 1, NULL, NULL, ?)",
        [("A", 0), ("B", 1)],
    )
    conn.executemany(
        "INSERT INTO spec_canonical_key VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            ("voltage", "Voltage", "Tensiune", "V", "text", "candidate", 2, 2, "", "", "", "high", "[]"),
            ("tensiune", "Tensiune", "Tensiune", None, "text", "candidate", 1, 1, "", "", "", "review", "[]"),
            ("no_load_speed", "No load speed", "Turație la mersul în gol", "rpm", "text", "candidate", 1, 1, "", "", "", "high", "[]"),
        ],
    )
    return conn


def test_aligns_industry_names_and_preserves_variant_values():
    conn = database()
    conn.executemany(
        "INSERT INTO source_specification VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (1, "A", "Tensiune", "tensiune", "Tensiune", "20V", None, "V", 0),
            (2, "B", "Voltage", "voltage", "Voltage", "40V", None, "V", 0),
        ],
    )
    plan = build_plan(conn)
    rows = {row["sku"]: row for row in plan["rows"]}
    assert rows["A"]["key_norm"] == "voltage"
    assert rows["B"]["key_norm"] == "voltage"
    assert rows["A"]["label_ro"] == "Tensiune"
    assert rows["A"]["value_raw"] == "20V"
    assert rows["B"]["value_raw"] == "40V"


def test_propagates_only_agreed_shared_values():
    conn = database()
    conn.execute(
        "INSERT INTO source_specification VALUES (1,'A','Voltage','voltage','Voltage','20V',NULL,'V',0)"
    )
    conn.execute(
        "INSERT INTO spec_family_rule VALUES ('p1','voltage','shared',0.5,1,'[\"B\"]',1,'suggested','','')"
    )
    plan = build_plan(conn)
    rows = [row for row in plan["rows"] if row["key_norm"] == "voltage"]
    assert {row["sku"] for row in rows} == {"A", "B"}
    assert {row["value_raw"] for row in rows} == {"20V"}
    assert plan["summary"]["shared_values_propagated"] == 1


def test_combines_conflicts_without_dropping_values():
    conn = database()
    conn.executemany(
        "INSERT INTO source_specification VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (1, "A", "No load speed", "no_load_speed", "No load speed", "500rpm", None, "rpm", 0),
            (2, "A", "No load speed", "no_load_speed", "No load speed", "1000rpm", None, "rpm", 1),
        ],
    )
    plan = build_plan(conn)
    row = plan["rows"][0]
    assert row["value_raw"] == "1000rpm / 500rpm"
    assert plan["summary"]["conflicting_values_combined"] == 1


def test_repairs_previous_synthetic_aggregate_from_variant_source_value():
    conn = database()
    conn.execute(
        "INSERT INTO source_specification VALUES (1,'A','Input power','input_power','Putere absorbită','1050W',NULL,'W',0)"
    )
    conn.execute(
        "INSERT INTO specification VALUES (1,'A','Input power','input_power','Putere absorbită',"
        "'800–1600 W (în funcție de variantă) / 1050W',NULL,'W',0)"
    )
    conn.execute("INSERT INTO catalog_spec_override VALUES ('A','replace','')")

    plan = build_plan(conn)
    row = next(row for row in plan["rows"] if row["sku"] == "A")

    assert row["value_raw"] == "1050W"


def test_unit_inference_ignores_product_codes_and_material_grades():
    assert _row_unit("USB type-A", None, None) is None
    assert _row_unit("65MN", "MN", None) is None
    assert _row_unit("13300 rot/min", None, None) == "rpm"


def test_battery_capacity_uses_the_battery_specific_key():
    assert contextual_key("capacity", {"value_raw": "2 Ah", "unit": "Ah"}, BATTERY) == "battery_capacity"


def test_impact_wrench_aliases_use_functional_keys():
    assert contextual_key("breakaway_torque", {"value_raw": "1200 N.m"}, IMPACT_WRENCH) == "nut_busting_torque"
    assert contextual_key("free_speed", {"value_raw": "7000 rpm"}, IMPACT_WRENCH) == "no_load_speed"


def test_profile_matching_uses_complete_words():
    profile = profile_for_variant({
        "title_ro": "Cheie combinată cu cap tubular pivotant",
        "title_en": "Flex-Head Box Wrench",
        "category_name": "Chei fixe",
    })
    assert profile.key == "wrench"


def test_profile_identity_is_functional_and_power_source_is_separate():
    corded = {
        "title_ro": "Mașină de găurit electrică",
        "title_en": "Corded Drill",
        "category_name": "Mașini de găurit și înșurubat",
        "power_source": "corded",
    }
    cordless = corded | {
        "title_ro": "Mașină de găurit cu acumulator",
        "title_en": "Cordless Drill",
        "power_source": "cordless_battery",
    }
    assert profile_for_variant(corded).key == "drill_driver"
    assert profile_for_variant(cordless).key == "drill_driver"
    assert power_source_for_variant(corded) == "corded"
    assert power_source_for_variant(cordless) == "cordless_battery"


def test_plan_persists_the_profile_for_each_variant():
    conn = database()
    plan = build_plan(conn)

    profiles = {row["sku"]: row for row in plan["variant_profiles"]}

    assert set(profiles) == {"A", "B"}
    assert profiles["A"]["profile_key"] == "drill_driver"
    assert profiles["A"]["power_source"] == "cordless_battery"
    assert plan["summary"]["variant_profile_rows"] == 2


def test_accessories_do_not_inherit_the_instrument_profile():
    assert profile_for_variant({
        "title_en": "Reciprocating saw blade for metal",
        "category_name": "Pânze și lame pentru ferăstraie",
    }).key == "accessory"


def test_global_profile_contract_combines_power_sources_without_splitting_function():
    conn = database()
    conn.execute("UPDATE product SET power_source='corded' WHERE id='p1'")
    conn.execute("INSERT INTO category VALUES (2,'Mașini de găurit și înșurubat')")
    conn.execute(
        "INSERT INTO product VALUES ('p2','Mașină de găurit cu acumulator','Cordless Drill',2,'cordless_battery')"
    )
    conn.execute("INSERT INTO variant VALUES ('C','p2',2,NULL,NULL,0)")
    conn.executemany(
        "INSERT INTO source_specification VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (1, "A", "Input power", "input_power", "Putere absorbită", "800W", None, "W", 0),
            (2, "C", "Battery capacity", "battery_capacity", "Capacitate acumulator", "2Ah", None, "Ah", 0),
        ],
    )

    plan = build_plan(conn)
    contracts = [row for row in plan["contracts"] if row["profile_key"] == "drill_driver"]

    assert {row["scope_key"] for row in contracts} == {"drill_driver"}
    assert {row["power_sources"] for row in contracts} == {'["corded", "cordless_battery"]'}
    assert next(row for row in contracts if row["canonical_key"] == "battery_capacity")["semantic_status"] == "conditional"
    assert profile_for_variant({
        "title_en": "Impact socket set",
        "category_name": "Chei tubulare, clicheți și accesorii",
    }).key == "accessory"


def test_splits_mixed_category_by_instrument_meaning_and_rejects_variant_metadata():
    conn = database()
    conn.execute("INSERT INTO category VALUES (61,'Ciocan rotopercutor')")
    conn.executemany(
        "INSERT INTO product(id,title_ro,title_en,category_id,power_source) VALUES (?,?,?,61,?)",
        [
            ("rotary", "Ciocan rotopercutor", "Rotary hammer", None),
            ("demolition", "Ciocan demolator", "Demolition hammer", None),
            ("chisel", "Daltă SDS Plus", "SDS chisel", None),
        ],
    )
    conn.executemany(
        "INSERT INTO variant VALUES (?, ?, 61, NULL, NULL, 0)",
        [("R", "rotary"), ("D", "demolition"), ("C", "chisel")],
    )
    conn.executemany(
        "INSERT INTO source_specification VALUES (?,?,?,?,?,?,?,?,?)",
        [
            (1, "R", "Wood", "wood", "Lemn", "30mm", None, "mm", 0),
            (2, "R", "Impact force", "impact_force", "Impact force", "2.5J", None, "J", 1),
            (3, "D", "Impact energy", "energie_impact", "Impactul energetic", "45 J", None, "J", 0),
            (4, "D", "Concrete", "concrete", "Concrete", "26mm", None, "mm", 1),
            (5, "C", "Variants", "variante", "Variante", "ascuțită și lată", None, None, 0),
            (6, "C", "Length", "length", "Lungime", "250mm", None, "mm", 1),
        ],
    )

    plan = build_plan(conn)
    target_profiles = {"rotary_hammer", "demolition_hammer", "rotary_hammer_chisel"}
    contracts = [
        row
        for row in plan["contracts"]
        if row["scope_type"] == "profile" and row["profile_key"] in target_profiles
    ]

    assert {row["profile_key"] for row in contracts} == {
        "rotary_hammer",
        "demolition_hammer",
        "rotary_hammer_chisel",
    }
    wood = next(row for row in contracts if row["canonical_key"] == "max_drilling_diameter_wood")
    assert wood["label_ro"] == "Diametru maxim de găurire în lemn"
    assert wood["semantic_status"] == "conditional"
    assert "rotation-only mode" in wood["rationale"]
    variants = next(row for row in contracts if row["canonical_key"] == "variante")
    assert variants["semantic_status"] == "rejected"
    assert all(row["key_norm"] != "variante" for row in plan["rows"])
    demolition_concrete = next(
        row
        for row in contracts
        if row["profile_key"] == "demolition_hammer" and row["canonical_key"] == "concrete"
    )
    assert demolition_concrete["semantic_status"] == "rejected"
