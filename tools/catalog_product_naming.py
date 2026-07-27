#!/usr/bin/env python3

import argparse
import json
import re
import shutil
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass(frozen=True)
class Parameter:
    keys: tuple[str, ...]
    units: tuple[str, ...] = ()


PROFILE_RULES: dict[str, tuple[Parameter, ...]] = {
    "battery": (
        Parameter(("battery_voltage", "voltage"), ("V",)),
        Parameter(("battery_capacity",), ("Ah",)),
        Parameter(("charging_port",)),
    ),
    "charger": (
        Parameter(("output_voltage", "tensiune_de_iesire", "charge_volts"), ("V",)),
        Parameter(("output_current",), ("A",)),
        Parameter(("charging_port",)),
    ),
    "angle_grinder": (
        Parameter(("supply",)),
        Parameter(("disc_diameter", "diameter"), ("mm",)),
    ),
    "drill_driver": (
        Parameter(("supply",)),
        Parameter(("max_torque",), ("Nm",)),
        Parameter(("chuck_capacity",), ("mm",)),
        Parameter(("battery_capacity",), ("Ah",)),
    ),
    "impact_wrench": (
        Parameter(("supply",)),
        Parameter(("max_torque",), ("Nm",)),
        Parameter(("square_drive", "hex_shank", "drive")),
    ),
    "powered_ratchet": (
        Parameter(("supply",)),
        Parameter(("max_torque",), ("Nm",)),
        Parameter(("square_drive",)),
    ),
    "rotary_hammer": (
        Parameter(("supply",)),
        Parameter(("max_drilling_capacity", "max_drilling_diameter_concrete"), ("mm",)),
        Parameter(("impact_energy", "energie_impact"), ("J",)),
        Parameter(("battery_capacity",), ("Ah",)),
        Parameter(("tool_holder", "prindere")),
    ),
    "demolition_hammer": (
        Parameter(("supply",)),
        Parameter(("impact_energy",), ("J",)),
        Parameter(("tool_holder",)),
    ),
    "circular_saw": (
        Parameter(("supply",)),
        Parameter(("blade_diameter", "disc_diameter"), ("mm",)),
    ),
    "miter_saw": (
        Parameter(("supply",)),
        Parameter(("blade_size", "disc_diameter"), ("mm",)),
    ),
    "cut_off_saw": (
        Parameter(("supply",)),
        Parameter(("disc_diameter", "diametru_disc"), ("mm",)),
    ),
    "jigsaw": (
        Parameter(("supply",)),
        Parameter(("wood", "cutting_capacity"), ("mm",)),
    ),
    "chainsaw": (
        Parameter(("supply",)),
        Parameter(("bar_length", "max_cutting_length"), ("mm", "cm")),
    ),
    "sander": (
        Parameter(("supply",)),
        Parameter(("bottom_size", "diametru_disc_de_polizare", "talpa"), ("mm",)),
    ),
    "polisher": (
        Parameter(("supply",)),
        Parameter(("disc_diameter", "diametru_disc_de_polizare"), ("mm",)),
    ),
    "heat_gun": (
        Parameter(("supply",)),
        Parameter(("temperature",), ("°C",)),
    ),
    "air_compressor": (
        Parameter(("supply",)),
        Parameter(("tank", "tank_capacity"), ("L",)),
        Parameter(("max_pressure", "operating_pressure"), ("bar",)),
    ),
    "pressure_washer": (
        Parameter(("supply",)),
        Parameter(("max_pressure",), ("bar",)),
        Parameter(("flow_rate", "debit_apa"), ("L/min", "L/h")),
    ),
    "generator": (
        Parameter(("max_output", "rated_output", "rated_power"), ("W", "kW")),
        Parameter(("voltage",), ("V",)),
    ),
    "welder": (
        Parameter(("output_current", "current_range"), ("A",)),
        Parameter(("input_capacity", "rated_input_capacity"), ("kVA",)),
        Parameter(("input_voltage",), ("V",)),
    ),
    "vacuum": (
        Parameter(("supply",)),
        Parameter(("dust_capacity", "capacity"), ("L",)),
        Parameter(("vacuum_pressure", "presiune_de_aspirare"), ("kPa",)),
    ),
    "water_pump": (
        Parameter(("supply",)),
        Parameter(("max_flow",), ("L/min", "m³/h")),
        Parameter(("max_head",), ("m",)),
    ),
    "sprayer": (
        Parameter(("capacity", "tank_capacity"), ("L",)),
        Parameter(("pressure",), ("bar",)),
    ),
    "lighting": (
        Parameter(("power",), ("W",)),
        Parameter(("luminous_flux",), ("lm",)),
    ),
    "nailer": (
        Parameter(("voltage",), ("V",)),
        Parameter(("nail_type",)),
    ),
    "manual_stapler_riveter": (
        Parameter(("size", "applicable_rivet_size"), ("mm",)),
    ),
    "clamp_vise": (),
    "hand_saw": (),
    "pliers": (),
    "wrench": (),
    "socket_ratchet": (),
    "screwdriver": (),
    "plumbing_hand_tool": (),
    "file_chisel_plane": (),
    "threading_tool": (),
    "protective_equipment": (
        Parameter(("size", "marimi")),
        Parameter(("safety_class",)),
    ),
    "storage": (
        Parameter(("size", "length"), ("mm",)),
        Parameter(("max_load",), ("kg",)),
    ),
    "accessory": (
        Parameter(("diameter", "disc_diameter", "size", "length"), ("mm",)),
        Parameter(("arbor",), ("mm",)),
    ),
}

