"""Repair and audit the sellable catalog before Medusa export."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


Spec = tuple[str, str, str, str | None]


def specs(*rows: Spec) -> list[Spec]:
    return list(rows)


SKU_FIXES: dict[str, dict[str, Any]] = {
    "DTLBP540": {
        "name": "Acumulator Li-Ion 20 V, 4 Ah",
        "description": "Acumulator Li-Ion de 20 V și 4 Ah pentru sculele din platforma P20S, cu indicator LED al nivelului de încărcare.",
        "specs": specs(
            ("battery_voltage", "Tensiune acumulator", "20 V", "V"),
            ("battery_capacity", "Capacitate acumulator", "4 Ah", "Ah"),
            ("battery_type", "Tip acumulator", "Li-Ion", None),
        ),
    },
    "DTXN2918": {
        "name": "Pistol de stropit cu cuplaj rapid",
        "description": "Pistol de stropit cu corp din plastic și cuplaj rapid, compatibil cu aparatele de spălat DYLLU indicate de producător.",
        "specs": specs(
            ("material", "Material", "Plastic", None),
            ("connector_type", "Tip racord", "Cuplaj rapid", None),
        ),
    },
    "DTFD1308": {
        "name": "Vizieră de protecție facială 390 × 200 mm",
        "description": "Vizieră de protecție facială rezistentă la impact, cu ecran de 390 × 200 mm și sistem reglabil de fixare pe cap.",
        "specs": specs(
            ("type", "Tip", "Vizieră de protecție facială", None),
            ("dimensions", "Dimensiuni ecran", "390 × 200 mm", "mm"),
        ),
    },
    "DTHS1M08": {
        "name": "Trusă de scule de mână, 8 piese",
        "description": "Trusă de 8 scule de mână pentru lucrări casnice și întreținere, livrată într-o geantă din material textil.",
        "specs": specs(("quantity", "Număr de piese", "8", None)),
    },
    "DTHS1M28": {
        "name": "Trusă de scule de mână, 28 piese",
        "description": "Trusă de 28 de scule de mână și accesorii pentru reparații uzuale, livrată într-o geantă de 13 inch.",
        "specs": specs(("quantity", "Număr de piese", "28", None)),
    },
    "DTHS3B85": {
        "name": "Trusă de scule de mână, 85 piese",
        "description": "Trusă de 85 de scule de mână, biți și elemente de fixare, organizată într-o cutie rigidă de 16 inch.",
        "specs": specs(("quantity", "Număr de piese", "85", None)),
    },
    "DTPS0603": {
        "name": "Set clești 3 piese, 160–180 mm",
        "description": "Set cu clește combinat de 180 mm, clește cu vârf lung de 160 mm și clește diagonal de 160 mm.",
        "specs": specs(
            ("quantity", "Număr de piese", "3", None),
            ("size", "Dimensiuni", "160 și 180 mm", "mm"),
        ),
    },
    "DTPS0604": {
        "name": "Set clești 4 piese, 160 mm",
        "description": "Set de patru clești de 160 mm pentru prindere și tăiere, cu mânere ergonomice bicolore.",
        "specs": specs(
            ("quantity", "Număr de piese", "4", None),
            ("size", "Dimensiune", "160 mm", "mm"),
        ),
    },
    "DTPS0623": {
        "name": "Set clești 3 piese, 160 mm",
        "description": "Set cu clește combinat, clește cu vârf lung și clește diagonal, fiecare cu lungimea de 160 mm.",
        "specs": specs(
            ("quantity", "Număr de piese", "3", None),
            ("size", "Dimensiune", "160 mm", "mm"),
        ),
    },
    "DTPS1618": {
        "name": "Set mini-clești, 8 piese, 115 mm",
        "description": "Set de opt mini-clești de 115 mm pentru prindere, tăiere și modelare în lucrări de precizie.",
        "specs": specs(
            ("quantity", "Număr de piese", "8", None),
            ("size", "Dimensiune", "115 mm", "mm"),
        ),
    },
    "DTMA9403": {
        "description": "Set de 4 accesorii pentru mașini multifuncționale oscilante, destinat lucrărilor pe plăci ceramice.",
        "specs": specs(("quantity", "Număr de piese", "4", None)),
    },
    "DTMA9417": {
        "description": "Set de 22 de accesorii pentru mașini multifuncționale oscilante, cu lame, racletă, talpă și foi abrazive.",
        "specs": specs(("quantity", "Număr de piese", "22", None)),
    },
    "DTHUAB01": {
        "description": "Set de 26 de coliere metalice pentru furtun, cu strângere prin șurub, organizate într-o cutie de transport.",
        "specs": specs(
            ("quantity", "Număr de piese", "26", None),
            ("material", "Material", "Metal", None),
        ),
    },
    "DTRJ1501": {
        "name": "Semimască respiratorie cu un cartuș filtrant",
        "description": "Semimască respiratorie reutilizabilă cu un cartuș filtrant, pentru lucrări agricole, forestiere și industriale.",
        "specs": specs(
            ("type", "Tip", "Semimască respiratorie", None),
            ("filter_count", "Număr de cartușe filtrante", "1", None),
        ),
    },
    "DTRJ2502": {
        "name": "Semimască respiratorie cu două cartușe filtrante",
        "description": "Semimască respiratorie reutilizabilă cu două cartușe filtrante, pentru o rezistență redusă la respirație.",
        "specs": specs(
            ("type", "Tip", "Semimască respiratorie", None),
            ("filter_count", "Număr de cartușe filtrante", "2", None),
        ),
    },
    "DTXZ4001": {
        "name": "Set pentru nivelarea gresiei și faianței, 100 piese",
        "description": "Set de 100 de elemente pentru alinierea uniformă a plăcilor de gresie și faianță în timpul montajului.",
        "specs": specs(("quantity", "Număr de piese", "100", None)),
    },
    "DTXZ5001": {
        "name": "Set pentru nivelarea gresiei și faianței, 50 piese",
        "description": "Set de 50 de elemente pentru nivelarea plăcilor ceramice, cu unealtă de reglare de 150 mm.",
        "specs": specs(
            ("quantity", "Număr de piese", "50", None),
            ("length", "Lungime unealtă", "150 mm", "mm"),
        ),
    },
    "DTBV1A02": {
        "specs": specs(("jaw_width", "Lățime fălci", "50 mm", "mm")),
    },
    "DTQR23102": {"specs": specs(("diameter", "Diametru", "102 mm", "mm"))},
    "DTQR23122": {"specs": specs(("diameter", "Diametru", "122 mm", "mm"))},
    "DTRKSR0106": {"specs": specs(("shank_dia", "Diametru coadă", "6 mm", "mm"))},
    "DTRKSR0108": {"specs": specs(("shank_dia", "Diametru coadă", "8 mm", "mm"))},
    "DTRKSR0112": {"specs": specs(("shank_dia", "Diametru coadă", "12 mm", "mm"))},
    "DTXZ1001": {"specs": specs(("joint_width", "Lățime rost", "1 mm", "mm"))},
    "DTXZ1002": {"specs": specs(("joint_width", "Lățime rost", "2 mm", "mm"))},
    "DTXZ1003": {"specs": specs(("joint_width", "Lățime rost", "3 mm", "mm"))},
    "DTXZ1015": {"specs": specs(("joint_width", "Lățime rost", "1,5 mm", "mm"))},
    "DTXZ1025": {"specs": specs(("joint_width", "Lățime rost", "2,5 mm", "mm"))},
    "DTXZ2001": {"specs": specs(("joint_width", "Lățime rost", "1 mm", "mm"))},
    "DTXZ2002": {"specs": specs(("joint_width", "Lățime rost", "2 mm", "mm"))},
    "DTXZ2015": {"specs": specs(("joint_width", "Lățime rost", "1,5 mm", "mm"))},
    "DTXZ3001": {"specs": specs(("joint_width", "Lățime rost", "3 mm", "mm"))},
    "DTME1602": {
        "name": "Unealtă telescopică magnetică 125–635 mm",
        "category": 1803,
        "description": "Unealtă telescopică magnetică din oțel inoxidabil, extensibilă de la 125 la 635 mm, pentru recuperarea pieselor metalice.",
        "specs": specs(
            ("length", "Lungime", "125–635 mm", "mm"),
            ("material", "Material", "Oțel inoxidabil", None),
            ("lifting_capacity", "Forță de ridicare", "2 lb", "lb"),
        ),
    },
    "DTREZ511": {
        "name": "Set nituri oarbe, 320 piese",
        "category": 2301,
        "description": "Set de 320 de nituri oarbe din aluminiu și oțel carbon, în mai multe dimensiuni, pentru îmbinări mecanice.",
        "specs": specs(
            ("quantity", "Număr de piese", "320", None),
            ("material", "Material", "Aluminiu și oțel carbon", None),
        ),
    },
    "DTXQ1A01": {
        "name": "Dispenser manual pentru bandă de ambalare, max. 135 mm",
        "category": 2304,
        "description": "Dispenser manual pentru aplicarea benzii de ambalare, cu frână reglabilă și rolă cu diametrul exterior de până la 135 mm.",
        "specs": specs(
            ("max_roll_diameter", "Diametru maxim rolă", "135 mm", "mm"),
            ("max_cutting_diameter", "Diametru maxim de tăiere", "55 mm", "mm"),
        ),
    },
    "DTVC2B15": {
        "name": "Șubler digital 150 mm",
        "description": "Șubler digital cu domeniu de măsurare 0–150 mm, rezoluție de 0,01 mm și conversie între milimetri și inch.",
    },
    "DTTW2131": {"name": "Mistrie de grădină 310 mm"},
    "DTWK2129": {"name": "Sapă de mână pentru grădină 290 × 100 mm"},
    "DTCSA1522": {"name": "Drujbă electrică 2200 W"},
    "DTEH9A03": {
        "name": "Clemă de masă pentru sudură 300 A, 170 mm",
        "description": "Clemă de masă pentru sudură, curent nominal 300 A, lungime 170 mm și deschidere maximă a fălcilor de 60 mm.",
    },
    "DTAY1A10": {
        "name": "Pompă de vopsit airless 1200 W",
        "category": 1306,
        "description": "Pompă de vopsit airless de 1200 W, cu debit de 1,6 L/min, presiune maximă de 20,7 MPa și furtun de 7,5 m.",
        "specs": specs(
            ("voltage", "Tensiune", "220–240 V, 50/60 Hz", "V"),
            ("input_power", "Putere absorbită", "1200 W", "W"),
            ("max_pressure", "Presiune maximă", "20,7 MPa", "MPa"),
            ("max_flow", "Debit maxim", "1,6 L/min", "L/min"),
            ("hose_length", "Lungime furtun", "7,5 m", "m"),
            ("weight", "Greutate", "11 kg", "kg"),
        ),
    },
    "DTGNAA170Q": {
        "name": "Motor pe benzină 7 CP, 212 cm³",
        "category": 1310,
        "description": "Motor pe benzină în 4 timpi, 7 CP și 212 cm³, cu arbore tip Q, pornire manuală și răcire cu aer.",
        "specs": specs(
            ("engine_type", "Tip motor", "4 timpi, OHV", None),
            ("engine_power", "Putere maximă", "7 CP", "CP"),
            ("displacement", "Cilindree", "212 cm³", "cm³"),
            ("max_torque", "Cuplu maxim", "13,5 N·m", "N·m"),
            ("rated_speed", "Turație nominală", "3600 rpm", "rpm"),
            ("fuel_tank_capacity", "Capacitate rezervor combustibil", "3,6 L", "L"),
        ),
    },
    "DTHL2B15": {
        "name": "Mașină de lustruit cu acumulator 20 V, 150 mm",
        "category": 1016,
        "description": "Mașină de lustruit cu acumulator de 20 V, motor fără perii, disc de 150 mm și turație reglabilă 2000–4500 rpm.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("no_load_speed", "Turație la mersul în gol", "2000–4500 rpm", "rpm"),
            ("polishing_pad_diameter", "Diametru disc de lustruit", "150 mm", "mm"),
        ),
    },
    "DTHL35254": {
        "name": "Mașină de lustruit cu acumulator 20 V, 254 mm",
        "category": 1016,
        "description": "Mașină de lustruit cu acumulator de 20 V, motor fără perii, disc de 254 mm și mișcare excentrică de 5 mm.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("no_load_speed", "Turație la mersul în gol", "2500 rpm", "rpm"),
            ("polishing_pad_diameter", "Diametru disc de lustruit", "254 mm", "mm"),
            ("eccentricity", "Excentricitate", "5 mm", "mm"),
        ),
    },
    "DTMS4212": {
        "name": "Articulație cardanică de impact 1/2″",
        "category": 1102,
        "description": "Articulație cardanică de impact cu antrenare de 1/2 inch și rotație la 360°, realizată din oțel Cr-V 50BV30.",
        "specs": specs(
            ("drive_size", "Dimensiune antrenare", "1/2″", None),
            ("material", "Material", "Cr-V 50BV30", None),
        ),
    },
    "DTSS1612": {
        "name": "Set biți pentru șurubelniță, 12 piese",
        "category": 1103,
        "description": "Set de 12 biți și port-bit din oțel Cr-V, cu profile SL, PH și PZ, pentru lucrări de înșurubare uzuale.",
        "specs": specs(
            ("quantity", "Număr de piese", "12", None),
            ("material", "Material", "Cr-V", None),
            ("shank", "Prindere", "1/4″", None),
        ),
    },
    "DTSS8B28": {
        "name": "Set biți cu mâner cu clichet, 28 piese",
        "category": 1103,
        "description": "Set de 28 de piese cu biți Cr-V, mâner cu clichet și port-bit, pentru profile SL, PH, PZ, Torx și hexagonale.",
        "specs": specs(
            ("quantity", "Număr de piese", "28", None),
            ("material", "Material", "Cr-V", None),
            ("shank", "Prindere", "1/4″", None),
        ),
    },
    "DTBS2602": {"category": 1103},
    "DTBS3B36": {"category": 1103},
    "DTBS3B62": {"category": 1103},
    "DTST1412": {
        "name": "Set capete tubulare cu biți 1/2″, 10 piese",
        "category": 1102,
        "description": "Set de 10 capete tubulare cu biți hexagonali și Torx, din oțel Cr-V, cu antrenare de 1/2 inch.",
        "specs": specs(
            ("quantity", "Număr de piese", "10", None),
            ("drive_size", "Dimensiune antrenare", "1/2″", None),
            ("material", "Material", "Cr-V 50BV30", None),
        ),
    },
    "DTSX8604": {
        "name": "Clește pentru tăiat cabluri 175 mm",
        "category": 1104,
        "description": "Clește robust din oțel inoxidabil pentru cabluri cu diametrul de până la 16 mm, lungime totală 175 mm.",
        "specs": specs(
            ("length", "Lungime", "175 mm", "mm"),
            ("material", "Material", "Oțel inoxidabil", None),
            ("max_cutting_diameter", "Diametru maxim de tăiere", "16 mm", "mm"),
        ),
    },
    "DTTH8316": {"category": 1803},
    "DTWH2501": {
        "name": "Mască de sudură automată DIN 3/11",
        "category": 2004,
        "description": "Mască de sudură cu filtru automat, zonă de vizualizare 90 × 35 mm, doi senzori de arc și protecție UV/IR DIN 16.",
        "specs": specs(
            ("viewing_area", "Zonă de vizualizare", "90 × 35 mm", "mm"),
            ("arc_sensors", "Număr senzori de arc", "2", None),
            ("light_state", "Stare luminoasă", "DIN 3", None),
            ("dark_state", "Stare întunecată", "DIN 11", None),
            ("uv_ir_protection", "Protecție UV/IR", "DIN 16", None),
            ("switching_time", "Timp de comutare", "1/25000 s", "s"),
        ),
    },
    "DTWM1L15": {
        "category": 1503,
        "description": "Aparat de sudură pentru țevi PPR de 800 W, cu temperatură reglabilă 0–300 °C și bacuri de 20, 25 și 32 mm.",
        "specs": specs(
            ("voltage", "Tensiune", "220–240 V, 50/60 Hz", "V"),
            ("rated_power", "Putere nominală", "800 W", "W"),
            ("working_temperature", "Temperatură de lucru", "0–300 °C", "°C"),
            ("welding_diameter", "Diametre de sudură", "20, 25 și 32 mm", "mm"),
        ),
    },
    "DTWM2018": {
        "category": 1503,
        "description": "Aparat de sudură pentru țevi PPR cu acumulator de 20 V, temperatură până la 320 °C și bacuri de 20, 25 și 32 mm.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("working_temperature", "Temperatură de lucru", "0–320 °C", "°C"),
            ("welding_diameter", "Diametre de sudură", "20, 25 și 32 mm", "mm"),
        ),
    },
    "DTTVM1D12": {
        "name": "Vibrator cu ventuză pentru gresie 20 V, 130 mm",
        "category": 1304,
        "description": "Vibrator cu ventuză pentru montarea plăcilor ceramice, alimentat la 20 V, cu ventuză de 130 mm și forță de adsorbție de 50 kg.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("vibration_frequency", "Frecvență vibrații", "0–10000 vib/min", "vib/min"),
            ("suction_cup_diameter", "Diametru ventuză", "130 mm", "mm"),
            ("suction_capacity", "Forță de adsorbție", "50 kg", "kg"),
        ),
    },
    "DTTVM1D185": {
        "name": "Vibrator cu ventuză pentru gresie 20 V, 180 mm",
        "category": 1304,
        "description": "Vibrator cu ventuză pentru montarea plăcilor ceramice, alimentat la 20 V, cu ventuză de 180 mm și forță de adsorbție de 70 kg.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("vibration_frequency", "Frecvență vibrații", "0–6000 vib/min", "vib/min"),
            ("suction_cup_diameter", "Diametru ventuză", "180 mm", "mm"),
            ("suction_capacity", "Forță de adsorbție", "70 kg", "kg"),
        ),
    },
    "DTWB9A06": {
        "name": "Cărucior pliabil 60 kg",
        "category": 2402,
        "description": "Cărucior manual pliabil din oțel, cu sarcină maximă de 60 kg și dimensiuni extinse de 370 × 380 × 960 mm.",
        "specs": specs(
            ("load_capacity", "Sarcină maximă", "60 kg", "kg"),
            ("material", "Material", "Oțel", None),
            ("extended_dimensions", "Dimensiuni extins", "370 × 380 × 960 mm", "mm"),
            ("folded_dimensions", "Dimensiuni pliat", "380 × 55 × 690 mm", "mm"),
            ("wheel_diameter", "Diametru roată", "130 mm", "mm"),
        ),
    },
    "DTWB9A10": {
        "name": "Cărucior pliabil 100 kg",
        "category": 2402,
        "description": "Cărucior manual pliabil din oțel și aluminiu, cu sarcină maximă de 100 kg și dimensiuni extinse de 520 × 485 × 1110 mm.",
        "specs": specs(
            ("load_capacity", "Sarcină maximă", "100 kg", "kg"),
            ("material", "Material", "Oțel și aluminiu", None),
            ("extended_dimensions", "Dimensiuni extins", "520 × 485 × 1110 mm", "mm"),
            ("folded_dimensions", "Dimensiuni pliat", "60 × 485 × 830 mm", "mm"),
            ("wheel_diameter", "Diametru roată", "175 mm", "mm"),
        ),
    },
    "DTCLP5121": {
        "name": "Drujbă cu acumulator 20 V, lamă 30 cm",
        "description": "Drujbă cu acumulator de 20 V, motor fără perii, lamă de 30 cm și viteză a lanțului de 10 m/s.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("bar_length", "Lungime șină", "30 cm", "cm"),
            ("chain_speed", "Viteză lanț", "10 m/s", "m/s"),
        ),
    },
    "DTCLP550": {
        "name": "Mini-ferăstrău cu lanț 20 V, lamă 13 cm",
        "description": "Mini-ferăstrău cu lanț de 20 V, lamă de 13 cm și viteză a lanțului de 5 m/s; acumulatorul și încărcătorul se vând separat.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("bar_length", "Lungime șină", "13 cm", "cm"),
            ("chain_speed", "Viteză lanț", "5 m/s", "m/s"),
        ),
    },
    "DTCLP560": {
        "name": "Mini-ferăstrău cu lanț 20 V, lamă 15 cm",
        "description": "Mini-ferăstrău cu lanț de 20 V, motor fără perii, lamă de 15 cm și viteză a lanțului de 11 m/s.",
        "specs": specs(
            ("voltage", "Tensiune", "20 V", "V"),
            ("bar_length", "Lungime șină", "15 cm", "cm"),
            ("chain_speed", "Viteză lanț", "11 m/s", "m/s"),
        ),
    },
    "DTJH1418": {
        "name": "Șină de ghidaj pentru drujbă, 18″",
        "description": "Șină de ghidaj de 18 inch pentru drujba pe benzină DYLLU DTGC1552.",
        "specs": specs(("bar_length", "Lungime șină", "18″", None)),
    },
    "DTZY1418": {
        "name": "Lanț pentru drujbă, 18″",
        "description": "Lanț de 18 inch compatibil cu drujba pe benzină DYLLU DTGC1552.",
        "specs": specs(("bar_length", "Lungime compatibilă șină", "18″", None)),
    },
    "DTAX1505": {
        "name": "Set accesorii pneumatice, 5 piese",
        "category": 1706,
        "specs": specs(("quantity", "Număr de piese", "5", None)),
    },
    "DTGA2612": {
        "name": "Pistol pneumatic pentru umflat anvelope, 12 bar",
        "category": 1703,
        "description": "Pistol pneumatic pentru umflat anvelope, cu manometru și presiune maximă de 12 bar.",
        "specs": specs(("max_pressure", "Presiune maximă", "12 bar", "bar")),
    },
    "DTGA4611": {
        "name": "Pistol pneumatic de suflat, duză 110 mm",
        "category": 1703,
        "description": "Pistol pneumatic de suflat din plastic, cu duză de 110 mm, pentru curățarea suprafețelor și zonelor greu accesibile.",
        "specs": specs(("nozzle_length", "Lungime duză", "110 mm", "mm")),
    },
    "DTQG1910": {
        "name": "Furtun pneumatic PE 8 mm × 10 m",
        "category": 1703,
        "specs": specs(
            ("material", "Material", "PE", None),
            ("hose_length", "Lungime furtun", "10 m", "m"),
            ("inner_diameter", "Diametru interior", "5 mm", "mm"),
            ("outer_diameter", "Diametru exterior", "8 mm", "mm"),
        ),
    },
    "DTQG1915": {
        "name": "Furtun pneumatic PE 8 mm × 15 m",
        "category": 1703,
        "specs": specs(
            ("material", "Material", "PE", None),
            ("hose_length", "Lungime furtun", "15 m", "m"),
            ("inner_diameter", "Diametru interior", "5 mm", "mm"),
            ("outer_diameter", "Diametru exterior", "8 mm", "mm"),
        ),
    },
    "DTQP3670": {
        "name": "Set cuple rapide pneumatice tip european, 5 piese",
        "category": 1703,
        "specs": specs(
            ("quantity", "Număr de piese", "5", None),
            ("connector_type", "Tip racord", "European", None),
        ),
    },
    "DTXN1304": {"name": "Lance de spumare 550 ml pentru aparat de spălat"},
    "DTXN3915": {"name": "Furtun de înaltă presiune 5 m cu cuplaj rapid"},
    "DTXZ2008": {"name": "Clește pentru sistem de nivelare gresie, 240 mm"},
}


GARDEN_ACCESSORY_SKUS = {
    "DTDLP0501",
    "DTHUAB01",
    "DTJC1401",
    "DTJC1424",
    "DTJC2401",
    "DTJC2402",
    "DTJC2404",
    "DTJC3425",
    "DTJH1418",
    "DTJH1424",
    "DTNG1110",
    "DTNG1121",
    "DTNG1132",
    "DTNG1143",
    "DTNG2120",
    "DTNG2131",
    "DTNG2142",
    "DTNG2153",
    "DTNG3120",
    "DTNG3141",
    "DTZY1418",
    "DTZY1424",
}

CONSTRUCTION_CATEGORY_BY_PRODUCT = {
    "ai1b02363196": 1114,
    "ai2ad1fd01d7": 1115,
    "ai5008e35045": 1206,
    "ai68621b1904": 1018,
    "aia0100191b7": 1018,
    "aia16a63a20c": 1017,
    "aifc93adf4e7": 1115,
    "csvd8c0cc8895ff": 1114,
}

POWER_SUPPLY_FIXES = {
    "DTCD1B1285": ("yes", "yes", "2", "5.0Ah"),
    "DTCD1B33": ("yes", "yes", "2", "2.0Ah"),
    "DTCD1B483": ("yes", "yes", "2", "4.0Ah"),
    "DTCD1B78": ("yes", "yes", "2", "4.0Ah"),
    "DTCD1B785": ("yes", "yes", "2", "4.0Ah"),
    "DTCD2B21": ("yes", "yes", "2", "2.0Ah"),
    "DTCD3B21": ("yes", "yes", "2", "2.0Ah"),
    "DTCDP16281": ("yes", "yes", "2", "4.0Ah"),
    "DTCDP8285": ("yes", "yes", "2", "2.0Ah"),
    "DTCDS520": ("yes", "no", "1", "1.5Ah"),
    "DTCDS540": ("yes", "no", "1", "1.5Ah"),
    "DTLBP540": ("yes", "no", "1", "4.0Ah"),
}

PRODUCT_POWER_SOURCE_FIXES = {
    "aia4bef470d7": "cordless_battery",
    "aic78c87f984": "other",
    "csv4a9a684bc96a": "battery",
    "aie3a5b797a2": "other",
}

PRODUCT_CONTENT_FIXES = {
    "aifbca8b141d": {
        "short_description": "Acumulator Li-Ion de 20 V pentru sculele DYLLU din platforma P20S.",
        "why_good": "Acumulator Li-Ion compatibil cu sculele DYLLU P20S de 20 V, disponibil în capacități diferite pentru echilibrul potrivit între greutate și autonomie.",
        "seo_text": "Acumulatorii DYLLU P20S de 20 V alimentează aceeași gamă de scule compatibile. Alege capacitatea potrivită: un acumulator mai compact pentru greutate redusă sau unul cu capacitate mai mare pentru autonomie extinsă.",
        "highlights": '["Compatibil cu sculele DYLLU P20S de 20 V","Capacități diferite pentru autonomie și greutate","Indicator LED al nivelului de încărcare"]',
        "faq": '[{"q":"Cu ce scule este compatibil?","a":"Cu sculele DYLLU din platforma P20S de 20 V."},{"q":"Cum aleg capacitatea?","a":"Capacitatea mai mare oferă autonomie mai lungă, iar cea mai mică reduce greutatea sculei."},{"q":"Include încărcător?","a":"Nu. Încărcătorul P20S se achiziționează separat dacă nu îl ai deja."}]',
        "keywords": '["acumulator 20V","baterie Li-Ion scule","acumulator P20S","acumulator DYLLU"]',
    },
    "ai7d03e94993": {
        "short_description": "Încărcător DYLLU pentru acumulatorii din platforma compatibilă indicată pe produs.",
        "why_good": "Încărcător dedicat acumulatorilor DYLLU compatibili, cu alimentare controlată pentru siguranță și protejarea duratei de viață a bateriei.",
        "seo_text": "Alege încărcătorul după platforma acumulatorului DYLLU: P20S pentru acumulatorii de 20 V sau încărcător USB compatibil pentru sistemul S12. Tensiunea platformei trebuie să coincidă cu acumulatorul.",
        "highlights": '["Compatibilitate clară după platformă","Încărcare controlată pentru acumulatori Li-Ion","Soluție de rezervă sau înlocuire"]',
        "faq": '[{"q":"Cum verific compatibilitatea?","a":"Compară platforma indicată pe încărcător și acumulator: P20S 20 V sau S12 12 V."},{"q":"Pot folosi un încărcător de altă tensiune?","a":"Nu. Folosește numai încărcătorul recomandat pentru platforma acumulatorului."},{"q":"Este sigur pentru baterie?","a":"Da, când este utilizat cu acumulatorul DYLLU compatibil indicat."}]',
        "keywords": '["încărcător acumulator","încărcător baterie scule","încărcător P20S","încărcător S12","încărcător DYLLU"]',
    },
}

SKU_FIXES.update({
    "DTDZ1A52-1": {"name": "Motoburghiu pe benzină, 52 cm³, 1,4 kW"},
    "DTDZ1A52-2": {"name": "Burghiu pentru motoburghiu, 120 × 800 mm"},
    "DTLBP520": {
        "description": "Acumulator Li-Ion de 20 V și 2 Ah pentru sculele DYLLU din platforma P20S, cu indicator LED al nivelului de încărcare.",
        "specifications": (
            ("voltage", "Tensiune", "20 V", "V"),
            ("battery_capacity", "Capacitatea acumulatorului", "2 Ah", "Ah"),
            ("battery_type", "Tip acumulator", "Li-Ion", None),
        ),
    },
    "DTLBP540": {
        "description": "Acumulator Li-Ion de 20 V și 4 Ah pentru sculele DYLLU din platforma P20S, cu indicator LED al nivelului de încărcare.",
        "specifications": (
            ("battery_voltage", "Tensiune acumulator", "20 V", "V"),
            ("battery_capacity", "Capacitatea acumulatorului", "4 Ah", "Ah"),
            ("battery_type", "Tip acumulator", "Li-Ion", None),
        ),
    },
    "DTLBP550": {
        "description": "Acumulator Li-Ion de 20 V și 5 Ah pentru sculele DYLLU din platforma P20S, cu indicator LED al nivelului de încărcare.",
        "specifications": (
            ("voltage", "Tensiune", "20 V", "V"),
            ("battery_capacity", "Capacitatea acumulatorului", "5 Ah", "Ah"),
            ("battery_type", "Tip acumulator", "Li-Ion", None),
        ),
    },
    "DTLBS5150": {
        "description": "Acumulator Li-Ion de 12 V și 1,5 Ah pentru platforma DYLLU S12, cu port de încărcare USB Type-C.",
        "specifications": (
            ("voltage", "Tensiune", "12 V", "V"),
            ("battery_capacity", "Capacitatea acumulatorului", "1,5 Ah", "Ah"),
            ("charging_port", "Port de încărcare", "USB Type-C", None),
        ),
    },
    "DTFCT552": {
        "description": "Încărcător USB de 5 V și 2 A pentru acumulatorul DYLLU S12 cu port USB Type-C.",
        "specifications": (
            ("input_voltage", "Tensiune de intrare", "100–240 V ~ 50/60 Hz", "V"),
            ("output_current", "Curent de ieșire", "2 A", "A"),
            ("output_voltage", "Tensiune de ieșire", "5 V", "V"),
            ("charging_port", "Port de încărcare", "USB Type-A", None),
        ),
    },
})


TOOL_BAG_NAMES = {
    "DTTG1100": "Centură pentru suporturi de scule, 150 cm",
    "DTTG2101": "Borsetă pentru scule 170 × 140 mm",
    "DTTG2102": "Suport pentru ciocan 190 × 115 mm",
    "DTTG2103": "Borsetă pentru foarfecă de grădină 200 × 120 mm",
    "DTTG2104": "Suport pentru dălți 270 × 110 mm",
    "DTTG2105": "Toc pentru mașină de găurit 250 × 150 mm",
    "DTTG2106": "Borsetă pentru scule 280 × 275 mm",
    "DTTG3116": "Geantă pentru scule, 16″",
    "DTTG3119": "Geantă pentru scule, 19″",
    "DTTG4100": "Rucsac pentru scule, sarcină 8 kg",
    "DTTG5101": "Geantă pliabilă pentru scule, 16″",
    "DTTG7101": "Geantă compactă pentru scule 300 × 190 × 90 mm",
    "DTTG8101": "Geantă pentru scule 120 mm",
    "DTTGR102": "Geantă cu roți pentru scule, 19″",
}


def backup_database(conn: sqlite3.Connection, database: Path) -> Path:
    backup_dir = database.parent / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    path = backup_dir / f"catalog-before-readiness-{stamp}.db"
    target = sqlite3.connect(path)
    try:
        conn.backup(target)
    finally:
        target.close()
    return path


def ensure_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS catalog_variant_content(
          sku TEXT PRIMARY KEY,
          short_description TEXT NOT NULL,
          meta_title TEXT NOT NULL,
          meta_description TEXT NOT NULL,
          image_alt TEXT NOT NULL,
          source TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS catalog_readiness_application(
          id INTEGER PRIMARY KEY,
          generated_at TEXT NOT NULL,
          backup_path TEXT NOT NULL,
          summary_json TEXT NOT NULL,
          changes_json TEXT NOT NULL
        );
        """
    )


