import sqlite3

from catalog_product_naming import (
    Parameter,
    accessory_title,
    audit,
    rule_for,
    source_base,
    source_parameter_value,
    strip_measurements,
    strip_sku,
)


def row(**values: object) -> sqlite3.Row:
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    columns = ", ".join(f"? AS {name}" for name in values)
    return connection.execute(columns.join(("SELECT ", "")), tuple(values.values())).fetchone()


def test_uses_trusted_source_output_for_generator() -> None:
    product = row(
        source_description="Max.output(kW):5.5\nRated output(kW):5.0",
        power_source="petrol",
    )

    assert source_parameter_value(
        product,
        Parameter(("max_output", "rated_output", "rated_power"), ("W", "kW")),
    ) == "5,5 kW"


def test_generated_model_suffix_and_measurements_are_removed_cleanly() -> None:
    assert (
        strip_sku("Compresor de aer, 2,2 kW, 100 L, model DTAP4R11", "DTAP4R11")
        == "Compresor de aer, 2,2 kW, 100 L"
    )
    assert strip_measurements("Clichet pneumatic, 61 Nm, 12,7 mm(1/2″)") == "Clichet pneumatic"


def test_accessory_sizes_are_not_stripped_as_tool_power() -> None:
    assert accessory_title("Șină de ghidaj pentru drujbă, 18″")
    assert accessory_title("Lanț pentru drujbă, 18″")


def test_hose_connector_source_bypasses_pump_profile() -> None:
    product = row(name_en="3 Pcs hose quick connectors set", profile_key="water_pump", category_name="Pompe")

    assert source_base(product) == "Set conectori rapizi pentru furtun"
    assert rule_for(product) == ()


def test_audit_fails_closed_for_duplicate_and_invalid_voltage_titles() -> None:
    changes = [
        {"sku": "A", "newTitle": "Acumulator, 20 V, 20 V"},
        {"sku": "B", "newTitle": "Acumulator, 20 V, 20 V"},
    ]

    issue_types = {(issue["sku"], issue["type"]) for issue in audit(changes)}
    assert issue_types == {
        ("A", "duplicate_title"),
        ("A", "invalid_or_repeated_voltage"),
        ("B", "duplicate_title"),
        ("B", "invalid_or_repeated_voltage"),
    }