GENERIC_CATEGORY_RULES: tuple[tuple[str, tuple[Parameter, ...]], ...] = (
    ("ciocane, topoare", (Parameter(("weight",), ("g", "kg")), Parameter(("dimensiune", "diametru_cap", "length"), ("mm",)))),
    ("gresie și faianță", (Parameter(("size", "length", "width"), ("mm",)),)),
    ("zidărie și tencuieli", (Parameter(("size", "length", "width"), ("mm",)),)),
    ("cuttere, cuțite", (Parameter(("blade_width", "size", "length"), ("mm",)),)),
    ("nivele și instrumente", (Parameter(("length", "working_range"), ("mm", "m")),)),
    ("măsurare și trasare", (Parameter(("length", "working_range"), ("mm", "m")),)),
    ("cabluri și prelungitoare", (Parameter(("length",), ("m",)), Parameter(("rated_current",), ("A",)))),
    ("furtunuri, aspersoare", (Parameter(("length",), ("m",)), Parameter(("diameter", "size"), ("mm",)))),
)

REBUILD_PROFILES = {
    "battery", "charger", "angle_grinder", "drill_driver", "impact_wrench",
    "powered_ratchet", "rotary_hammer", "demolition_hammer", "circular_saw",
    "miter_saw", "cut_off_saw", "jigsaw", "chainsaw", "sander", "polisher",
    "heat_gun", "air_compressor", "pressure_washer", "generator", "welder",
    "vacuum", "water_pump", "sprayer", "lighting", "nailer",
}

VARIANT_SPECIFIC_KEYS = {
    "battery_capacity", "max_torque", "chuck_capacity", "impact_energy",
    "energie_impact", "max_drilling_capacity", "max_drilling_diameter_concrete",
    "disc_diameter", "blade_diameter", "blade_size", "bar_length",
    "max_cutting_length", "bottom_size", "diametru_disc_de_polizare", "talpa",
    "tank", "tank_capacity", "max_pressure", "operating_pressure", "output_current",
    "max_output", "rated_output", "rated_power",
}

NO_SECONDARY_SPEC_PROFILES = {
    "screwdriver", "pliers", "wrench", "socket_ratchet", "hand_saw",
    "clamp_vise", "plumbing_hand_tool", "file_chisel_plane", "threading_tool",
}

SOURCE_BASES = (
    ("hose quick connectors set", "Set conectori rapizi pentru furtun"),
    ("spot welding machine", "Aparat de sudură în puncte"),
    ("hand pump", "Pompă manuală pentru anvelope"),
    ("hand riveter", "Clește de nituit manual"),
    ("hand stapler", "Capsator manual"),
    ("machinist hammer", "Ciocan lăcătuș"),
    ("chipping hammer", "Ciocan pentru zgură"),
    ("claw hammer", "Ciocan de dulgher"),
    ("rubber hammer", "Ciocan de cauciuc"),
    ("ball pein hammer", "Ciocan cu bilă"),
    ("ball peen hammer", "Ciocan cu bilă"),
    ("sledge hammer", "Baros"),
)