def record_change(
    changes: list[dict[str, Any]],
    sku: str,
    field: str,
    before: Any,
    after: Any,
    reason: str,
) -> None:
    if before == after:
        return
    changes.append({
        "sku": sku,
        "field": field,
        "before": before,
        "after": after,
        "reason": reason,
    })


def content_values(name: str, description: str) -> tuple[str, str, str]:
    meta_title = name if len(name) <= 58 else f"{name[:55].rstrip()}…"
    meta_description = description if len(description) <= 155 else f"{description[:152].rstrip()}…"
    return meta_title, meta_description, name


def apply_fixes(conn: sqlite3.Connection) -> list[dict[str, Any]]:
    now = datetime.now(UTC).isoformat()
    changes: list[dict[str, Any]] = []
    rows = {
        row["sku"]: dict(row)
        for row in conn.execute(
            "SELECT v.sku,v.product_id,v.name_ro,v.category_id,v.battery_included,v.charger_included,"
            "v.battery_count,v.battery_capacity,p.title_ro,p.category_id product_category_id "
            "FROM variant v JOIN product p ON p.id=v.product_id"
        )
    }
    for sku, name in TOOL_BAG_NAMES.items():
        SKU_FIXES.setdefault(sku, {})["name"] = name
    for product_id, power_source in PRODUCT_POWER_SOURCE_FIXES.items():
        product = conn.execute(
            "SELECT power_source FROM product WHERE id=?", (product_id,)
        ).fetchone()
        if product is None:
            raise ValueError(f"Unknown product in power-source fix set: {product_id}")
        record_change(
            changes,
            product_id,
            "product.power_source",
            product[0],
            power_source,
            "Verified power system from per-SKU source data",
        )
        conn.execute(
            "UPDATE product SET power_source=? WHERE id=?",
            (power_source, product_id),
        )
    for product_id, fix in PRODUCT_CONTENT_FIXES.items():
        content = conn.execute(
            "SELECT * FROM product_content WHERE product_id=?", (product_id,)
        ).fetchone()
        if content is None:
            raise ValueError(f"Unknown product content in fix set: {product_id}")
        for field, value in fix.items():
            record_change(
                changes,
                product_id,
                f"product_content.{field}",
                content[field],
                value,
                "Capacity-neutral family content with variant-specific package values",
            )
            conn.execute(
                f"UPDATE product_content SET {field}=? WHERE product_id=?",
                (value, product_id),
            )
    for sku in GARDEN_ACCESSORY_SKUS:
        SKU_FIXES.setdefault(sku, {})["category"] = 1206
    for sku, row in rows.items():
        category = CONSTRUCTION_CATEGORY_BY_PRODUCT.get(row["product_id"])
        if category is not None:
            SKU_FIXES.setdefault(sku, {})["category"] = category
    for sku, (battery_included, charger_included, battery_count, battery_capacity) in POWER_SUPPLY_FIXES.items():
        row = rows.get(sku)
        if row is None:
            raise ValueError(f"Unknown SKU in power-supply fix set: {sku}")
        values = {
            "battery_included": battery_included,
            "charger_included": charger_included,
            "battery_count": battery_count,
            "battery_capacity": battery_capacity,
        }
        for field, value in values.items():
            record_change(
                changes,
                sku,
                f"variant.{field}",
                row[field],
                value,
                "Verified package contents from source catalog and product artwork",
            )
        conn.execute(
            "UPDATE variant SET battery_included=?,charger_included=?,battery_count=?,battery_capacity=? WHERE sku=?",
            (battery_included, charger_included, battery_count, battery_capacity, sku),
        )
    for sku, fix in SKU_FIXES.items():
        row = rows.get(sku)
        if row is None:
            raise ValueError(f"Unknown SKU in readiness fix set: {sku}")
        if "name" in fix:
            record_change(changes, sku, "variant.name_ro", row["name_ro"], fix["name"], "Industry-standard Romanian product name")
            conn.execute("UPDATE variant SET name_ro=? WHERE sku=?", (fix["name"], sku))
            sibling_count = conn.execute(
                "SELECT COUNT(*) FROM variant WHERE product_id=?", (row["product_id"],)
            ).fetchone()[0]
            if sibling_count == 1 or not (row["title_ro"] or "").strip():
                record_change(changes, sku, "product.title_ro", row["title_ro"], fix["name"], "Single-SKU family title")
                conn.execute("UPDATE product SET title_ro=? WHERE id=?", (fix["name"], row["product_id"]))
        if "category" in fix:
            record_change(changes, sku, "variant.category_id", row["category_id"], fix["category"], "Source product meaning and customer search intent")
            conn.execute("UPDATE variant SET category_id=? WHERE sku=?", (fix["category"], sku))
            sibling_count = conn.execute(
                "SELECT COUNT(*) FROM variant WHERE product_id=?", (row["product_id"],)
            ).fetchone()[0]
            if sibling_count == 1:
                conn.execute("UPDATE product SET category_id=? WHERE id=?", (fix["category"], row["product_id"]))
        if "description" in fix:
            effective_name = fix.get("name") or row["name_ro"] or row["title_ro"] or sku
            meta_title, meta_description, image_alt = content_values(effective_name, fix["description"])
            previous = conn.execute(
                "SELECT short_description FROM catalog_variant_content WHERE sku=?", (sku,)
            ).fetchone()
            record_change(
                changes,
                sku,
                "catalog_variant_content.short_description",
                previous[0] if previous else None,
                fix["description"],
                "SKU-specific Romanian catalog description",
            )
            conn.execute(
                "INSERT INTO catalog_variant_content(sku,short_description,meta_title,meta_description,image_alt,source,updated_at) "
                "VALUES (?,?,?,?,?,'readiness_autopilot',?) ON CONFLICT(sku) DO UPDATE SET "
                "short_description=excluded.short_description,meta_title=excluded.meta_title,"
                "meta_description=excluded.meta_description,image_alt=excluded.image_alt,source=excluded.source,"
                "updated_at=excluded.updated_at",
                (sku, fix["description"], meta_title, meta_description, image_alt, now),
            )
        if "specs" in fix:
            before = [dict(value) for value in conn.execute(
                "SELECT key_norm,label_ro,value_raw,unit FROM specification WHERE sku=? ORDER BY position,id",
                (sku,),
            )]
            conn.execute("DELETE FROM specification WHERE sku=?", (sku,))
            conn.executemany(
                "INSERT INTO specification(sku,key_raw,key_norm,label_ro,value_raw,value_num,unit,position) "
                "VALUES (?,?,?,?,?,NULL,?,?)",
                [
                    (sku, key.replace("_", " ").title(), key, label, value, unit, position)
                    for position, (key, label, value, unit) in enumerate(fix["specs"])
                ],
            )
            conn.execute(
                "INSERT INTO catalog_spec_override(sku,mode,updated_at) VALUES (?,'replace',?) "
                "ON CONFLICT(sku) DO UPDATE SET mode='replace',updated_at=excluded.updated_at",
                (sku, now),
            )
            after = [
                {"key_norm": key, "label_ro": label, "value_raw": value, "unit": unit}
                for key, label, value, unit in fix["specs"]
            ]
            record_change(changes, sku, "specification", before, after, "Exact SKU evidence replaced family-level or missing values")

    synthetic = [dict(row) for row in conn.execute(
        "SELECT s.id,s.sku,s.key_norm,s.label_ro,s.value_raw,s.unit FROM specification s "
        "JOIN catalog_availability a ON a.sku=s.sku AND a.available=1 "
        "WHERE lower(s.value_raw) LIKE '%în funcție de variantă%' OR lower(s.value_raw) LIKE '%(variante%'"
    )]
    for row in synthetic:
        record_change(
            changes,
            row["sku"],
            f"specification.{row['key_norm']}",
            row["value_raw"],
            None,
            "Removed family aggregate from SKU-specific specifications",
        )
    if synthetic:
        conn.executemany("DELETE FROM specification WHERE id=?", [(row["id"],) for row in synthetic])

    for sku in ("DTLBP540", "DTXN2918"):
        row = rows[sku]
        fix = SKU_FIXES[sku]
        name = fix["name"]
        description = fix["description"]
        meta_title, meta_description, image_alt = content_values(name, description)
        conn.execute(
            "INSERT INTO product_content(product_id,short_description,why_good,seo_text,meta_title,meta_description,"
            "image_alt,highlights,use_cases,faq,keywords,specifications) VALUES (?,?,NULL,NULL,?,?,?,NULL,NULL,NULL,NULL,NULL) "
            "ON CONFLICT(product_id) DO UPDATE SET short_description=excluded.short_description,"
            "meta_title=excluded.meta_title,meta_description=excluded.meta_description,image_alt=excluded.image_alt",
            (row["product_id"], description, meta_title, meta_description, image_alt),
        )
    return changes


