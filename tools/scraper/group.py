import hashlib
import re


VARIANT_PATTERNS = [
    r"\d+[*×x]\d+(?:[.,]\d+)?[*×x]\d+(?:[.,]\d+)?mm",
    r"\d+(?:[.,]\d+)?mm",
    r"M\d+(?:[*×x]\d+(?:[.,]\d+)?)?",
    r"\d+(?:[.,]\d+)?\s*[Vv](?:\b|$)",
    r"\d+(?:[.,]\d+)?\s*[Ww](?:\b|$)",
    r"\d+(?:[.,]\d+)?\s*[Aa]h",
    r"\d+(?:[.,]\d+)?\s*[Ll](?:\b|$)",
]


def extract_dimension(name: str) -> str | None:
    for pattern in VARIANT_PATTERNS:
        m = re.search(pattern, name, re.IGNORECASE)
        if m:
            return m.group(0)
    return None


def compute_group_key(name: str) -> str:
    result = name
    for pattern in VARIANT_PATTERNS:
        result = re.sub(pattern, " ", result, flags=re.IGNORECASE)
    result = re.sub(r"\bDYLLU\s+[A-Z][A-Z0-9]+\b", " ", result)
    return re.sub(r"\s+", " ", result).strip().lower()


def _score_confidence(variants: list[dict]) -> str:
    if len(variants) == 1:
        return "singleton"
    sizes_found = sum(1 for v in variants if v.get("size"))
    if len(variants) >= 3 and sizes_found >= 2:
        return "high"
    if len(variants) >= 2 and sizes_found >= 1:
        return "medium"
    return "low"


def _make_variant(product: dict) -> dict:
    return {
        "sku": product.get("sku"),
        "size": extract_dimension(product.get("name", "")),
        "price_mdl": product.get("price_mdl"),
        "image_url": product.get("image_url"),
        "source_url": product.get("source_url"),
        "description": product.get("description"),
    }


def _derive_group_name(products: list[dict]) -> str:
    name = products[0]["name"] if products else ""
    for pattern in VARIANT_PATTERNS:
        name = re.sub(pattern, "", name, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", name).strip()


def group_products(products: list[dict], existing_approvals: list[dict] | None = None) -> list[dict]:
    approved_skus: set[str] = set()
    if existing_approvals:
        for g in existing_approvals:
            if g.get("approved"):
                for v in g.get("variants", []):
                    if v.get("sku"):
                        approved_skus.add(v["sku"])

    buckets: dict[str, list[dict]] = {}
    for product in products:
        key = compute_group_key(product["name"])
        cat = (product.get("category_path") or [""])[0]
        buckets.setdefault(f"{cat}::{key}", []).append(product)

    groups = []
    for bucket_key, bucket_products in buckets.items():
        cat = bucket_key.split("::")[0]
        variants = [_make_variant(p) for p in bucket_products]
        confidence = _score_confidence(variants)
        gid = hashlib.md5(bucket_key.encode()).hexdigest()[:12]
        approved = confidence == "high" or any(
            v.get("sku") in approved_skus for v in variants
        )
        groups.append({
            "group_id": gid,
            "group_name": _derive_group_name(bucket_products),
            "category_path": bucket_products[0].get("category_path") or [cat],
            "auto_grouped": len(variants) > 1,
            "confidence": confidence,
            "approved": approved,
            "variants": variants,
        })

    return groups