UNIT_ALIASES = {
    "v": "V", "w": "W", "kw": "kW", "kva": "kVA", "cca": "CCA", "a": "A", "ah": "Ah",
    "nm": "Nm", "n.m": "Nm", "j": "J", "mm": "mm", "cm": "cm",
    "m": "m", "g": "g", "kg": "kg", "l": "L", "bar": "bar",
    "rpm": "rpm", "cc": "cc", "kpa": "kPa", "lm": "lm", "°c": "°C",
    "l/min": "L/min", "l/h": "L/h", "m³/h": "m³/h", "m3/h": "m³/h",
}

MEASUREMENT_RE = re.compile(
    r"(?i)(?<![A-Z0-9])\d+(?:[.,]\d+)?(?:\s*[×x/–-]\s*\d+(?:[.,]\d+)?)*\s*"
    r"(?:m³/h|m3/h|l/min|l/h|°c|kpa|rpm|kva|cca|ah|n\.?m|kw|mm|cm|kg|bar|cc|lm|v|w|a|j|g|l|m)\b"
)


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = re.sub(r"(?i)(\d)\s+(mm|cm|m|v|w|a|ah|nm|bar|l|kg|g|cc|rpm|j|kpa|lm)\b", r"\1\2", value)
    value = value.replace("n.m", "nm")
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def compact_number(value: str) -> str:
    value = value.replace(".", ",")
    if "," in value:
        value = value.rstrip("0").rstrip(",")
    return value


def normalize_title_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value.strip())
    value = re.sub(r"(?i)\b(\d+(?:[.,]\d+)?)\s*n\.?m\b", lambda m: f"{compact_number(m.group(1))} Nm", value)
    for source, display in sorted(UNIT_ALIASES.items(), key=lambda item: -len(item[0])):
        value = re.sub(
            rf"(?i)\b(\d+(?:[.,]\d+)?)\s*{re.escape(source)}\b",
            lambda m, unit=display: f"{compact_number(m.group(1))} {unit}",
            value,
        )
    value = re.sub(r"\s+([,;:])", r"\1", value)
    value = re.sub(r"(?<!\d)([,;:])(?=\S)", r"\1 ", value)
    value = re.sub(r"(?i)\b(\d+)\s*(?:buc|pcs)\b\.?", r"\1 buc.", value)
    value = re.sub(r"(\d+)\.(\d+)\s*[\"”]", r"\1,\2″", value)
    value = re.sub(r"(?<=\d)[\"”]", "″", value)
    value = re.sub(r"(?<!\d)\s*,?\s*/\s*(?=\d+(?:[.,]\d+)?\s*[\"″])", ", ", value)
    value = re.sub(r"(?i)(\d+\s*V)\s*/\s*(\d+(?:[.,]\d+)?\s*Ah)", r"\1, \2", value)
    value = re.sub(r"(?i)\b(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?\s*W)\b", r"\1 × \2", value)
    value = re.sub(
        r"(?i)\bSL(\d+(?:[.,]\d+)?)\s*\*\s*(\d+)\s*mm\s+\1\s*mm\b",
        r"SL\1*\2 mm",
        value,
    )
    seen_inches: set[str] = set()

    def dedupe_inch(match: re.Match[str]) -> str:
        key = match.group(0).replace(" ", "")
        if key in seen_inches:
            return ""
        seen_inches.add(key)
        return match.group(0)

    value = re.sub(r"\b\d+(?:[/-]\d+)?(?:[.,]\d+)?\s*″", dedupe_inch, value)
    return re.sub(r"\s+", " ", value).strip(" ,;:-–")


def format_numeric(raw: str, units: tuple[str, ...]) -> str | None:
    raw = raw.replace("−", "-").replace("–", "-").replace("×", "x")
    aliases = sorted({alias for alias, display in UNIT_ALIASES.items() if display in units}, key=len, reverse=True)
    if not aliases:
        return None
    unit_pattern = "|".join(re.escape(alias) for alias in aliases)
    pattern = re.compile(
        rf"(?i)(\d+(?:[.,]\d+)?(?:\s*(?:x|/|-)\s*\d+(?:[.,]\d+)?)*)\s*({unit_pattern})\b"
    )
    matches = list(pattern.finditer(raw))
    if not matches:
        return None
    match = matches[-1]
    number = re.sub(
        r"\d+(?:[.,]\d+)?",
        lambda part: compact_number(part.group(0)),
        match.group(1),
    ).replace("x", "×")
    display = UNIT_ALIASES[match.group(2).lower()]
    return f"{number} {display}"