def audit(conn: sqlite3.Connection) -> dict[str, Any]:
    generic_name = re.compile(
        r"^(unealtă (?:pentru|pneumatică|manuală|de grădinar)|instrument de măsurare|chainsaw)(?:\s|$)",
        re.I,
    )
    rows = conn.execute(
        "SELECT v.sku,TRIM(COALESCE(NULLIF(v.name_ro,''),NULLIF(p.title_ro,''),'')) name_ro,"
        "c.parent_id,TRIM(COALESCE(NULLIF(vc.short_description,''),NULLIF(pc.short_description,''),"
        "NULLIF(p.description_ro,''),'')) description,COUNT(s.id) specification_count,"
        "SUM(CASE WHEN lower(COALESCE(s.value_raw,'')) LIKE '%în funcție de variantă%' "
        "OR lower(COALESCE(s.value_raw,'')) LIKE '%(variante%' THEN 1 ELSE 0 END) synthetic_count "
        "FROM variant v JOIN catalog_availability a ON a.sku=v.sku AND a.available=1 "
        "JOIN product p ON p.id=v.product_id LEFT JOIN category c ON c.id=COALESCE(v.category_id,p.category_id) "
        "LEFT JOIN product_content pc ON pc.product_id=p.id LEFT JOIN catalog_variant_content vc ON vc.sku=v.sku "
        "LEFT JOIN specification s ON s.sku=v.sku GROUP BY v.sku"
    ).fetchall()
    failures = []
    gate_counts = {"name": 0, "category": 0, "description": 0, "specifications": 0}
    for row in rows:
        gates = {
            "name": bool(row["name_ro"]) and not generic_name.search(row["name_ro"]),
            "category": row["parent_id"] is not None,
            "description": len(row["description"]) >= 50,
            "specifications": row["specification_count"] > 0 and row["synthetic_count"] == 0,
        }
        for gate, passed in gates.items():
            gate_counts[gate] += int(passed)
        if not all(gates.values()):
            failures.append({
                "sku": row["sku"],
                "name": row["name_ro"],
                "gates": gates,
                "specification_count": row["specification_count"],
            })
    return {
        "sellable_skus": len(rows),
        "ready_skus": len(rows) - len(failures),
        "failed_skus": len(failures),
        "gate_pass_counts": gate_counts,
        "failures": failures,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    conn = sqlite3.connect(args.database)
    conn.row_factory = sqlite3.Row
    backup_path: Path | None = None
    changes: list[dict[str, Any]] = []
    try:
        if args.apply:
            backup_path = backup_database(conn, args.database)
            ensure_schema(conn)
            conn.execute("BEGIN IMMEDIATE")
            try:
                changes = apply_fixes(conn)
                summary = audit(conn)
                if summary["failed_skus"]:
                    raise ValueError(f"Readiness gates still fail for {summary['failed_skus']} sellable SKUs")
                now = datetime.now(UTC).isoformat()
                conn.execute(
                    "INSERT INTO catalog_readiness_application(generated_at,backup_path,summary_json,changes_json) "
                    "VALUES (?,?,?,?)",
                    (now, str(backup_path), json.dumps(summary, ensure_ascii=False), json.dumps(changes, ensure_ascii=False)),
                )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
        else:
            has_variant_content = conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='catalog_variant_content'"
            ).fetchone()
            if not has_variant_content:
                conn.execute(
                    "CREATE TEMP TABLE catalog_variant_content(sku TEXT PRIMARY KEY,short_description TEXT)"
                )
            summary = audit(conn)
    finally:
        conn.close()
    report = {
        "generated_at": datetime.now(UTC).isoformat(),
        "dry_run": not args.apply,
        "backup_path": str(backup_path) if backup_path else None,
        "medusa_writes": 0,
        "summary": summary,
        "changes": changes,
    }
    rendered = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    print(rendered, end="")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(rendered, encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
