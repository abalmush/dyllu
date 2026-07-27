#!/usr/bin/env python3

import argparse
import json
import re
import sqlite3
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


PROFILE_CATEGORIES = {
    "accessory": {1102, 1201, 1202, 1203, 1204, 1205, 1206},
    "air_compressor": {1701, 1807},
    "angle_grinder": {1004},
    "battery": {1013},
    "chainsaw": {1401},
    "charger": {1013, 1802},
    "circular_saw": {1006},
    "clamp_vise": {1109},
    "cut_off_saw": {1006},
    "demolition_hammer": {1003},
    "drill_driver": {1001},
    "file_chisel_plane": {1108},
    "fluid_transfer_pump": {1502},
    "generator": {1308},
    "hand_saw": {1107},
    "heat_gun": {1009},
    "impact_wrench": {1002},
    "jigsaw": {1006},
    "lighting": {1905},
    "manual_stapler_riveter": {1113},
    "miter_saw": {1006},
    "nailer": {1010},
    "pliers": {1104},
    "plumbing_hand_tool": {1110},
    "polisher": {1016},
    "powered_ratchet": {1702},
    "pressure_washer": {2201},
    "protective_equipment": {2001, 2002, 2003, 2004, 2005, 2006},
    "rotary_hammer": {1003},
    "rotary_hammer_chisel": {1207},
    "sander": {1005},
    "screwdriver": {1103},
    "socket_ratchet": {1102},
    "sprayer": {1409},
    "storage": {2101, 2102, 2103},
    "threading_tool": {1112},
    "vacuum": {2202},
    "water_pump": {1501},
    "welder": {1601},
    "wrench": {1101},
}

TITLE_RULES = [
    (r"\b(acumulator li-ion|[iî]nc[aă]rc[aă]tor (rapid|usb))", {1013}),
    (r"\b(set )?freze pentru lemn\b", {1206}),
    (r"\bbaton de silicon\b", {1206}),
    (r"\bfir nailon pentru motocoas[aă]\b", {1206}),
    (r"\bdisc de t[aă]iere pentru motocoas[aă]\b", {1206}),
    (r"\bșin[aă] de ghidaj pentru drujb[aă]\b", {1206}),
    (r"\blanț pentru drujb[aă]\b", {1206}),
    (r"\bset coliere pentru furtun\b", {1206}),
    (r"\bpistol de vopsit electric\b", {1017}),
    (r"\b(vibrator intern pentru beton|vibrator cu ventuz[aă] pentru gresie|mașin[aă] de t[aă]iat gresie).*20 v", {1018}),
    (r"\bpistol pentru silicon și adeziv\b", {1114}),
    (r"\b(aparat de t[aă]iat gresie manual|ventuze pentru sticl[aă] și gresie)\b", {1115}),
    (r"\blam[aă] pentru t[aă]iat gresie\b", {1206}),
    (r"\b(drujb|fer[aă]str[aă]u cu lanț|lanț.*drujb)", {1401}),
    (r"\b(motocoas|trimmer|fir nailon)", {1402}),
    (r"mașin[aă].*tuns.*gazon", {1403}),
    (r"\b(pomp[aă].*strop|pulverizator)", {1409}),
    (r"\bnivel[aă]\b|\bnivel[aă] laser\b", {1901}),
    (r"\b(multimetru|tester de tensiune)", {1903}),
    (r"\bpolizor", {1004}),
    (r"\b(ciocan rotopercutor|ciocan demolator)", {1003}),
    (r"\b(mașin[aă] de g[aă]urit|bormașin)", {1001}),
    (r"\b(cheie|șurubelniț[aă]).*impact", {1002}),
    (r"\baparat.*sudur", {1601}),
    (r"\bcompresor de aer", {1701, 1807}),
    (r"\bpomp[aă].*ap[aă]", {1501}),
    (r"\b(aspirator|cur[aă]țat.*abur)", {2202}),
    (r"\bsp[aă]lat.*presiune", {2201}),
    (r"\bm[aă]nuș", {2001}),
    (r"\b(bocanc|[iî]nc[aă]lț[aă]minte)", {2003}),
    (r"\b(ochelari|casc[aă]|antifoane|vizier[aă])", {2004}),
]