def format_text(raw: str) -> str | None:
    value = re.sub(r"\s+", " ", raw.strip(" ,;·-"))
    replacements = {
        "usb type-a": "USB Type-A",
        "usb type-c": "USB Type-C",
        "sds plus": "SDS Plus",
        "sds max": "SDS Max",
    }
    value = replacements.get(value.lower(), value)
    if not value or len(value) > 32 or "\n" in value:
        return None
    if re.search(r"(?i)50/60\s*hz|220\s*[-–]\s*240|heat treatment|carbon steel|packed by", value):
        return None
    return value


def format_spec(spec: sqlite3.Row, units: tuple[str, ...]) -> str | None:
    raw = spec["value_raw"] or ""
    if units:
        return format_numeric(raw, units)
    return format_text(raw)


def specs_by_key(specs: list[sqlite3.Row]) -> dict[str, list[sqlite3.Row]]:
    result: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for spec in specs:
        result[spec["key_norm"] or ""].append(spec)
    return result


def supply_value(row: sqlite3.Row, keyed: dict[str, list[sqlite3.Row]]) -> str | None:
    cordless = row["power_source"] == "cordless_battery" or "acumulator" in (row["name_ro"] or "").lower()
    title = (row["name_ro"] or "").lower()
    petrol = "benzin" in title or (row["power_source"] == "petrol" and "electric" not in title)
    choices = (
        (("voltage", "battery_voltage"), ("V",)) if cordless
        else (("engine_displacement", "displacement"), ("cc",)) if petrol
        else (("input_power", "rated_power", "power", "max_input_power"), ("W", "kW"))
    )
    keys, units = choices
    for key in keys:
        for spec in keyed.get(key, []):
            value = format_spec(spec, units)
            if value:
                return value
    if not petrol:
        for key in ("voltage", "battery_voltage"):
            for spec in keyed.get(key, []):
                value = format_spec(spec, ("V",))
                if value and value not in {"220 V", "230 V", "240 V"}:
                    return value
    variant = " ".join(
        part for part in (row["title_ro"], row["name_ro"], row["value"], row["variant_val"]) if part
    )
    fallback_units = ("V",) if cordless else ("cc",) if petrol else ("W", "kW")
    return format_numeric(variant, fallback_units)


SOURCE_LABELS = {
    "battery_voltage": ("voltage",),
    "voltage": ("voltage",),
    "battery_capacity": ("battery", "capacity"),
    "output_voltage": ("output",),
    "tensiune_de_iesire": ("output",),
    "output_current": ("output current", "charging current", "output"),
    "input_power": ("input power", "rated input power", "power"),
    "rated_power": ("rated power", "power"),
    "power": ("power",),
    "max_input_power": ("max input power", "input power"),
    "max_torque": ("max torque", "maximum torque"),
    "impact_energy": ("impact energy",),
    "max_drilling_capacity": ("max drilling capacity",),
    "max_drilling_diameter_concrete": ("max drilling capacity", "concrete"),
    "disc_diameter": ("disc diameter", "blade diameter"),
    "blade_diameter": ("blade diameter",),
    "bar_length": ("bar length",),
    "tank": ("tank",),
    "tank_capacity": ("tank capacity",),
    "max_pressure": ("max pressure", "maximum pressure"),
    "max_output": ("max output", "maximum output"),
    "rated_output": ("rated output",),
    "input_capacity": ("input capacity",),
    "rated_input_capacity": ("rated input capacity",),
}


