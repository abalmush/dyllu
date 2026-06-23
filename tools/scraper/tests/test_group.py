import pytest
from group import extract_dimension, compute_group_key, group_products


def test_extract_dimension_metric_triple():
    assert extract_dimension("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351") == "125*1.0*22.2mm"


def test_extract_dimension_simple_mm():
    assert extract_dimension("Polizor unghiular 115mm DYLLU DAG1151") == "115mm"


def test_extract_dimension_voltage():
    assert extract_dimension("Bormasina cu acumulator 18V DYLLU DCD1182") == "18V"


def test_extract_dimension_capacity():
    assert extract_dimension("Acumulator 4Ah DYLLU DAB4182") == "4Ah"


def test_extract_dimension_none_when_no_match():
    assert extract_dimension("Set pensule artistice 10buc. DYLLU DTXA1K10") is None


def test_compute_group_key_strips_dimension_and_sku():
    key = compute_group_key("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351")
    assert "125" not in key
    assert "dtac1351" not in key
    assert "disc" in key


def test_compute_group_key_same_for_same_product_family():
    key1 = compute_group_key("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351")
    key2 = compute_group_key("Disc pentru taiat metal 115*1.0*22.2mm DYLLU DTAC1150")
    assert key1 == key2


def _make_product(name: str, sku: str, price: float, cat: str, i: int) -> dict:
    return {
        "id": sku.lower(), "name": name, "sku": sku, "price_mdl": price,
        "image_url": f"https://example.com/{i}.webp",
        "source_url": f"https://example.com/{i}/",
        "description": None, "category_path": [cat], "status": "scraped",
    }


def test_group_products_merges_same_family():
    products = [
        _make_product("Disc pentru taiat metal 125*1.0*22.2mm DYLLU DTAC1351", "DTAC1351", 10, "Discuri pe metal", 1),
        _make_product("Disc pentru taiat metal 115*1.0*22.2mm DYLLU DTAC1150", "DTAC1150", 9, "Discuri pe metal", 2),
        _make_product("Disc pentru taiat metal 230*2.0*22.2mm DYLLU DTAC2301", "DTAC2301", 15, "Discuri pe metal", 3),
    ]
    groups = group_products(products)
    assert len(groups) == 1
    assert len(groups[0]["variants"]) == 3


def test_group_products_high_confidence_for_three_variants():
    products = [
        _make_product(f"Polizor 1{i}5mm DYLLU DAG{i}", f"DAG{i}", 100, "Polizoare", i)
        for i in range(3)
    ]
    groups = group_products(products)
    assert groups[0]["confidence"] == "high"


def test_group_products_medium_confidence_for_two_variants():
    products = [
        _make_product("Disc 125mm DYLLU DTAC1351", "DTAC1351", 10, "Discuri", 1),
        _make_product("Disc 115mm DYLLU DTAC1150", "DTAC1150", 9, "Discuri", 2),
    ]
    groups = group_products(products)
    assert groups[0]["confidence"] == "medium"


def test_group_products_singleton_for_no_match():
    products = [_make_product("Set pensule DYLLU DTXA1K10", "DTXA1K10", 60, "Perii", 1)]
    groups = group_products(products)
    assert groups[0]["confidence"] == "singleton"
    assert len(groups[0]["variants"]) == 1


def test_group_products_preserves_approval_from_existing():
    products = [_make_product("Disc 125mm DYLLU DTAC1351", "DTAC1351", 10, "Discuri", 1)]
    existing = [{
        "group_id": "abc", "group_name": "Disc DYLLU", "category_path": ["Discuri"],
        "auto_grouped": False, "confidence": "singleton", "approved": True,
        "variants": [{"sku": "DTAC1351", "size": "125mm", "price_mdl": 10,
                      "image_url": "a.webp", "source_url": "https://example.com/1/", "description": None}],
    }]
    groups = group_products(products, existing_approvals=existing)
    assert groups[0]["approved"] is True
