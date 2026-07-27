#!/usr/bin/env python3

import argparse
import json
import re
import shutil
import sqlite3
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path


GENERIC = {"", "standard", "cm", "mm", "buc", "pcs", "set", "n/a", "-"}
SPEC_PRIORITY = {
    "capacity": 0,
    "battery_capacity": 0,
    "power": 1,
    "input_power": 1,
    "voltage": 2,
    "length": 3,
    "size": 3,
    "diameter": 3,
    "width": 3,
    "height": 3,
    "material": 4,
    "color": 5,
    "type": 6,
    "working_range": 7,
    "max_torque": 7,
    "tank_capacity": 7,
}


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    value = "".join(char for char in value if not unicodedata.combining(char))
    value = re.sub(r"(?i)(\d)\s+(mm|cm|m|v|w|a|ah|nm|bar|l|kg|g|cc|rpm)\b", r"\1\2", value)
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def clean_value(value: str) -> str:
    value = (value or "").strip()
    value = re.sub(r"\s+", " ", value)
    value = re.sub(r"(?i)(\d)\s*x\s*(\d)", r"\1×\2", value)
    value = re.sub(r"(\d)\s*\*\s*(\d)", r"\1×\2", value)
    value = re.sub(r"(?i)(\d)\s*(mm|cm|m|v|w|a|ah|nm|bar|l|kg|g|cc)\b", lambda match: f"{match.group(1)} {match.group(2).upper() if match.group(2).lower() in {'v', 'w', 'a', 'ah', 'nm'} else match.group(2)}", value)
    replacements = {
        "hand push": "cu împingere",
        "recoil+electric": "pornire manuală și electrică",
        "recoil": "pornire manuală",
        "ball point": "cap sferic",
        "d m14": "filet M14",
        "lacatusi": "pentru lăcătuși",
        "ascutita": "ascuțită",
        "plata": "plată",
        "fierastrau": "ferăstrău",
        "surubelnita": "șurubelnițe standard",
        "zinc alloy body/stainless steel ring/clear glass": "aliaj de zinc, inox și sticlă",
        "Cr-V steel": "oțel Cr-V",
        "ABS, POM, PP plastic": "plastic ABS, POM și PP",
        "fiberglass": "fibră de sticlă",
    }
    for source, target in replacements.items():
        value = re.sub(re.escape(source), target, value, flags=re.IGNORECASE)
    return value.strip(" ,;·-")


def meaningful(value: str, title: str) -> bool:
    key = normalized(value)
    if key in GENERIC or not key:
        return False
    if len(value) > 50 or re.search(r"(?i)planing|deburring|edge honing|descaling|paint stripping|weld seams|pentrul|\b0\s*ah\b|DT[A-Z0-9]{4}", value):
        return False
    title_key = normalized(title)
    return key not in title_key


def candidate_values(row: sqlite3.Row, specs: list[sqlite3.Row], title: str) -> list[str]:
    candidates = []
    for source in (row["variant_val"], row["variant_size"]):
        value = clean_value(source or "")
        if meaningful(value, title):
            candidates.append(value)
    ordered_specs = sorted(
        [spec for spec in specs if (spec["key_norm"] or "") in SPEC_PRIORITY],
        key=lambda spec: (SPEC_PRIORITY.get(spec["key_norm"] or "", 99), spec["position"] or 0),
    )
    for spec in ordered_specs:
        value = clean_value(spec["value_raw"] or "")
        if meaningful(value, title):
            candidates.append(value)
    seen = set()
    return [value for value in candidates if not (normalized(value) in seen or seen.add(normalized(value)))]


def clipped_meta_title(title: str) -> str:
    suffix = " | DYLLU"
    if len(title) + len(suffix) <= 60:
        return title + suffix
    return title[: 60 - len(suffix)].rstrip(" ,;:-") + suffix