def source_parameter_value(row: sqlite3.Row, parameter: Parameter) -> str | None:
    if not parameter.units:
        return None
    description = row["source_description"] or ""
    if not description:
        return None
    keys = parameter.keys
    if keys == ("supply",):
        if row["power_source"] == "cordless_battery":
            keys = ("battery_voltage", "voltage")
        elif row["power_source"] == "petrol":
            keys = ("engine_displacement", "displacement")
        else:
            keys = ("input_power", "rated_power", "power", "max_input_power")
    labels = []
    for key in keys:
        labels.extend(SOURCE_LABELS.get(key, (key.replace("_", " "),)))
    for line in description.splitlines():
        searchable = re.sub(r"[^a-z0-9]+", " ", line.lower()).strip()
        if any(re.sub(r"[^a-z0-9]+", " ", label.lower()).strip() in searchable for label in labels):
            value = format_numeric(line, parameter.units)
            if not value:
                unit_pattern = "|".join(re.escape(unit) for unit in parameter.units)
                match = re.search(
                    rf"(?i)\((?P<unit>{unit_pattern})\)\s*:\s*"
                    rf"(?P<number>\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)",
                    line,
                )
                if match:
                    value = format_numeric(
                        f'{match.group("number")}{match.group("unit")}',
                        parameter.units,
                    )
            if value:
                return value
    return None


def rule_for(row: sqlite3.Row) -> tuple[Parameter, ...]:
    source = re.sub(r"\s+", " ", (row["name_en"] or "").lower()).strip()
    if "hose quick connectors set" in source:
        return ()
    if "battery system tester" in source:
        return (
            Parameter(("voltage_range",), ("V",)),
            Parameter(("current_range",), ("CCA",)),
        )
    if source == "hand pump":
        return (Parameter(("size",), ("mm",)),)
    profile = row["profile_key"] or "generic"
    if profile in PROFILE_RULES:
        return PROFILE_RULES[profile]
    category = (row["category_name"] or "").lower()
    for fragment, rule in GENERIC_CATEGORY_RULES:
        if fragment in category:
            return rule
    return ()


def select_parameters(
    row: sqlite3.Row,
    specs: list[sqlite3.Row],
    source_specs: list[sqlite3.Row],
) -> list[str]:
    keyed = specs_by_key(specs)
    source_keyed = specs_by_key(source_specs)
    values: list[str] = []
    for parameter in rule_for(row):
        value = source_parameter_value(row, parameter)
        if not value and parameter.keys == ("supply",):
            value = supply_value(row, source_keyed) or supply_value(row, keyed)
        elif not value:
            for key in parameter.keys:
                for spec in source_keyed.get(key, []):
                    value = format_spec(spec, parameter.units)
                    if value:
                        break
                if value:
                    break
        variant_text = " ".join(
            part
            for part in (row["title_ro"], row["name_ro"], row["value"], row["variant_val"])
            if part
        )
        allow_propagated = (
            row["family_size"] == 1
            or row["profile_key"] in {"battery", "charger"}
            or not any(key in VARIANT_SPECIFIC_KEYS for key in parameter.keys)
        )
        if not value and allow_propagated and parameter.keys != ("supply",):
            for key in parameter.keys:
                for spec in keyed.get(key, []):
                    value = format_spec(spec, parameter.units)
                    if value:
                        break
                if value:
                    break
        if not value and parameter.units and variant_text:
            value = format_numeric(variant_text, parameter.units)
        if value and normalized(value) not in {normalized(item) for item in values}:
            values.append(value)
    if not values and (row["variant_val"] or row["value"]):
        fallback = normalize_title_text(row["variant_val"] or row["value"])
        if MEASUREMENT_RE.search(fallback) and len(fallback) <= 24:
            values.append(fallback)
    return values[:3]


def source_base(row: sqlite3.Row) -> str | None:
    source = re.sub(r"\s+", " ", (row["name_en"] or "").lower()).strip()
    for fragment, base in SOURCE_BASES:
        if fragment in source:
            return base
    return None


def strip_sku(title: str, sku: str) -> str:
    return re.sub(
        rf"(?:\s*[–—-]\s*|\s*,?\s*model\s+){re.escape(sku)}\s*$",
        "",
        title,
        flags=re.IGNORECASE,
    ).strip(" ,;:-–")


def strip_measurements(title: str) -> str:
    title = MEASUREMENT_RE.sub(" ", title)
    title = re.sub(r"\(?\b\d+\s*/\s*\d+\s*[″\"]\)?", " ", title)
    title = re.sub(r"\b\d+(?:[.,]\d+)?\s*[″\"]", " ", title)
    title = re.sub(r"(?<!\d)\s*/\s*(?!\d)", " ", title)
    title = re.sub(r"\s*[·|]\s*", " ", title)
    title = re.sub(r"(?:\s*,\s*){2,}", ", ", title)
    title = re.sub(r"\(\s*\)", "", title)
    title = re.sub(r"\s+,", ",", title)
    return re.sub(r"\s+", " ", title).strip(" ,;:-–")