SKU_CATEGORY_RULES = {
    "DTBS2602": 1103,
    "DTBS3B36": 1103,
    "DTBS3B62": 1103,
    "DTSS1612": 1103,
    "DTSS8B28": 1103,
}


def normalized(value: str) -> str:
    value = unicodedata.normalize("NFKC", value or "").lower()
    return re.sub(r"\s+", " ", value).strip()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("database", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    connection = sqlite3.connect(args.database)
    connection.row_factory = sqlite3.Row
    rows = connection.execute(
        """
        SELECT v.sku, COALESCE(NULLIF(TRIM(v.name_ro), ''), p.title_ro, v.sku) title,
               COALESCE(v.category_id, p.category_id) category_id, c.path, c.parent_id,
               vp.profile_key, vp.profile_label
        FROM variant v
        JOIN catalog_availability a ON a.sku = v.sku AND a.available = 1
        JOIN product p ON p.id = v.product_id
        JOIN category c ON c.id = COALESCE(v.category_id, p.category_id)
        LEFT JOIN spec_variant_profile vp ON vp.sku = v.sku
        ORDER BY v.sku
        """
    ).fetchall()
    connection.close()
    issues = []
    profile_counts = Counter()
    for row in rows:
        profile = row["profile_key"]
        profile_counts[profile or "missing"] += 1
        if not profile:
            issues.append({"severity": "error", "type": "missing_profile", "sku": row["sku"], "title": row["title"]})
            continue
        allowed = PROFILE_CATEGORIES.get(profile)
        if allowed is not None and row["category_id"] not in allowed:
            issues.append({
                "severity": "error",
                "type": "profile_category_mismatch",
                "sku": row["sku"],
                "title": row["title"],
                "profile": profile,
                "categoryId": row["category_id"],
                "category": row["path"],
                "allowedCategoryIds": sorted(allowed),
            })
        expected_sku_category = SKU_CATEGORY_RULES.get(row["sku"])
        if expected_sku_category is not None and row["category_id"] != expected_sku_category:
            issues.append({
                "severity": "error",
                "type": "sku_category_mismatch",
                "sku": row["sku"],
                "title": row["title"],
                "profile": profile,
                "categoryId": row["category_id"],
                "category": row["path"],
                "expectedCategoryId": expected_sku_category,
            })
            continue
        title = normalized(row["title"])
        if row["parent_id"] == 1000 and re.search(
            r"\b(acumulator li-ion|[iî]nc[aă]rc[aă]tor (rapid|usb)|(set )?freze pentru lemn|baton de silicon)\b",
            title,
            re.IGNORECASE,
        ):
            issues.append({
                "severity": "error",
                "type": "accessory_in_power_tools",
                "sku": row["sku"],
                "title": row["title"],
                "profile": profile,
                "categoryId": row["category_id"],
                "category": row["path"],
            })
            continue
        if profile in {"accessory", "rotary_hammer_chisel", "storage", "socket_ratchet"}:
            continue
        for pattern, expected in TITLE_RULES:
            if re.search(pattern, title, re.IGNORECASE) and row["category_id"] not in expected:
                issues.append({
                    "severity": "error",
                    "type": "title_category_mismatch",
                    "sku": row["sku"],
                    "title": row["title"],
                    "profile": profile,
                    "categoryId": row["category_id"],
                    "category": row["path"],
                    "expectedCategoryIds": sorted(expected),
                    "rule": pattern,
                })
                break
    report = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "checkedSkus": len(rows),
            "errors": len(issues),
            "profileCounts": dict(sorted(profile_counts.items())),
            "genericProfileSkus": profile_counts.get("generic", 0),
        },
        "issues": issues,
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    if issues:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
