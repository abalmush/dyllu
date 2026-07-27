from catalog_taxonomy import CATEGORIES, SEMANTIC_GATES, classify_product, normalize
import re


def test_taxonomy_has_exactly_two_levels_and_unique_ids() -> None:
    keys = {category.key for category in CATEGORIES}
    assert len(keys) == len(CATEGORIES)
    assert len({category.id for category in CATEGORIES}) == len(CATEGORIES)
    for category in CATEGORIES:
        if category.parent_key:
            assert category.parent_key in keys
            parent = next(item for item in CATEGORIES if item.key == category.parent_key)
            assert parent.parent_key is None

    category_by_id = {category.id: category for category in CATEGORIES}
    assert category_by_id[1900].name_ro == "Electrică"
    assert category_by_id[1900].parent_key is None
    assert category_by_id[1901].parent_key == "power_tools"
    assert category_by_id[1902].parent_key == "power_tools"
    for category_id in (1308, 1903, 1904, 1905, 1906, 1907):
        assert category_by_id[category_id].parent_key == "measuring_electrical"
    assert 2200 not in category_by_id
    assert category_by_id[2201].parent_key == "automotive"
    for category_id in (2202, 2203, 2204):
        assert category_by_id[category_id].parent_key == "household"


def test_classifies_representative_products_by_customer_meaning() -> None:
    cases = {
        "Cordless drill": "drills_drivers",
        "Ciocan rotopercutor cu acumulator": "rotary_demolition_hammers",
        "Wood drill bit set": "drill_bits_hole_saws",
        "Auto-darkening welding helmet": "head_face_hearing",
        "Cordless lawn mower": "lawn_mowers",
        "Hydraulic floor jack": "jacks_lifts_stands",
        "Plastic Tool Box": "tool_boxes_bags",
        "Submersible water pump": "water_pumps",
        "Tile leveling system": "tile_tools",
        "Garden trowel": "garden_hand_tools",
        "Kitchen scissors": "kitchen_tools",
        "Impact socket set": "sockets_ratchets",
        "Insulated screwdriver": "screwdrivers",
        "SDS+ Chisel 250mm": "sds_chisels_accessories",
        "SDS max chisel": "sds_chisels_accessories",
        "Cordless polisher": "polishers",
        "Air impact wrench": "pneumatic_wrenches_ratchets",
        "Air hammer": "pneumatic_hammers",
        "Air brad nailer": "pneumatic_nailers",
        "Drywall Hammer": "hammers_axes_pry",
        "Cordless Drywall Screwdriver 20V": "drills_drivers",
        "Collated drywall screw magazine": "power_tool_accessories",
        "Collated drywall screw": "screws_bolts_anchors",
        "Set freze pentru lemn 8 mm": "power_tool_accessories",
        "Router bit set 12 mm": "power_tool_accessories",
        "Set baton de silicon pentru pistol 150 mm": "power_tool_accessories",
        "Hot glue stick set": "power_tool_accessories",
        "Glue gun 100 W": "glue_guns",
        "Acumulator Li-Ion 20 V 4 Ah": "tool_batteries_chargers",
        "Set biți profesional 62 buc": "screwdrivers",
        "Professional screwdriver bit set": "screwdrivers",
        "Fir nailon pentru motocoasă 3 mm": "power_tool_accessories",
        "Disc de tăiere pentru motocoasă 255 mm": "power_tool_accessories",
        "Șină de ghidaj pentru drujbă 18 inch": "power_tool_accessories",
        "Lanț pentru drujbă 18 inch": "power_tool_accessories",
        "Set coliere pentru furtun 26 buc": "power_tool_accessories",
        "Pistol de vopsit electric 500 W": "electric_paint_sprayers",
        "Cordless tile cutter 20 V": "powered_tile_concrete_tools",
        "Vibrator intern pentru beton cu acumulator": "powered_tile_concrete_tools",
        "Pistol pentru silicon și adeziv 230 mm": "manual_caulk_guns",
        "Aparat de tăiat gresie manual 1200 mm": "manual_tile_tools",
        "Ventuze pentru sticlă și gresie": "manual_tile_tools",
        "Lamă pentru tăiat gresie": "power_tool_accessories",
    }
    for title, expected in cases.items():
        result = classify_product(title, "")
        assert result is not None
        assert result.category_key == expected


def test_does_not_hide_unknown_products_in_a_generic_category() -> None:
    assert classify_product("Unrecognizable catalog object", "") is None


def test_representative_products_pass_semantic_gates() -> None:
    titles = (
        "Auto-darkening welding helmet",
        "Safety gloves",
        "Cordless lawn mower",
        "Submersible water pump",
        "Plastic Tool Box",
        "Tile leveling system",
    )
    for title in titles:
        result = classify_product(title, "")
        assert result is not None
        for pattern, allowed_keys in SEMANTIC_GATES:
            if re.search(pattern, normalize(title)):
                assert result.category_key in allowed_keys