def dedupe_measurements(title: str) -> str:
    seen: set[str] = set()

    def replace(match: re.Match[str]) -> str:
        value = normalize_title_text(match.group(0))
        key = normalized(value)
        if key in seen:
            return ""
        seen.add(key)
        return value

    title = re.sub(r"\s+", " ", MEASUREMENT_RE.sub(replace, title)).strip()
    return re.sub(r"\s*/\s*(?=,|$)", "", title).strip()


def remove_deduplicator_material(title: str, specs: list[sqlite3.Row], had_sku: bool) -> str:
    if not had_sku:
        return title
    for spec in specs:
        if (spec["key_norm"] or "") not in {"material", "blade_material", "handle_material", "head_material"}:
            continue
        raw = re.sub(r"\s+", " ", (spec["value_raw"] or "").strip())
        if raw and title.lower().endswith(raw.lower()):
            title = title[: -len(raw)].rstrip(" ,;:-–")
    return title


def package_base(base: str, row: sqlite3.Row) -> str:
    base = re.sub(
        r"(?i)cu acumulator\s+cu acumulator\s*\+\s*încărcător",
        "cu acumulator și încărcător",
        base,
    )
    base = re.sub(r"(?i)cu acumulator\s*\(acumulator\)", "cu acumulator", base)
    if "cu acumulator" in base.lower():
        base = re.sub(r"(?i)\s*\(acumulator\)", "", base)
    description = row["source_description"] or ""
    if re.search(r"(?i)battery and charger sold separately", description):
        return re.sub(
            r"(?i)cu acumulator(?:\s+și încărcător)?",
            "fără acumulator și încărcător",
            base,
            count=1,
        )
    if "cu acumulator" not in base.lower() or "charger" not in description.lower():
        return base
    counts = [int(value) for value in re.findall(r"(?im)\b(\d+)\s*(?:pcs?|buc)\b[^\n]*battery", description)]
    count = max(counts, default=1)
    replacement = "cu acumulator și încărcător" if count == 1 else f"cu {count} acumulatori și încărcător"
    base = re.sub(r"(?i)cu acumulator(?:\s+și încărcător)?", replacement, base, count=1)
    return re.sub(r"(?i)(încărcător)\s+(?=\d)", r"\1, ", base)


def accessory_title(title: str) -> bool:
    return bool(
        re.search(
            r"(?i)\b(furtun|duză|adaptor|accesoriu|piesă de schimb|sac filtrant|șină|lanț)\b",
            title,
        )
    )


def title_base(row: sqlite3.Row, specs: list[sqlite3.Row]) -> str:
    current = (row["name_ro"] or row["title_ro"] or row["sku"]).strip()
    had_sku = bool(
        re.search(
            rf"(?:[–—-]\s*|\bmodel\s+){re.escape(row['sku'])}\s*$",
            current,
            flags=re.IGNORECASE,
        )
    )
    current = strip_sku(current, row["sku"])
    current = remove_deduplicator_material(current, specs, had_sku)
    override = source_base(row)
    if override:
        return override
    profile = row["profile_key"] or "generic"
    if profile == "battery":
        return "Acumulator Li-Ion"
    if profile == "charger" and any((spec["key_norm"] or "") == "charging_port" for spec in specs):
        return "Încărcător USB"
    if (
        profile in REBUILD_PROFILES
        and not accessory_title(current)
    ) or "ciocane, topoare" in (row["category_name"] or "").lower():
        current = strip_measurements(current)
    return normalize_title_text(package_base(current, row))


def compose_title(base: str, parameters: list[str]) -> str:
    present = normalized(base)
    missing = [value for value in parameters if normalized(value) not in present]
    title = base if not missing else f"{base}, {', '.join(missing)}"
    title = dedupe_measurements(normalize_title_text(title))
    return re.sub(r"\s+", " ", title).strip(" ,;:-–")


