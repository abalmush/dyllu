import sqlite3

from tools.specification_translations import (
    build_translation_plan,
    search_terms_for,
)


def _rows(values: list[tuple[str, str, str | None, str | None, str | None]]):
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    conn.execute(
        "CREATE TABLE keys(key TEXT,label_en TEXT,label_ro TEXT,"
        "label_ro_source TEXT,label_ro_confidence TEXT)"
    )
    conn.executemany("INSERT INTO keys VALUES (?,?,?,?,?)", values)
    return conn.execute("SELECT * FROM keys ORDER BY key").fetchall()


def test_domain_terms_use_customer_facing_romanian() -> None:
    rows = _rows(
        [
            ("voltage", "Voltage", None, None, None),
            ("rated_power", "Rated power", None, None, None),
            ("max_torque", "Max torque", None, None, None),
            ("no_load_speed", "No load speed", None, None, None),
        ]
    )

    plan = build_translation_plan(rows, lambda labels: labels)

    assert {item["key"]: item["label"] for item in plan} == {
        "max_torque": "Cuplu maxim",
        "no_load_speed": "Turație la mersul în gol",
        "rated_power": "Putere nominală",
        "voltage": "Tensiune",
    }
    assert all(item["source"] == "domain_glossary" for item in plan)


def test_existing_trusted_translation_is_never_overwritten() -> None:
    rows = _rows(
        [("voltage", "Voltage", "Tensiune verificată", "manual", "approved")]
    )

    plan = build_translation_plan(rows, lambda labels: ["Greșit"] * len(labels))

    assert plan[0]["label"] == "Tensiune verificată"
    assert plan[0]["source"] == "manual"
    assert plan[0]["confidence"] == "approved"


def test_domain_glossary_corrects_legacy_dictionary_wording() -> None:
    rows = _rows(
        [("no_load_speed", "No load speed", "Viteză în gol", "trusted_dictionary", "approved")]
    )

    plan = build_translation_plan(rows, lambda labels: labels)

    assert plan[0]["label"] == "Turație la mersul în gol"
    assert plan[0]["source"] == "domain_glossary"
    assert plan[0]["confidence"] == "high"


def test_unmapped_translation_is_kept_in_review_queue() -> None:
    rows = _rows([("special_feature", "Special feature", None, None, None)])

    plan = build_translation_plan(rows, lambda labels: ["Caracteristică specială"])

    assert plan[0]["label"] == "Caracteristică specială"
    assert plan[0]["source"] == "machine_translation"
    assert plan[0]["confidence"] == "review"


def test_search_terms_include_diacritic_free_and_customer_synonyms() -> None:
    terms = search_terms_for("no_load_speed", "Turație la mersul în gol")

    assert "Turatie la mersul in gol" in terms
    assert "RPM" in terms
    assert len(terms) == len({term.casefold() for term in terms})
