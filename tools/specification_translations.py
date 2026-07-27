"""Add reviewable Romanian labels and search terms to canonical specifications.

Trusted dictionary labels are never overwritten. Common commerce and power-tool
terms use a curated domain glossary. Remaining source labels are translated in
batches and explicitly marked for review; canonical-key approval is independent
from translation confidence.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import ssl
import time
import unicodedata
import urllib.parse
import urllib.request
from collections.abc import Callable, Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import certifi


TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"
BATCH_SIZE = 35

# Concise customer-facing labels. The most important power-tool terminology
# follows Romanian manufacturer usage rather than literal word-by-word output.
DOMAIN_LABELS: dict[str, str] = {
    "ac_current": "Curent alternativ",
    "ac_voltage": "Tensiune alternativă",
    "adjustable_height": "Înălțime reglabilă",
    "air_consumption": "Consum de aer",
    "air_flow": "Debit de aer",
    "air_inlet": "Racord de aer",
    "air_pressure": "Presiune aer",
    "airflow": "Debit de aer",
    "anchor_quantity": "Număr de ancore",
    "anchor_size": "Dimensiune ancoră",
    "approx_weight": "Greutate aproximativă",
    "approx_wt": "Greutate aproximativă",
    "arbor": "Alezaj",
    "base_size": "Dimensiune bază",
    "battery_capacity": "Capacitatea acumulatorului",
    "battery_type": "Tip acumulator",
    "bearing": "Rulment",
    "blade_diameter": "Diametru lamă",
    "blade_length": "Lungime lamă",
    "blade_material": "Material lamă",
    "blade_size": "Dimensiune lamă",
    "blade_thickness": "Grosime lamă",
    "blade_width": "Lățime lamă",
    "bolt_diameter": "Diametru șurub",
    "bracket_dimensions": "Dimensiuni suport",
    "cable_length": "Lungime cablu",
    "capacity": "Capacitate",
    "capacity_load_capacity_per_pair": "Capacitate de încărcare per pereche",
    "chain_speed": "Viteză lanț",
    "charge_volts": "Tensiune de încărcare",
    "charging_time": "Timp de încărcare",
    "charging_voltage": "Tensiune de încărcare",
    "chuck_capacity": "Capacitate mandrină",
    "clamp_size": "Deschidere clemă",
    "color": "Culoare",
    "color_temp_k": "Temperatură de culoare",
    "close_size": "Dimensiuni în stare pliată",
    "connection_type": "Tip conexiune",
    "container_capacity": "Capacitate recipient",
    "cord_color": "Culoare cablu",
    "current": "Curent",
    "cutting_capacity": "Capacitate de tăiere",
    "cutting_depth": "Adâncime de tăiere",
    "cutting_height": "Înălțime de tăiere",
    "cutting_width": "Lățime de tăiere",
    "dc_current": "Curent continuu",
    "dc_output": "Ieșire curent continuu",
    "dc_voltage": "Tensiune continuă",
    "dimensions": "Dimensiuni",
    "display": "Afișaj",
    "disc_diameter": "Diametru disc",
    "drive_size": "Dimensiune antrenare",
    "drive_type": "Tip antrenare",
    "dry_weight": "Greutate fără accesorii",
    "duty_cycle": "Ciclu de funcționare",
    "effective_length": "Lungime utilă",
    "engine_idle_speed": "Turație motor la ralanti",
    "engine_power": "Putere motor",
    "engine_type": "Tip motor",
    "external_diameter": "Diametru exterior",
    "flow_rate": "Debit",
    "frame_material": "Material cadru",
    "frame_surface_finish": "Finisaj cadru",
    "frame_thickness": "Grosime cadru",
    "frequency": "Frecvență",
    "frequency_hz": "Frecvență",
    "frecventa_impact": "Frecvență percuții",
    "fuel_consumption": "Consum de combustibil",
    "fuel_tank": "Rezervor combustibil",
    "fuel_tank_capacity": "Capacitate rezervor combustibil",
    "handle_material": "Material mâner",
    "height": "Înălțime",
    "hole_size": "Dimensiune gaură",
    "hole_spacing": "Distanță între găuri",
    "impact_energy": "Energie de percuție",
    "impact_rate": "Frecvență percuții",
    "input_power": "Putere absorbită",
    "input_voltage": "Tensiune de intrare",
    "input_voltage_v": "Tensiune de intrare",
    "inner_diameter": "Diametru interior",
    "jaw_width": "Lățime fălci",
    "laser_type": "Tip laser",
    "length": "Lungime",
    "length_width": "Lungime × lățime",
    "lifting_height": "Înălțime de ridicare",
    "lifting_range": "Interval de ridicare",
    "load": "Sarcină",
    "load_capacity": "Capacitate de încărcare",
    "luminous_flux": "Flux luminos",
    "material": "Material",
    "max_air_flow": "Debit maxim de aer",
    "max_clamping_diameter": "Diametru maxim de prindere",
    "max_clamping_force": "Forță maximă de strângere",
    "max_cutting_diameter": "Diametru maxim de tăiere",
    "max_cutting_length": "Lungime maximă de tăiere",
    "max_cutting_thickness": "Grosime maximă de tăiere",
    "max_drilling_capacity": "Capacitate maximă de găurire",
    "max_flow": "Debit maxim",
    "max_height": "Înălțime maximă",
    "max_head": "Înălțime maximă de pompare",
    "max_impact_rate": "Frecvență maximă a percuțiilor",
    "max_load": "Sarcină maximă",
    "max_output": "Putere maximă",
    "max_output_current": "Curent maxim de ieșire",
    "max_pressure": "Presiune maximă",
    "max_speed": "Turație maximă",
    "max_suction": "Putere maximă de aspirare",
    "max_suction_head": "Înălțime maximă de aspirație",
    "max_torque": "Cuplu maxim",
    "max_viscosity": "Vâscozitate maximă",
    "max_weight": "Greutate maximă",
    "max_work_height": "Înălțime maximă de lucru",
    "measuring_range": "Domeniu de măsurare",
    "min_height": "Înălțime minimă",
    "motor_power": "Putere motor",
    "motor": "Motor",
    "mounting_height": "Înălțime de montare",
    "net_weight": "Greutate netă",
    "no_load_speed": "Turație la mersul în gol",
    "no_load_voltage": "Tensiune la mersul în gol",
    "noise": "Nivel de zgomot",
    "number_of_steps": "Număr de trepte",
    "number_of_teeth": "Număr de dinți",
    "nut_type": "Tip piuliță",
    "open_size": "Dimensiuni în stare deschisă",
    "operating_pressure": "Presiune de lucru",
    "operating_temperature": "Temperatură de funcționare",
    "outer_diameter": "Diametru exterior",
    "output_current": "Curent de ieșire",
    "output_power": "Putere de ieșire",
    "pack_size": "Cantitate per pachet",
    "package_size": "Dimensiune ambalaj",
    "phase": "Număr de faze",
    "pipe_diameter": "Diametru țeavă",
    "plate_size": "Dimensiune placă",
    "power": "Putere",
    "power_supply": "Alimentare",
    "product_size": "Dimensiuni produs",
    "product_weight": "Greutate produs",
    "profile": "Profil",
    "protection_level": "Grad de protecție",
    "quantity": "Cantitate",
    "rated_current": "Curent nominal",
    "rated_frequency": "Frecvență nominală",
    "rated_output": "Putere nominală de ieșire",
    "rated_power": "Putere nominală",
    "rated_speed": "Turație nominală",
    "rated_voltage": "Tensiune nominală",
    "rate_current": "Curent nominal",
    "rate_voltage": "Tensiune nominală",
    "rpm": "Turație",
    "safety_class": "Clasă de protecție",
    "screw_diameter": "Diametru șurub",
    "screw_drive": "Antrenare șurub",
    "screw_drive_type": "Tip antrenare șurub",
    "screw_head": "Cap șurub",
    "screw_head_diameter": "Diametru cap șurub",
    "screw_head_drive": "Antrenare cap șurub",
    "screw_head_type": "Tip cap șurub",
    "screw_length": "Lungime șurub",
    "screw_quantity": "Număr de șuruburi",
    "screw_size": "Dimensiune șurub",
    "screw_type": "Tip șurub",
    "shank": "Coadă",
    "shank_dia": "Diametru coadă",
    "shank_type": "Tip coadă",
    "size": "Mărime",
    "sleeve_diameter": "Diametru manșon",
    "sleeve_length": "Lungime manșon",
    "socket_material": "Material cap tubular",
    "socket_size": "Dimensiune cap tubular",
    "square_drive": "Antrenare pătrată",
    "starting_system": "Sistem de pornire",
    "steel_thickness": "Grosime oțel",
    "steps": "Număr de trepte",
    "step_rise": "Înălțime treaptă",
    "stroke": "Cursă",
    "surface_treatment": "Tratament de suprafață",
    "tank": "Rezervor",
    "temperature": "Temperatură",
    "test_voltage": "Tensiune de testare",
    "thread_dia": "Diametru filet",
    "thread_length": "Lungime filet",
    "thread_per_inch": "Filete pe inch",
    "thickness": "Grosime",
    "tip_size": "Dimensiune vârf",
    "top_plate_size": "Dimensiune placă superioară",
    "total_length": "Lungime totală",
    "torque_settings": "Trepte de cuplu",
    "travel_speed": "Viteză de deplasare",
    "type": "Tip",
    "vacuum_pressure": "Presiune de vacuum",
    "vibrating_amplitude": "Amplitudine vibrații",
    "vibrating_frequency": "Frecvență vibrații",
    "voltage": "Tensiune",
    "volume": "Volum",
    "washer_type": "Tip șaibă",
    "water_capacity_l": "Capacitate apă",
    "weight": "Greutate",
    "wheel_diameter": "Diametru roată",
    "wheel_material": "Material roată",
    "wheel_size": "Dimensiune roată",
    "wheel_width": "Lățime roată",
    "width": "Lățime",
    "wire_dia": "Diametru fir",
    "wire_length": "Lungime fir",
    "working_length": "Lungime de lucru",
    "working_load_limit": "Sarcină maximă de lucru",
    "working_pressure": "Presiune de lucru",
    "weave": "Densitate țesătură",
    "break_circuit": "Capacitate de rupere",
    "break_property": "Curbă de declanșare",
    "diamond_height": "Înălțime segment diamantat",
    "fancy_bracket": "Formă suport",
    "fixed_rail_height": "Înălțime șină DIN",
}

SEO_SYNONYMS: dict[str, list[str]] = {
    "battery_capacity": ["capacitate acumulator", "capacitate baterie", "Ah", "amperi-oră"],
    "engine_power": ["putere motor", "putere utilaj", "W", "kW", "CP"],
    "impact_energy": ["energie percuție", "forță percuție", "J"],
    "input_power": ["putere absorbită", "putere motor", "consum", "W"],
    "luminous_flux": ["flux luminos", "luminozitate", "lumeni", "lm"],
    "max_pressure": ["presiune maximă", "bar", "psi"],
    "max_torque": ["cuplu maxim", "forță de strângere", "Nm"],
    "motor_power": ["putere motor", "putere utilaj", "W", "kW", "CP"],
    "no_load_speed": ["turație în gol", "viteză în gol", "RPM", "rotații pe minut"],
    "output_power": ["putere de ieșire", "putere utilă", "W", "kW"],
    "power": ["putere", "putere motor", "W", "kW", "CP"],
    "rated_power": ["putere nominală", "putere motor", "W", "kW"],
    "rated_speed": ["turație nominală", "RPM", "rotații pe minut"],
    "voltage": ["tensiune", "voltaj", "V", "tensiune acumulator"],
}


def _ascii_fold(value: str) -> str:
    return "".join(
        character
        for character in unicodedata.normalize("NFKD", value)
        if not unicodedata.combining(character)
    )


def _clean_label(value: str) -> str:
    value = re.sub(r"\s+", " ", value).strip(" .")
    if not value:
        return value
    return value[0].upper() + value[1:]


def search_terms_for(key: str, label: str) -> list[str]:
    terms = [label, _ascii_fold(label), *SEO_SYNONYMS.get(key, [])]
    result: list[str] = []
    seen: set[str] = set()
    for term in terms:
        normalized = term.strip()
        marker = normalized.casefold()
        if normalized and marker not in seen:
            result.append(normalized)
            seen.add(marker)
    return result


def google_translate_batch(labels: list[str]) -> list[str]:
    if not labels:
        return []
    query = "\n".join(labels)
    params = urllib.parse.urlencode(
        {"client": "gtx", "sl": "auto", "tl": "ro", "dt": "t", "q": query}
    )
    request = urllib.request.Request(
        f"{TRANSLATE_URL}?{params}",
        headers={"User-Agent": "catalog-admin-spec-translations/1.0"},
    )
    ssl_context = ssl.create_default_context(cafile=certifi.where())
    with urllib.request.urlopen(request, timeout=20, context=ssl_context) as response:
        payload = json.load(response)
    combined = "".join(segment[0] for segment in payload[0] if segment and segment[0])
    translated = combined.splitlines()
    if len(translated) != len(labels):
        raise RuntimeError(
            f"Translation service returned {len(translated)} lines for {len(labels)} labels"
        )
    return [_clean_label(value) for value in translated]


def _chunks(values: list[Any], size: int) -> Iterable[list[Any]]:
    for offset in range(0, len(values), size):
        yield values[offset : offset + size]


def build_translation_plan(
    rows: list[sqlite3.Row],
    translate_batch: Callable[[list[str]], list[str]],
) -> list[dict[str, Any]]:
    plan: list[dict[str, Any]] = []
    fallback_rows: list[sqlite3.Row] = []
    for row in rows:
        existing = (row["label_ro"] or "").strip()
        source = row["label_ro_source"]
        if existing and source == "manual":
            plan.append(
                {
                    "key": row["key"],
                    "label": existing,
                    "source": source,
                    "confidence": row["label_ro_confidence"] or "approved",
                }
            )
        elif row["key"] in DOMAIN_LABELS:
            plan.append(
                {
                    "key": row["key"],
                    "label": DOMAIN_LABELS[row["key"]],
                    "source": "domain_glossary",
                    "confidence": "high",
                }
            )
        elif existing and (source is None or source == "trusted_dictionary"):
            plan.append(
                {
                    "key": row["key"],
                    "label": existing,
                    "source": source or "trusted_dictionary",
                    "confidence": row["label_ro_confidence"] or "approved",
                }
            )
        elif existing:
            plan.append(
                {
                    "key": row["key"],
                    "label": existing,
                    "source": source,
                    "confidence": row["label_ro_confidence"] or "review",
                }
            )
        else:
            fallback_rows.append(row)

    for chunk in _chunks(fallback_rows, BATCH_SIZE):
        labels = translate_batch([row["label_en"] for row in chunk])
        if len(labels) != len(chunk):
            raise RuntimeError("Translator returned a different number of labels")
        for row, label in zip(chunk, labels, strict=True):
            if not label:
                raise RuntimeError(f"Empty Romanian label returned for {row['key']}")
            plan.append(
                {
                    "key": row["key"],
                    "label": label,
                    "source": "machine_translation",
                    "confidence": "review",
                }
            )
        time.sleep(0.1)
    return sorted(plan, key=lambda item: item["key"])


def _ensure_columns(conn: sqlite3.Connection) -> None:
    columns = {row[1] for row in conn.execute("PRAGMA table_info(spec_canonical_key)")}
    additions = {
        "label_ro_source": "TEXT",
        "label_ro_confidence": "TEXT",
        "search_terms_ro": "TEXT NOT NULL DEFAULT '[]'",
    }
    for column, definition in additions.items():
        if column not in columns:
            conn.execute(f"ALTER TABLE spec_canonical_key ADD COLUMN {column} {definition}")


def _backup_database(conn: sqlite3.Connection, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    backup_path = backup_dir / f"catalog-before-spec-translations-{timestamp}.db"
    destination = sqlite3.connect(backup_path)
    try:
        conn.backup(destination)
    finally:
        destination.close()
    return backup_path


def apply_translations(
    db_path: str | Path,
    *,
    backup_dir: str | Path | None = None,
    translate_batch: Callable[[list[str]], list[str]] = google_translate_batch,
) -> dict[str, Any]:
    database_path = Path(db_path)
    conn = sqlite3.connect(database_path, timeout=20)
    conn.row_factory = sqlite3.Row
    backup_path = _backup_database(
        conn, Path(backup_dir) if backup_dir else database_path.parent / "backups"
    )
    try:
        _ensure_columns(conn)
        rows = conn.execute(
            "SELECT key,label_en,label_ro,label_ro_source,label_ro_confidence "
            "FROM spec_canonical_key ORDER BY key"
        ).fetchall()
        plan = build_translation_plan(rows, translate_batch)
        now = datetime.now(UTC).isoformat()
        conn.execute("BEGIN IMMEDIATE")
        for item in plan:
            conn.execute(
                "UPDATE spec_canonical_key SET label_ro=?,label_ro_source=?,"
                "label_ro_confidence=?,search_terms_ro=?,updated_at=? WHERE key=?",
                (
                    item["label"],
                    item["source"],
                    item["confidence"],
                    json.dumps(
                        search_terms_for(item["key"], item["label"]), ensure_ascii=False
                    ),
                    now,
                    item["key"],
                ),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    source_counts: dict[str, int] = {}
    confidence_counts: dict[str, int] = {}
    for item in plan:
        source_counts[item["source"]] = source_counts.get(item["source"], 0) + 1
        confidence_counts[item["confidence"]] = confidence_counts.get(item["confidence"], 0) + 1
    return {
        "translated_keys": len(plan),
        "missing_labels": sum(not item["label"] for item in plan),
        "sources": source_counts,
        "confidence": confidence_counts,
        "backup_path": str(backup_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("db_path", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--backup-dir", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    if not args.apply:
        parser.error("Translation is an explicit data operation; pass --apply")
    report = apply_translations(args.db_path, backup_dir=args.backup_dir)
    rendered = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")


if __name__ == "__main__":
    main()