def strip_selected_parameters(base: str, parameters: list[str]) -> str:
    cleaned = normalize_title_text(base)
    for parameter in parameters:
        candidate = normalize_title_text(parameter)
        cleaned = re.sub(re.escape(candidate), " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"(?:\s*,\s*){2,}", ", ", cleaned)
    cleaned = re.sub(r"\(\s*\)", "", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip(" ,;:-–")


def load(connection: sqlite3.Connection):
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT v.sku, v.product_id, v.name_ro, v.value, v.variant_val, v.variant_size,
               p.title_ro, p.product_type, p.power_source,
               COUNT(*) OVER (PARTITION BY v.product_id) AS family_size,
               c.name_ro AS category_name, vp.profile_key, vp.profile_label,
               si.name_en, si.description AS source_description,
               CASE
                   WHEN LENGTH(TRIM(COALESCE(vc.short_description, ''))) >= 50
                       THEN vc.short_description
                   ELSE COALESCE(NULLIF(pc.short_description, ''), NULLIF(p.description_ro, ''), vc.short_description)
               END AS short_description,
               COALESCE(NULLIF(vc.meta_description, ''), NULLIF(pc.meta_description, '')) AS meta_description
        FROM variant v
        JOIN catalog_availability a ON a.sku = v.sku AND a.available = 1
        JOIN product p ON p.id = v.product_id
        LEFT JOIN category c ON c.id = COALESCE(v.category_id, p.category_id)
        LEFT JOIN spec_variant_profile vp ON vp.sku = v.sku
        LEFT JOIN catalog_source_item si ON si.sku = v.sku
        LEFT JOIN catalog_variant_content vc ON vc.sku = v.sku
        LEFT JOIN product_content pc ON pc.product_id = p.id
        ORDER BY v.sku
        """
    ).fetchall()
    specs: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for spec in connection.execute(
        "SELECT sku,key_norm,label_ro,value_raw,value_num,unit,position FROM specification ORDER BY sku,position"
    ).fetchall():
        specs[spec["sku"]].append(spec)
    source_specs: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for spec in connection.execute(
        "SELECT sku,key_norm,label_ro,value_raw,value_num,unit,position FROM source_specification ORDER BY sku,position"
    ).fetchall():
        source_specs[spec["sku"]].append(spec)
    return rows, specs, source_specs


def collision_fallback(change: dict, specs: list[sqlite3.Row]) -> str | None:
    if change["profile"] in NO_SECONDARY_SPEC_PROFILES:
        return None
    title = change["newTitle"]
    candidates = []
    for spec in specs:
        if (spec["key_norm"] or "") not in {"size", "length", "diameter", "weight", "material", "type", "profile"}:
            continue
        units = ("mm", "cm", "m", "g", "kg") if (spec["key_norm"] or "") != "material" else ()
        value = format_spec(spec, units)
        if value:
            candidates.append(value)
    for value in candidates:
        if normalized(value) not in normalized(title):
            return value
    return None


def build_changes(rows, specs_by_sku, source_specs_by_sku):
    changes = []
    for row in rows:
        old_title = (row["name_ro"] or row["title_ro"] or row["sku"]).strip()
        parameters = select_parameters(
            row,
            specs_by_sku[row["sku"]],
            source_specs_by_sku[row["sku"]],
        )
        base = title_base(row, specs_by_sku[row["sku"]])
        if (row["profile_key"] or "generic") in REBUILD_PROFILES:
            base = strip_selected_parameters(base, parameters)
        new_title = compose_title(base, parameters)
        changes.append({
            "sku": row["sku"],
            "productId": row["product_id"],
            "profile": row["profile_key"] or "generic",
            "category": row["category_name"],
            "oldTitle": old_title,
            "newTitle": new_title,
            "parameters": parameters,
            "fallback": None,
            "shortDescription": row["short_description"],
            "metaDescription": row["meta_description"],
        })

    groups: dict[str, list[dict]] = defaultdict(list)
    for change in changes:
        groups[normalized(change["newTitle"])].append(change)
    for entries in groups.values():
        if len(entries) < 2:
            continue
        proposals = Counter()
        for change in entries:
            fallback = collision_fallback(change, specs_by_sku[change["sku"]])
            if fallback:
                proposal = compose_title(change["newTitle"], [fallback])
                proposals[normalized(proposal)] += 1
                change["collisionProposal"] = proposal
                change["collisionValue"] = fallback
        for change in entries:
            proposal = change.pop("collisionProposal", None)
            fallback = change.pop("collisionValue", None)
            if proposal and proposals[normalized(proposal)] == 1:
                change["newTitle"] = proposal
                change["fallback"] = "secondary_spec"
                if fallback and fallback not in change["parameters"]:
                    change["parameters"].append(fallback)
            else:
                change["newTitle"] = f'{change["newTitle"]}, model {change["sku"]}'
                change["fallback"] = "sku"
    return changes


def clipped_meta_title(title: str) -> str:
    suffix = " | DYLLU"
    if len(title) + len(suffix) <= 60:
        return title + suffix
    return title[: 60 - len(suffix)].rstrip(" ,;:-") + suffix


def apply_changes(connection: sqlite3.Connection, changes: list[dict]):
    now = datetime.now(timezone.utc).isoformat()
    with connection:
        for change in changes:
            if change["oldTitle"] != change["newTitle"]:
                connection.execute("UPDATE variant SET name_ro = ? WHERE sku = ?", (change["newTitle"], change["sku"]))
            base_description = change["metaDescription"] or ""
            if change["oldTitle"] in base_description:
                meta_description = base_description.replace(change["oldTitle"], change["newTitle"], 1)
            else:
                meta_description = f'{change["newTitle"]}. {base_description}'.strip()
            if len(meta_description) > 160:
                meta_description = meta_description[:157].rstrip(" ,;:-") + "..."
            connection.execute(
                """
                INSERT INTO catalog_variant_content(
                    sku, short_description, meta_title, meta_description, image_alt, source, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'catalog-search-naming', ?)
                ON CONFLICT(sku) DO UPDATE SET
                    short_description = excluded.short_description,
                    meta_title = excluded.meta_title,
                    meta_description = excluded.meta_description,
                    image_alt = excluded.image_alt,
                    source = excluded.source,
                    updated_at = excluded.updated_at
                """,
                (
                    change["sku"],
                    change["shortDescription"] or change["newTitle"],
                    clipped_meta_title(change["newTitle"]),
                    meta_description,
                    f'{change["newTitle"]} DYLLU',
                    now,
                ),
            )


def audit(changes: list[dict]) -> list[dict]:
    issues = []
    title_counts = Counter(normalized(change["newTitle"]) for change in changes)
    for change in changes:
        if not change["newTitle"]:
            issues.append({"sku": change["sku"], "type": "empty_title"})
        if len(change["newTitle"]) > 110:
            issues.append({"sku": change["sku"], "type": "title_too_long", "length": len(change["newTitle"])})
        if title_counts[normalized(change["newTitle"])] > 1:
            issues.append({"sku": change["sku"], "type": "duplicate_title"})
        voltage_values = re.findall(r"(?i)\b\d+(?:[.,]\d+)?\s*V\b", change["newTitle"])
        if re.search(r"(?i)\b0\s*Ah\b", change["newTitle"]) or len(voltage_values) > 1:
            issues.append({"sku": change["sku"], "type": "invalid_or_repeated_voltage"})
    return issues


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    connection = sqlite3.connect(args.database)
    rows, specs, source_specs = load(connection)
    all_changes = build_changes(rows, specs, source_specs)
    issues = audit(all_changes)
    changed = [change for change in all_changes if change["oldTitle"] != change["newTitle"]]
    backup = None
    if args.apply:
        if issues:
            raise SystemExit(f"Refusing to apply: {len(issues)} naming issues remain")
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = args.database.parent / "backups" / f"catalog-before-search-naming-{stamp}.db"
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(args.database, backup)
        apply_changes(connection, all_changes)
    connection.close()

    profile_counts = Counter(change["profile"] for change in changed)
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "applied": args.apply,
        "backup": str(backup) if backup else None,
        "summary": {
            "catalogSkus": len(all_changes),
            "changedSkus": len(changed),
            "unchangedSkus": len(all_changes) - len(changed),
            "skuFallbacks": sum(change["fallback"] == "sku" for change in all_changes),
            "secondarySpecFallbacks": sum(change["fallback"] == "secondary_spec" for change in all_changes),
            "issues": len(issues),
        },
        "changedByProfile": dict(profile_counts.most_common()),
        "issues": issues,
        "changes": [
            {key: value for key, value in change.items() if key not in {"shortDescription", "metaDescription"}}
            for change in changed
        ],
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({**report["summary"], "applied": args.apply, "backup": report["backup"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
