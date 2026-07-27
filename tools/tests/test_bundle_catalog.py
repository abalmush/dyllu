import unittest

from tools.bundle_catalog import parse_catalog_rows, parse_description, summarize_catalog


class ParseDescriptionTests(unittest.TestCase):
    def test_parses_pcs_sets_ocr_quantity_and_sku_whitespace(self):
        parsed = parse_description(
            """Include:
2 Pcs 4.0Ah battery pack(DTLBP540)
1 Set kneepads(DTKP2102)
l Pcs charger (DTFCP502 )
3 Pcs masonry drill bits
Packed by color box"""
        )

        self.assertEqual([2, 1, 1, 3], [item["qty"] for item in parsed["components"]])
        self.assertEqual(["pcs", "set", "pcs", "pcs"], [item["unit"] for item in parsed["components"]])
        self.assertEqual("DTFCP502", parsed["components"][2]["component_sku"])
        self.assertEqual([], parsed["review_notes"])

    def test_splits_inline_x_components(self):
        parsed = parse_description(
            "Include: 1 x safe, 2 x mechanical key,4x expansion bolt\nPacked by color box"
        )

        self.assertEqual(
            [(1, "safe"), (2, "mechanical key"), (4, "expansion bolt")],
            [(item["qty"], item["name"]) for item in parsed["components"]],
        )

    def test_does_not_turn_not_included_into_a_bundle(self):
        parsed = parse_description("Mounting accessories not included\nPacked by label")

        self.assertEqual([], parsed["components"])
        self.assertEqual(["Mounting accessories not included"], parsed["review_notes"])

    def test_captures_quantified_with_item_without_include_marker(self):
        parsed = parse_description("With 1 pcs blade (DTMK1K09)\nAuto-Lock")

        self.assertEqual([], parsed["components"])
        self.assertEqual("DTMK1K09", parsed["included_items"][0]["component_sku"])
        self.assertEqual("included", parsed["included_items"][0]["relationship"])

    def test_uses_product_bundle_hint_for_a_set_without_include_marker(self):
        parsed = parse_description(
            "1 Pcs drill(DRILL1)\n2 Pcs battery(BATT1)",
            bundle_hint=True,
        )

        self.assertEqual(["DRILL1", "BATT1"], [item["component_sku"] for item in parsed["components"]])

    def test_separates_compatibility_from_included_components(self):
        parsed = parse_description("Can be worn on DYLLU tool belt (DTTG1100)")

        self.assertEqual([], parsed["components"])
        self.assertEqual("DTTG1100", parsed["accessories"][0]["target_sku"])
        self.assertEqual("compatible_with", parsed["accessories"][0]["relationship"])

    def test_handles_compact_romanian_bundle_text(self):
        parsed = parse_description(
            "Lumină LED integratăInclude:\n"
            "1 acumulator 1.5Ah (DTLBP515)\n"
            "1 încărcător (DTFCP518)\n"
            "Tensiune de încărcare: 220V\n"
            "Ambalat în cutie colorată"
        )

        self.assertEqual(
            [(1, "DTLBP515"), (1, "DTFCP518")],
            [(item["qty"], item["component_sku"]) for item in parsed["components"]],
        )


class ParseCatalogTests(unittest.TestCase):
    def test_detects_header_classifies_edges_and_preserves_packaging(self):
        rows = [
            ["Table 1"],
            ["Dyllu item No.", "Product name", "Description & Features", "Packed by"],
            ["KIT1", "Kit", "Include:\n1 Pcs tool(TOOL1)\n1 Pcs missing(MISS1)", "Color box"],
            ["TOOL1", "Tool kit", "Include:\n1 Pcs bit", "Blister card"],
        ]

        products = parse_catalog_rows(rows)
        kit = products[0]
        self.assertEqual("color box", kit["packaging"])
        self.assertEqual(["linked", "external"], [item["type"] for item in kit["components"]])
        self.assertTrue(kit["components"][0]["is_sub_bundle"])
        report = summarize_catalog(products)
        self.assertEqual({"MISS1": 1}, report["broken_component_skus"])

    def test_rejects_duplicate_skus(self):
        rows = [
            ["Dyllu item No.", "Product name", "Description & Features", "Packed by"],
            ["A100", "One", "", "Box"],
            ["A100", "Two", "", "Box"],
        ]

        with self.assertRaisesRegex(ValueError, "Duplicate SKU A100"):
            parse_catalog_rows(rows)


if __name__ == "__main__":
    unittest.main()
