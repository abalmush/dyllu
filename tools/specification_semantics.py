"""Semantic profiles for catalog specification contracts."""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from typing import Any


def _fold(value: Any) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    ascii_value = "".join(character for character in normalized if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", ascii_value.lower()).strip()


COMMON_PHYSICAL_KEYS = frozenset({
    "approx_weight",
    "approx_wt",
    "color",
    "dimensions",
    "dry_weight",
    "height",
    "length",
    "material",
    "net_weight",
    "product_size",
    "product_weight",
    "size",
    "total_length",
    "type",
    "weight",
    "width",
})

METADATA_KEYS = frozenset({
    "brand",
    "function",
    "functions",
    "model",
    "variant",
    "variants",
    "variante",
    "with_2_function",
})

RELATIONSHIP_KEYS = frozenset({
    "bundled_products",
    "compatible_with",
    "include",
    "included",
    "included_accessories",
    "includes",
    "package_contents",
})


@dataclass(frozen=True)
class SpecificationProfile:
    key: str
    label_ro: str
    aligned_keys: frozenset[str]
    conditional_keys: frozenset[str] = frozenset()
    contract_scope: str = "profile"


POWER_SOURCE_KEYS = frozenset({
    "battery_capacity",
    "battery_type",
    "battery_voltage",
    "charge_volts",
    "charging_voltage",
    "frequency",
    "input_power",
    "power_supply",
    "rated_frequency",
    "rated_voltage",
    "voltage",
})

PNEUMATIC_INPUT_KEYS = frozenset({
    "air_consumption",
    "air_hose",
    "air_inlet",
    "air_pressure",
    "max_pressure",
    "operating_pressure",
})

ROTARY_HAMMER = SpecificationProfile(
    "rotary_hammer",
    "Ciocan rotopercutor",
    POWER_SOURCE_KEYS | frozenset({
        "impact_energy",
        "impact_rate",
        "max_drilling_capacity",
        "max_drilling_diameter_concrete",
        "max_impact_rate",
        "no_load_speed",
        "tool_holder",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({
        "core_bit",
        "max_drilling_diameter_steel",
        "max_drilling_diameter_wood",
    }),
)

DEMOLITION_HAMMER = SpecificationProfile(
    "demolition_hammer",
    "Ciocan demolator",
    POWER_SOURCE_KEYS | PNEUMATIC_INPUT_KEYS | frozenset({
        "impact_energy",
        "impact_rate",
        "max_impact_rate",
        "tool_holder",
    }),
    COMMON_PHYSICAL_KEYS,
)

ROTARY_HAMMER_CHISEL = SpecificationProfile(
    "rotary_hammer_chisel",
    "Daltă pentru ciocan rotopercutor",
    frozenset({
        "blade_width",
        "length",
        "material",
        "shank",
        "shank_dia",
        "shank_type",
        "tip_size",
        "total_length",
        "working_length",
    }),
    COMMON_PHYSICAL_KEYS,
)

DRILL_DRIVER = SpecificationProfile(
    "drill_driver",
    "Mașină de găurit și înșurubat",
    POWER_SOURCE_KEYS | frozenset({
        "chuck_capacity",
        "chuck_type",
        "impact_rate",
        "max_drilling_capacity",
        "max_screw_diameter",
        "max_torque",
        "no_load_speed",
        "number_of_steps",
        "torque_settings",
        "tool_holder",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({
        "max_drilling_diameter_concrete",
        "max_drilling_diameter_steel",
        "max_drilling_diameter_wood",
    }),
)

IMPACT_WRENCH = SpecificationProfile(
    "impact_wrench",
    "Cheie de impact",
    POWER_SOURCE_KEYS | PNEUMATIC_INPUT_KEYS | frozenset({
        "drive_size",
        "fastening_torque",
        "impact_rate",
        "max_impact_rate",
        "max_torque",
        "no_load_speed",
        "nut_busting_torque",
        "square_drive",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"hex_shank", "torque_settings"}),
)

ANGLE_GRINDER = SpecificationProfile(
    "angle_grinder",
    "Polizor unghiular",
    POWER_SOURCE_KEYS | frozenset({
        "arbor",
        "disc_diameter",
        "no_load_speed",
        "rated_speed",
        "spindle_thread",
    }),
    COMMON_PHYSICAL_KEYS,
)

SAW = SpecificationProfile(
    "saw",
    "Ferăstrău",
    POWER_SOURCE_KEYS | frozenset({
        "blade_diameter",
        "blade_length",
        "blade_size",
        "cutting_capacity",
        "cutting_depth",
        "cutting_height",
        "cutting_width",
        "max_cutting_diameter",
        "max_cutting_length",
        "max_cutting_thickness",
        "no_load_speed",
        "stroke",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"arbor", "blade_material", "blade_width"}),
)

CHAINSAW = SpecificationProfile(
    "chainsaw",
    "Drujbă",
    POWER_SOURCE_KEYS | frozenset({
        "chain_speed",
        "displacement",
        "engine_power",
        "engine_type",
        "fuel_consumption",
        "fuel_tank_capacity",
        "guide_bar_length",
        "no_load_speed",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"blade_length", "cutting_length"}),
)

SANDER = SpecificationProfile(
    "sander",
    "Mașină de șlefuit",
    POWER_SOURCE_KEYS | frozenset({
        "disc_diameter",
        "no_load_speed",
        "plate_size",
        "rated_speed",
        "stroke",
        "vibrating_amplitude",
        "vibrating_frequency",
    }),
    COMMON_PHYSICAL_KEYS,
)

POLISHER = SpecificationProfile(
    "polisher",
    "Mașină de lustruit",
    POWER_SOURCE_KEYS | frozenset({
        "disc_diameter",
        "no_load_speed",
        "rated_speed",
        "spindle_thread",
    }),
    COMMON_PHYSICAL_KEYS,
)

NAILER = SpecificationProfile(
    "nailer",
    "Capsator și pistol de cuie",
    POWER_SOURCE_KEYS | PNEUMATIC_INPUT_KEYS | frozenset({
        "fastener_capacity",
        "nail_diameter",
        "nail_length",
    }),
    COMMON_PHYSICAL_KEYS,
)

POWERED_RATCHET = SpecificationProfile(
    "powered_ratchet",
    "Clichet acționat",
    POWER_SOURCE_KEYS | PNEUMATIC_INPUT_KEYS | frozenset({
        "drive_size",
        "max_torque",
        "no_load_speed",
        "square_drive",
    }),
    COMMON_PHYSICAL_KEYS,
)

CIRCULAR_SAW = SpecificationProfile(
    "circular_saw",
    "Ferăstrău circular",
    SAW.aligned_keys,
    SAW.conditional_keys,
)

JIGSAW = SpecificationProfile(
    "jigsaw",
    "Ferăstrău pendular",
    SAW.aligned_keys,
    SAW.conditional_keys,
)

MITER_SAW = SpecificationProfile(
    "miter_saw",
    "Ferăstrău de retezat",
    SAW.aligned_keys,
    SAW.conditional_keys,
)

CUT_OFF_SAW = SpecificationProfile(
    "cut_off_saw",
    "Mașină de debitat",
    SAW.aligned_keys,
    SAW.conditional_keys,
)

TABLE_SAW = SpecificationProfile(
    "table_saw",
    "Ferăstrău cu masă",
    SAW.aligned_keys,
    SAW.conditional_keys,
)

AIR_COMPRESSOR = SpecificationProfile(
    "air_compressor",
    "Compresor de aer",
    POWER_SOURCE_KEYS | frozenset({
        "air_consumption",
        "air_flow",
        "air_pressure",
        "airflow",
        "container_capacity",
        "max_air_flow",
        "max_flow",
        "max_pressure",
        "operating_pressure",
        "tank_capacity",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"noise"}),
)

PRESSURE_WASHER = SpecificationProfile(
    "pressure_washer",
    "Aparat de spălat cu presiune",
    POWER_SOURCE_KEYS | frozenset({
        "cable_length",
        "flow_rate",
        "max_flow",
        "max_pressure",
        "operating_pressure",
        "working_pressure",
    }),
    COMMON_PHYSICAL_KEYS,
)

WELDER = SpecificationProfile(
    "welder",
    "Aparat de sudură",
    POWER_SOURCE_KEYS | frozenset({
        "ac_current",
        "dc_current",
        "duty_cycle",
        "input_voltage",
        "max_output_current",
        "no_load_voltage",
        "output_current",
        "rated_current",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"protection_level", "safety_class"}),
)

GENERATOR = SpecificationProfile(
    "generator",
    "Generator electric",
    frozenset({
        "current",
        "engine_power",
        "engine_type",
        "frequency",
        "fuel_consumption",
        "fuel_tank_capacity",
        "max_output",
        "output_power",
        "phase",
        "rated_current",
        "rated_frequency",
        "rated_output",
        "rated_power",
        "rated_voltage",
        "starting_system",
        "voltage",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"noise"}),
)

VACUUM = SpecificationProfile(
    "vacuum",
    "Aspirator",
    POWER_SOURCE_KEYS | frozenset({
        "air_flow",
        "airflow",
        "cable_length",
        "container_capacity",
        "max_suction",
        "vacuum_pressure",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"noise"}),
)

HEAT_GUN = SpecificationProfile(
    "heat_gun",
    "Pistol cu aer cald",
    POWER_SOURCE_KEYS | frozenset({"air_flow", "airflow", "temperature"}),
    COMMON_PHYSICAL_KEYS,
)

PUMP = SpecificationProfile(
    "pump",
    "Pompă",
    POWER_SOURCE_KEYS | frozenset({
        "flow_rate",
        "max_flow",
        "max_head",
        "max_suction_head",
        "max_viscosity",
        "pipe_diameter",
    }),
    COMMON_PHYSICAL_KEYS,
)

WATER_PUMP = SpecificationProfile(
    "water_pump",
    "Pompă de apă",
    PUMP.aligned_keys,
    PUMP.conditional_keys,
)

SPRAYER = SpecificationProfile(
    "sprayer",
    "Pompă de stropit și pulverizator",
    PUMP.aligned_keys | frozenset({"capacity", "max_pressure", "tank_capacity"}),
    PUMP.conditional_keys,
)

FLUID_TRANSFER_PUMP = SpecificationProfile(
    "fluid_transfer_pump",
    "Pompă pentru transfer de lichide",
    PUMP.aligned_keys | frozenset({"capacity", "max_pressure", "tank_capacity"}),
    PUMP.conditional_keys,
)

BATTERY = SpecificationProfile(
    "battery",
    "Acumulator",
    frozenset({
        "battery_capacity",
        "battery_type",
        "battery_voltage",
        "charge_volts",
        "voltage",
    }),
    COMMON_PHYSICAL_KEYS | frozenset({"charging_time"}),
)

CHARGER = SpecificationProfile(
    "charger",
    "Încărcător și tester",
    frozenset({
        "charge_volts",
        "charging_time",
        "charging_voltage",
        "current",
        "dc_output",
        "input_voltage",
        "output_current",
        "rated_current",
        "voltage",
    }),
    COMMON_PHYSICAL_KEYS,
)

LIGHTING = SpecificationProfile(
    "lighting",
    "Iluminat",
    POWER_SOURCE_KEYS | frozenset({
        "color_temp_k",
        "luminous_flux",
        "protection_level",
    }),
    COMMON_PHYSICAL_KEYS,
)

HAND_HAMMER = SpecificationProfile(
    "hand_hammer",
    "Ciocan manual",
    frozenset({
        "diametru_cap",
        "hammer_diameter",
        "hammer_head_material",
        "handle_material",
        "handle_size",
        "head_material",
        "length",
        "material",
        "total_length",
        "weight",
    }),
    COMMON_PHYSICAL_KEYS,
)

HAND_TOOL = SpecificationProfile(
    "hand_tool",
    "Scule manuale",
    frozenset({
        "blade_length",
        "blade_material",
        "clamp_size",
        "drive_size",
        "handle_material",
        "jaw_width",
        "length",
        "material",
        "max_clamping_diameter",
        "max_clamping_force",
        "size",
        "socket_size",
        "square_drive",
        "tip_size",
        "total_length",
        "weight",
    }),
    COMMON_PHYSICAL_KEYS,
)


def _hand_profile(key: str, label: str) -> SpecificationProfile:
    return SpecificationProfile(
        key,
        label,
        HAND_TOOL.aligned_keys,
        HAND_TOOL.conditional_keys,
    )


WRENCH = _hand_profile("wrench", "Cheie manuală")
SOCKET_RATCHET = _hand_profile("socket_ratchet", "Cheie tubulară și clichet manual")
SCREWDRIVER = _hand_profile("screwdriver", "Șurubelniță manuală")
PLIERS = _hand_profile("pliers", "Clește și patent")
HAND_SAW = _hand_profile("hand_saw", "Ferăstrău manual")
FILE_CHISEL_PLANE = _hand_profile("file_chisel_plane", "Pilă, daltă și rindea manuală")
CLAMP_VISE = _hand_profile("clamp_vise", "Menghină și clemă")
PLUMBING_HAND_TOOL = _hand_profile("plumbing_hand_tool", "Scule manuale pentru instalații")
THREADING_TOOL = _hand_profile("threading_tool", "Scule pentru filetare")
MANUAL_STAPLER_RIVETER = _hand_profile("manual_stapler_riveter", "Capsator și nituitor manual")

ACCESSORY = SpecificationProfile(
    "accessory",
    "Accesoriu și consumabil",
    frozenset({
        "arbor",
        "blade_diameter",
        "blade_length",
        "blade_material",
        "blade_size",
        "blade_thickness",
        "blade_width",
        "diameter",
        "disc_diameter",
        "effective_length",
        "external_diameter",
        "inner_diameter",
        "length",
        "material",
        "number_of_teeth",
        "outer_diameter",
        "pack_size",
        "quantity",
        "shank",
        "shank_dia",
        "shank_type",
        "thickness",
        "total_length",
        "working_length",
    }),
    COMMON_PHYSICAL_KEYS,
    "category",
)

STORAGE = SpecificationProfile(
    "storage",
    "Depozitare și organizare",
    frozenset({
        "capacity",
        "dimensions",
        "height",
        "length",
        "load_capacity",
        "material",
        "max_load",
        "volume",
        "weight",
        "width",
    }),
    COMMON_PHYSICAL_KEYS,
    "category",
)

PROTECTIVE_EQUIPMENT = SpecificationProfile(
    "protective_equipment",
    "Echipament de protecție",
    frozenset({
        "material",
        "protection_level",
        "safety_class",
        "size",
        "type",
        "weight",
    }),
    COMMON_PHYSICAL_KEYS,
    "category",
)

GENERIC = SpecificationProfile(
    "generic",
    "Profil tehnic general",
    frozenset(),
    COMMON_PHYSICAL_KEYS,
    "category",
)


PROFILE_MATCHERS: tuple[tuple[SpecificationProfile, tuple[str, ...]], ...] = (
    (ROTARY_HAMMER_CHISEL, ("dalta sds", "sds chisel", "sds max chisel")),
    (DEMOLITION_HAMMER, ("ciocan demolator", "demolition hammer", "demolition breaker", "breaker hammer", "air hammer")),
    (ROTARY_HAMMER, ("ciocan rotopercutor", "rotary hammer", "rotopercutor", "sds max hammer drill")),
    (POWERED_RATCHET, ("drive ratchet", "pneumatic ratchet", "clichet pneumatic")),
    (IMPACT_WRENCH, ("cheie de impact", "cheie cu impact", "impact wrench")),
    (DRILL_DRIVER, ("masina de gaurit", "masina de insurubat", "drill driver", "corded drill", "cordless drill", "drywall screwdriver", "bormasina", "surubelnita cu acumulator")),
    (NAILER, ("cordless nailer", "electric nailer", "air brad nailer", "air concrete nailer", "pistol pneumatic de cuie")),
    (POLISHER, ("masina de lustruit", "polisher", "polishing machine")),
    (ANGLE_GRINDER, ("polizor unghiular", "angle grinder", "straight grinder", "mini grinder")),
    (CHAINSAW, ("drujba", "chainsaw", "ferastrau cu lant")),
    (SANDER, ("masina de slefuit", "sander", "slefuitor")),
    (CIRCULAR_SAW, ("ferastrau circular", "fierastrau circular", "circular saw")),
    (JIGSAW, ("ferastrau pendular", "fierastrau pendular", "jigsaw")),
    (MITER_SAW, ("ferastrau de retezat", "fierastrau de retezat", "miter saw", "crosscut saw")),
    (CUT_OFF_SAW, ("masina de debitat", "cut off saw")),
    (TABLE_SAW, ("table saw", "ferastrau cu masa", "fierastrau cu masa")),
    (SAW, ("ferastrau", "fierastrau", "sabre saw", "reciprocating saw")),
    (AIR_COMPRESSOR, ("compresor", "air compressor")),
    (PRESSURE_WASHER, ("spalat cu presiune", "pressure washer")),
    (WELDER, ("aparat de sudura", "invertor sudura", "welder", "welding machine")),
    (GENERATOR, ("generator electric", "generator pe benzina", "generator diesel")),
    (VACUUM, ("aspirator", "vacuum cleaner")),
    (HEAT_GUN, ("pistol aer cald", "pistol cu aer cald", "heat gun")),
    (PUMP, ("pompa", "pump")),
    (CHARGER, ("incarcator", "redresor", "tester baterie", "battery charger")),
    (LIGHTING, ("proiector", "lanterna", "iluminat", "work light")),
    (HAND_HAMMER, ("ciocan", "baros", "hammer")),
)


ACCESSORY_CATEGORIES = frozenset(_fold(value) for value in (
    "Abrazive și perii tehnice",
    "Accesorii pentru scule electrice",
    "Biți și port-biți",
    "Burghie și carote",
    "Discuri de tăiere și șlefuire",
    "Pânze și lame pentru ferăstraie",
))

ACCESSORY_TITLE_TERMS = tuple(_fold(value) for value in (
    "accessories of mini drill",
    "impact socket",
    "saw blade",
    "jigsaw blade",
    "hacksaw blade",
    "reciprocating saw blade",
    "chainsaw chain",
    "saw chain",
))

CATEGORY_PROFILES = {
    _fold(name): profile
    for name, profile in (
        ("Dălți SDS și accesorii pentru rotopercutoare", ROTARY_HAMMER_CHISEL),
        ("Mașini de găurit și înșurubat", DRILL_DRIVER),
        ("Chei și șurubelnițe cu impact", IMPACT_WRENCH),
        ("Ciocane rotopercutoare și demolatoare", ROTARY_HAMMER),
        ("Polizoare", ANGLE_GRINDER),
        ("Mașini de lustruit", POLISHER),
        ("Mașini de șlefuit", SANDER),
        ("Ferăstraie electrice", SAW),
        ("Capsatoare și pistoale de cuie", NAILER),
        ("Acumulatori și încărcătoare pentru scule", BATTERY),
        ("Compresoare de aer", AIR_COMPRESSOR),
        ("Compresoare auto și pompe de umflat", AIR_COMPRESSOR),
        ("Ciocane pneumatice", DEMOLITION_HAMMER),
        ("Capsatoare și pistoale pneumatice de cuie", NAILER),
        ("Chei și clicheți pneumatici", POWERED_RATCHET),
        ("Aparate de spălat cu presiune", PRESSURE_WASHER),
        ("Aspiratoare și aparate de curățat cu aburi", VACUUM),
        ("Aparate de sudură și tăiere cu plasmă", WELDER),
        ("Redresoare și testere pentru baterii auto", CHARGER),
        ("Generatoare electrice", GENERATOR),
        ("Drujbe și accesorii", CHAINSAW),
        ("Pompe de apă", WATER_PUMP),
        ("Pompe de stropit și pulverizatoare", SPRAYER),
        ("Pompe pentru ulei și transfer lichide", FLUID_TRANSFER_PUMP),
        ("Iluminat de lucru", LIGHTING),
        ("Pistoale cu aer cald", HEAT_GUN),
        ("Chei fixe, reglabile și speciale", WRENCH),
        ("Chei tubulare, clicheți și accesorii", SOCKET_RATCHET),
        ("Șurubelnițe", SCREWDRIVER),
        ("Clești și patent", PLIERS),
        ("Ferăstraie manuale", HAND_SAW),
        ("Pile, dălți și rindele", FILE_CHISEL_PLANE),
        ("Menghine și cleme", CLAMP_VISE),
        ("Scule pentru țevi și instalații", PLUMBING_HAND_TOOL),
        ("Scule pentru filetare", THREADING_TOOL),
        ("Capsatoare și nituitoare manuale", MANUAL_STAPLER_RIVETER),
    )
}

TITLE_SPLIT_CATEGORIES = frozenset(_fold(value) for value in (
    "Acumulatori și încărcătoare pentru scule",
    "Chei și clicheți pneumatici",
    "Chei și șurubelnițe cu impact",
    "Ciocane rotopercutoare și demolatoare",
    "Ferăstraie electrice",
))

PROTECTIVE_CATEGORIES = frozenset(_fold(value) for value in (
    "Echipamente pentru lucrul la înălțime",
    "Îmbrăcăminte de protecție",
    "Încălțăminte de protecție",
    "Mănuși de protecție",
    "Protecția capului, feței și auzului",
    "Protecție respiratorie",
    "Semnalizare și delimitare",
))

STORAGE_CATEGORIES = frozenset(_fold(value) for value in (
    "Bancuri, dulapuri și cărucioare de atelier",
    "Cutii, genți și organizatoare pentru scule",
    "Rafturi și sisteme de depozitare",
))

LEGACY_PROFILE_CATEGORY_TERMS = (
    "scule electrice",
    "ciocan rotopercutor",
    "masini unelte",
)

LEGACY_MANUAL_CATEGORY_PROFILES = (
    ("chei fixe", WRENCH),
    ("chei tubulare", SOCKET_RATCHET),
    ("surubelnite", SCREWDRIVER),
    ("clesti", PLIERS),
    ("fierastraie manuale", HAND_SAW),
    ("ferastraie manuale", HAND_SAW),
    ("menghine", CLAMP_VISE),
)


def power_source_for_variant(variant: dict[str, Any]) -> str:
    aliases = {
        "cordless": "cordless_battery",
        "battery": "cordless_battery",
        "electric": "corded",
        "gasoline": "petrol",
        "diesel": "petrol",
        "air": "pneumatic",
    }
    title = _fold(f"{variant.get('title_ro')} {variant.get('title_en')}")
    if "battery pack" in title or title.startswith("acumulator "):
        return "battery"
    if any(term in title for term in ("cordless", "acumulator")):
        return "cordless_battery"
    if any(term in title for term in ("pneumatic", "air hammer", "air impact", "air brad", "air concrete")):
        return "pneumatic"
    if any(term in title for term in ("petrol", "benzina", "gasoline", "diesel")):
        return "petrol"
    if any(term in title for term in ("manual", "hand saw", "hand tool")):
        return "manual"
    if (
        any(term in title for term in ("corded", "electric", " 220v", " 230v"))
        or re.search(r"\b\d+(?:[.,]\d+)?\s*w\b", title)
    ):
        return "corded"
    explicit = _fold(variant.get("power_source")).replace(" ", "_")
    if explicit:
        return aliases.get(explicit, explicit)
    return "unspecified"


def profile_for_variant(variant: dict[str, Any]) -> SpecificationProfile:
    title = _fold(f"{variant.get('title_ro')} {variant.get('title_en')}")
    category = _fold(variant.get("category_name"))
    padded_title = f" {title} "
    if category in ACCESSORY_CATEGORIES or any(f" {term} " in padded_title for term in ACCESSORY_TITLE_TERMS):
        return ACCESSORY
    category_profile = CATEGORY_PROFILES.get(category)
    if category_profile is not None and category not in TITLE_SPLIT_CATEGORIES:
        return category_profile
    if category in PROTECTIVE_CATEGORIES:
        return PROTECTIVE_EQUIPMENT
    if category in STORAGE_CATEGORIES:
        return STORAGE
    if category_profile is None:
        for term, profile in LEGACY_MANUAL_CATEGORY_PROFILES:
            if term in category:
                return profile
    if category and category_profile is None and not any(term in category for term in LEGACY_PROFILE_CATEGORY_TERMS):
        return GENERIC
    for profile, terms in PROFILE_MATCHERS:
        if any(f" {_fold(term)} " in padded_title for term in terms):
            return profile
    if category_profile is not None:
        return category_profile
    return GENERIC


def contextual_key(key: str, row: dict[str, Any], profile: SpecificationProfile) -> str:
    value_and_unit = _fold(f"{row.get('value_raw')} {row.get('unit')}")
    drilling_profiles = {ROTARY_HAMMER.key, DRILL_DRIVER.key}
    impact_profiles = {ROTARY_HAMMER.key, DEMOLITION_HAMMER.key}
    electric_motor_profiles = {
        ROTARY_HAMMER.key,
        DEMOLITION_HAMMER.key,
        DRILL_DRIVER.key,
        ANGLE_GRINDER.key,
        SAW.key,
        CIRCULAR_SAW.key,
        JIGSAW.key,
        MITER_SAW.key,
        CUT_OFF_SAW.key,
        TABLE_SAW.key,
        SANDER.key,
        POLISHER.key,
        NAILER.key,
        POWERED_RATCHET.key,
        AIR_COMPRESSOR.key,
        PRESSURE_WASHER.key,
        VACUUM.key,
        HEAT_GUN.key,
        PUMP.key,
        WATER_PUMP.key,
        SPRAYER.key,
        FLUID_TRANSFER_PUMP.key,
    }
    if key in {"energie_impact", "impact_force"} and profile.key in impact_profiles and re.search(r"\d\s*j(?:\s|$)", value_and_unit):
        return "impact_energy"
    if key in {"capacitate_de_gaurire", "capacity"} and profile.key in drilling_profiles:
        return "max_drilling_capacity"
    if key == "capacity" and profile.key == BATTERY.key and re.search(r"\d\s*ah(?:\s|$)", value_and_unit):
        return "battery_capacity"
    if key == "concrete" and profile.key in drilling_profiles:
        return "max_drilling_diameter_concrete"
    if key == "steel" and profile.key in drilling_profiles:
        return "max_drilling_diameter_steel"
    if key == "wood" and profile.key in drilling_profiles:
        return "max_drilling_diameter_wood"
    if key == "prindere" and profile.key in {ROTARY_HAMMER.key, DEMOLITION_HAMMER.key, DRILL_DRIVER.key}:
        return "tool_holder"
    if key == "mandrina" and profile.key == DRILL_DRIVER.key:
        return "chuck_capacity" if "mm" in value_and_unit.split() else "chuck_type"
    if key == "cuplu_de_strangere" and profile.key in {DRILL_DRIVER.key, IMPACT_WRENCH.key}:
        return "max_torque"
    if key == "breakaway_torque" and profile.key == IMPACT_WRENCH.key:
        return "nut_busting_torque"
    if key == "free_speed" and profile.key in {IMPACT_WRENCH.key, POWERED_RATCHET.key}:
        return "no_load_speed"
    if key == "power" and profile.key in electric_motor_profiles and re.search(r"\d\s*k?w(?:\s|$)", value_and_unit):
        return "input_power"
    return key


BATTERY_SPEC_KEYS = frozenset({
    "battery_capacity",
    "battery_type",
    "battery_voltage",
    "charging_time",
    "charge_volts",
    "charging_voltage",
})

CORDED_SPEC_KEYS = frozenset({
    "frequency",
    "input_power",
    "rated_frequency",
})

PNEUMATIC_CAPABLE_PROFILES = frozenset({
    DEMOLITION_HAMMER.key,
    IMPACT_WRENCH.key,
    NAILER.key,
    POWERED_RATCHET.key,
})


def semantic_decision(
    profile: SpecificationProfile,
    key: str,
    *,
    known_industry_key: bool,
    power_sources: frozenset[str] = frozenset(),
) -> tuple[str, str]:
    if key in METADATA_KEYS:
        return "rejected", "Variant or feature metadata; this is not a technical product specification."
    if key in RELATIONSHIP_KEYS:
        return "rejected", "Package contents or a product relationship; manage this separately from technical specifications."
    known_sources = power_sources - {"other", "unspecified"}
    if key in BATTERY_SPEC_KEYS and known_sources - {"cordless_battery"}:
        return "conditional", "Power-source-specific parameter; it belongs only to battery-powered models in this functional profile."
    if key in CORDED_SPEC_KEYS and "cordless_battery" in known_sources:
        return "conditional", "Power-source-specific parameter; it belongs to mains-powered models and is not required for battery-powered variants."
    if profile.key in PNEUMATIC_CAPABLE_PROFILES and key in PNEUMATIC_INPUT_KEYS and known_sources - {"pneumatic"}:
        return "conditional", "Power-source-specific parameter; it belongs only to pneumatic models in this functional profile."
    if key in profile.aligned_keys:
        return "aligned", f"Standard technical parameter for the “{profile.label_ro}” product profile."
    if key in profile.conditional_keys:
        if profile.key == ROTARY_HAMMER.key and key in {"max_drilling_diameter_steel", "max_drilling_diameter_wood"}:
            material = "steel" if key.endswith("steel") else "wood"
            return "conditional", f"Valid as the maximum drilling diameter in {material} only for models with a rotation-only mode."
        return "conditional", f"Valid only when a model in the “{profile.label_ro}” profile explicitly declares this capability."
    if profile.key == GENERIC.key and known_industry_key:
        return "conditional", "Standard technical key; keep it only for products that explicitly declare the value."
    if known_industry_key:
        return "rejected", f"Valid technical key in another context, but not aligned with the “{profile.label_ro}” product profile."
    return "rejected", f"Non-standard or ambiguous specification name for the “{profile.label_ro}” product profile."