def load_rows(connection: sqlite3.Connection):
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT v.sku, v.product_id, v.name_ro, v.value, v.variant_size, v.variant_val,
               p.title_ro, pc.short_description, pc.meta_description
        FROM variant v
        JOIN catalog_availability a ON a.sku = v.sku AND a.available = 1
        JOIN product p ON p.id = v.product_id
        LEFT JOIN product_content pc ON pc.product_id = p.id
        ORDER BY v.sku
        """
    ).fetchall()
    specs = defaultdict(list)
    for spec in connection.execute(
        "SELECT sku, key_norm, label_ro, value_raw, position FROM specification ORDER BY sku, position"
    ).fetchall():
        specs[spec["sku"]].append(spec)
    return rows, specs


def build_changes(rows, specs):
    groups = defaultdict(list)
    for row in rows:
        title = (row["name_ro"] or row["title_ro"] or row["sku"]).strip()
        groups[normalized(title)].append((row, title))
    changes = []
    for entries in groups.values():
        if len(entries) < 2:
            continue
        candidates_by_sku = {
            row["sku"]: candidate_values(row, specs[row["sku"]], title)
            for row, title in entries
        }
        candidate_owners = Counter()
        for candidates in candidates_by_sku.values():
            candidate_owners.update(set(normalized(value) for value in candidates))
        proposals = []
        for row, title in entries:
            candidates = candidates_by_sku[row["sku"]]
            discriminator = next(
                (value for value in candidates if candidate_owners[normalized(value)] == 1),
                candidates[0] if candidates else "",
            )
            proposal = f"{title} {discriminator}".strip()
            proposals.append({"row": row, "oldTitle": title, "newTitle": proposal, "discriminator": discriminator})
        collisions = Counter(normalized(item["newTitle"]) for item in proposals)
        for item in proposals:
            if collisions[normalized(item["newTitle"])] > 1:
                item["newTitle"] = f'{item["newTitle"]} – {item["row"]["sku"]}'
                item["fallback"] = "sku"
            else:
                item["fallback"] = None
            changes.append(
                {
                    "sku": item["row"]["sku"],
                    "productId": item["row"]["product_id"],
                    "oldTitle": item["oldTitle"],
                    "newTitle": item["newTitle"],
                    "discriminator": item["discriminator"] or None,
                    "fallback": item["fallback"],
                    "shortDescription": item["row"]["short_description"] or item["newTitle"],
                    "baseMetaDescription": item["row"]["meta_description"] or "",
                }
            )
    return changes


def apply_changes(connection: sqlite3.Connection, changes):
    now = datetime.now(timezone.utc).isoformat()
    with connection:
        for change in changes:
            connection.execute("UPDATE variant SET name_ro = ? WHERE sku = ?", (change["newTitle"], change["sku"]))
            meta_description = f'{change["newTitle"]}. {change["baseMetaDescription"]}'.strip()
            if len(meta_description) > 160:
                meta_description = meta_description[:157].rstrip(" ,;:-") + "..."
            connection.execute(
                """
                INSERT INTO catalog_variant_content(
                    sku, short_description, meta_title, meta_description, image_alt, source, updated_at
                ) VALUES (?, ?, ?, ?, ?, 'catalog-title-deduplicator', ?)
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
                    change["shortDescription"],
                    clipped_meta_title(change["newTitle"]),
                    meta_description,
                    f'{change["newTitle"]} DYLLU',
                    now,
                ),
            )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    connection = sqlite3.connect(args.database)
    rows, specs = load_rows(connection)
    changes = build_changes(rows, specs)
    backup = None
    if args.apply:
        stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = args.database.parent / "backups" / f"catalog-before-title-dedup-{stamp}.db"
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(args.database, backup)
        apply_changes(connection, changes)
    connection.close()
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "applied": args.apply,
        "backup": str(backup) if backup else None,
        "duplicateGroups": len({normalized(change["oldTitle"]) for change in changes}),
        "changedSkus": len(changes),
        "skuFallbacks": sum(change["fallback"] == "sku" for change in changes),
        "changes": [{key: value for key, value in change.items() if key not in {"shortDescription", "baseMetaDescription"}} for change in changes],
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({key: report[key] for key in ("applied", "duplicateGroups", "changedSkus", "skuFallbacks", "backup")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
