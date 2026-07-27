"""Build and apply the canonical two-level product taxonomy."""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Iterable


@dataclass(frozen=True)
class TaxonomyCategory:
    id: int
    key: str
    name_ro: str
    handle: str
    parent_key: str | None = None


@dataclass(frozen=True)
class Classification:
    category_key: str
    confidence: str
    reason: str


def _parent(id: int, key: str, name: str, handle: str) -> TaxonomyCategory:
    return TaxonomyCategory(id, key, name, handle)


def _leaf(id: int, key: str, name: str, handle: str, parent: str) -> TaxonomyCategory:
    return TaxonomyCategory(id, key, name, handle, parent)


CATEGORIES = (
    _parent(1000, "power_tools", "Scule electrice", "scule-electrice"),
    _leaf(1001, "drills_drivers", "Mașini de găurit și înșurubat", "masini-de-gaurit-si-insurubat", "power_tools"),
    _leaf(1002, "impact_tools", "Chei și șurubelnițe cu impact", "chei-si-surubelnite-cu-impact", "power_tools"),
    _leaf(1003, "rotary_demolition_hammers", "Ciocane rotopercutoare și demolatoare", "ciocane-rotopercutoare-si-demolatoare", "power_tools"),
    _leaf(1004, "grinders", "Polizoare", "polizoare", "power_tools"),
    _leaf(1005, "sanders", "Mașini de șlefuit", "masini-de-slefuit", "power_tools"),
    _leaf(1006, "power_saws", "Ferăstraie electrice", "fierastraie-electrice", "power_tools"),
    _leaf(1007, "routers_planers_rotary", "Freze, rindele și mașini de gravat", "freze-rindele-si-masini-de-gravat", "power_tools"),
    _leaf(1008, "multi_tools", "Unelte multifuncționale", "unelte-multifunctionale", "power_tools"),
    _leaf(1009, "heat_guns", "Pistoale cu aer cald", "pistoale-cu-aer-cald", "power_tools"),
    _leaf(1010, "nailers_staplers", "Capsatoare și pistoale de cuie", "capsatoare-si-pistoale-de-cuie", "power_tools"),
    _leaf(1011, "power_mixers", "Malaxoare electrice", "malaxoare-electrice", "power_tools"),
    _leaf(1012, "power_tool_sets", "Seturi de scule electrice", "seturi-de-scule-electrice", "power_tools"),
    _leaf(1013, "tool_batteries_chargers", "Acumulatori și încărcătoare pentru scule", "acumulatori-si-incarcatoare-pentru-scule", "tool_accessories"),
    _leaf(1014, "fans_heaters", "Ventilatoare și încălzitoare", "ventilatoare-si-incalzitoare", "power_tools"),
    _leaf(1015, "glue_guns", "Pistoale de lipit cu silicon", "pistoale-de-lipit-cu-silicon", "power_tools"),
    _leaf(1016, "polishers", "Mașini de lustruit", "masini-de-lustruit", "power_tools"),
    _leaf(1017, "electric_paint_sprayers", "Pistoale electrice de vopsit", "pistoale-electrice-de-vopsit", "power_tools"),
    _leaf(1018, "powered_tile_concrete_tools", "Scule electrice pentru gresie și beton", "scule-electrice-pentru-gresie-si-beton", "power_tools"),
    _leaf(1901, "levels_lasers", "Măsurare laser și nivele", "masurare-laser-si-nivele", "power_tools"),
    _leaf(1902, "measuring_marking", "Măsurare și trasare", "masurare-si-trasare", "power_tools"),

    _parent(1100, "hand_tools", "Scule de mână", "scule-de-mana"),
    _leaf(1101, "wrenches_spanners", "Chei fixe, reglabile și speciale", "chei-fixe-reglabile-si-speciale", "hand_tools"),
    _leaf(1102, "sockets_ratchets", "Chei tubulare, clicheți și accesorii", "chei-tubulare-clicheti-si-accesorii", "hand_tools"),
    _leaf(1103, "screwdrivers", "Șurubelnițe", "surubelnite", "hand_tools"),
    _leaf(1104, "pliers_cutters", "Clești și patent", "clesti-si-patent", "hand_tools"),
    _leaf(1105, "hammers_axes_pry", "Ciocane, topoare și leviere", "ciocane-topoare-si-leviere", "hand_tools"),
    _leaf(1106, "knives_scissors", "Cuttere, cuțite și foarfece", "cuttere-cutite-si-foarfece", "hand_tools"),
    _leaf(1107, "hand_saws", "Ferăstraie manuale", "fierastraie-manuale", "hand_tools"),
    _leaf(1108, "files_chisels_planes", "Pile, dălți și rindele", "pile-dalti-si-rindele", "hand_tools"),
    _leaf(1109, "clamps_vices", "Menghine și cleme", "menghine-si-cleme", "hand_tools"),
    _leaf(1110, "plumbing_hand_tools", "Scule pentru țevi și instalații", "scule-pentru-tevi-si-instalatii", "hand_tools"),
    _leaf(1111, "hand_tool_sets", "Truse și seturi de scule", "truse-si-seturi-de-scule", "hand_tools"),
    _leaf(1112, "threading_tools", "Scule pentru filetare", "scule-pentru-filetare", "hand_tools"),
    _leaf(1113, "manual_staplers_riveters", "Capsatoare și nituitoare manuale", "capsatoare-si-nituitoare-manuale", "hand_tools"),
    _leaf(1114, "manual_caulk_guns", "Pistoale manuale pentru silicon și adeziv", "pistoale-manuale-pentru-silicon-si-adeziv", "hand_tools"),
    _leaf(1115, "manual_tile_tools", "Scule manuale pentru gresie și sticlă", "scule-manuale-pentru-gresie-si-sticla", "hand_tools"),

    _parent(1200, "tool_accessories", "Accesorii și consumabile pentru scule", "accesorii-si-consumabile-pentru-scule"),
    _leaf(1201, "drill_bits_hole_saws", "Burghie și carote", "burghie-si-carote", "tool_accessories"),
    _leaf(1202, "saw_blades", "Pânze și lame pentru ferăstraie", "panze-si-lame-pentru-fierastraie", "tool_accessories"),
    _leaf(1203, "cutting_grinding_discs", "Discuri de tăiere și șlefuire", "discuri-de-taiere-si-slefuire", "tool_accessories"),
    _leaf(1204, "abrasives_brushes", "Abrazive și perii tehnice", "abrazive-si-perii-tehnice", "tool_accessories"),
    _leaf(1205, "screwdriver_bits", "Biți și port-biți", "biti-si-port-biti", "tool_accessories"),
    _leaf(1206, "power_tool_accessories", "Accesorii pentru scule și utilaje", "accesorii-pentru-scule-electrice", "tool_accessories"),
    _leaf(1207, "sds_chisels_accessories", "Dălți SDS și accesorii pentru rotopercutoare", "dalti-sds-si-accesorii-pentru-rotopercutoare", "tool_accessories"),

    _parent(1300, "construction", "Construcții și finisaje", "constructii-si-finisaje"),
    _leaf(1301, "concrete_mixers", "Betoniere și malaxoare", "betoniere-si-malaxoare", "construction"),
    _leaf(1302, "concrete_vibrators", "Vibratoare și finisoare pentru beton", "vibratoare-si-finisoare-pentru-beton", "construction"),
    _leaf(1303, "compactors_rollers", "Plăci compactoare și rulouri compactoare", "placi-compactoare-si-rulouri-compactoare", "construction"),
    _leaf(1304, "tile_tools", "Scule pentru gresie și faianță", "scule-pentru-gresie-si-faianta", "construction"),
    _leaf(1305, "masonry_plastering", "Scule pentru zidărie și tencuieli", "scule-pentru-zidarie-si-tencuieli", "construction"),
    _leaf(1306, "painting_finishing", "Vopsire și finisaje", "vopsire-si-finisaje", "construction"),
    _leaf(1307, "drywall_equipment", "Scule și echipamente pentru gips-carton", "scule-si-echipamente-pentru-gips-carton", "construction"),
    _leaf(1309, "rebar_machines", "Mașini pentru tăiat și îndoit fier beton", "masini-pentru-taiat-si-indoit-fier-beton", "construction"),
    _leaf(1310, "combustion_engines", "Motoare pe benzină și diesel", "motoare-pe-benzina-si-diesel", "construction"),

    _parent(1400, "garden", "Grădinărit", "gradinarit"),
    _leaf(1401, "chainsaws", "Drujbe și accesorii", "drujbe-si-accesorii", "garden"),
    _leaf(1402, "grass_trimmers", "Motocoase și trimmere", "motocoase-si-trimmere", "garden"),
    _leaf(1403, "lawn_mowers", "Mașini de tuns gazon", "masini-de-tuns-gazon", "garden"),
    _leaf(1404, "tillers", "Motocultoare și motosape", "motocultoare-si-motosape", "garden"),
    _leaf(1405, "pruning_tools", "Foarfece și unelte pentru tăiere", "foarfece-si-unelte-pentru-taiere", "garden"),
    _leaf(1406, "blowers_chippers", "Suflante și tocătoare de crengi", "suflante-si-tocatoare-de-crengi", "garden"),
    _leaf(1407, "garden_hand_tools", "Unelte de grădină", "unelte-de-gradina", "garden"),
    _leaf(1408, "garden_watering", "Furtunuri, aspersoare și irigații", "furtunuri-aspersoare-si-irigatii", "garden"),
    _leaf(1409, "garden_sprayers", "Pompe de stropit și pulverizatoare", "pompe-de-stropit-si-pulverizatoare", "garden"),

    _parent(1500, "pumps_installations", "Pompe și instalații", "pompe-si-instalatii"),
    _leaf(1501, "water_pumps", "Pompe de apă", "pompe-de-apa", "pumps_installations"),
    _leaf(1502, "fluid_transfer", "Pompe pentru ulei și transfer lichide", "pompe-pentru-ulei-si-transfer-lichide", "pumps_installations"),
    _leaf(1503, "pipe_installation", "Echipamente pentru țevi și instalații", "echipamente-pentru-tevi-si-instalatii", "pumps_installations"),
    _leaf(1504, "plumbing_fixtures", "Baterii și accesorii sanitare", "baterii-si-accesorii-sanitare", "pumps_installations"),

    _parent(1600, "welding", "Sudură și lipire", "sudura-si-lipire"),
    _leaf(1601, "welders_cutters", "Aparate de sudură și tăiere cu plasmă", "aparate-de-sudura-si-taiere-cu-plasma", "welding"),
    _leaf(1602, "soldering", "Stații și pistoale de lipit", "statii-si-pistoale-de-lipit", "welding"),
    _leaf(1603, "welding_consumables", "Accesorii și consumabile pentru sudură", "accesorii-si-consumabile-pentru-sudura", "welding"),
    _leaf(1604, "gas_torches", "Arzătoare cu gaz", "arzatoare-cu-gaz", "welding"),

    _parent(1700, "compressed_air", "Compresoare și scule pneumatice", "compresoare-si-scule-pneumatice"),
    _leaf(1701, "air_compressors", "Compresoare de aer", "compresoare-de-aer", "compressed_air"),
    _leaf(1702, "pneumatic_wrenches_ratchets", "Chei și clicheți pneumatici", "chei-si-clicheti-pneumatici", "compressed_air"),
    _leaf(1703, "air_guns_accessories", "Pistoale și accesorii pneumatice", "pistoale-si-accesorii-pneumatice", "compressed_air"),
    _leaf(1704, "pneumatic_hammers", "Ciocane pneumatice", "ciocane-pneumatice", "compressed_air"),
    _leaf(1705, "pneumatic_nailers", "Capsatoare și pistoale pneumatice de cuie", "capsatoare-si-pistoale-pneumatice-de-cuie", "compressed_air"),
    _leaf(1706, "pneumatic_tool_sets", "Seturi de scule pneumatice", "seturi-de-scule-pneumatice", "compressed_air"),

    _parent(1800, "automotive", "Auto și garaj", "auto-si-garaj"),
    _leaf(1801, "jacks_lifts_stands", "Cricuri, elevatoare și suporți auto", "cricuri-elevatoare-si-suporti-auto", "automotive"),
    _leaf(1802, "auto_battery_service", "Redresoare și testere pentru baterii auto", "redresoare-si-testere-pentru-baterii-auto", "automotive"),
    _leaf(1803, "auto_service_tools", "Scule pentru service auto", "scule-pentru-service-auto", "automotive"),
    _leaf(1804, "tire_wheel_service", "Echipamente pentru roți și anvelope", "echipamente-pentru-roti-si-anvelope", "automotive"),
    _leaf(1805, "garage_equipment", "Echipamente de atelier auto", "echipamente-de-atelier-auto", "automotive"),
    _leaf(1806, "towing_transport", "Trolii, remorcare și ancorare", "trolii-remorcare-si-ancorare", "automotive"),
    _leaf(1807, "car_inflators", "Compresoare auto și pompe de umflat", "compresoare-auto-si-pompe-de-umflat", "automotive"),
    _leaf(2201, "pressure_washers", "Aparate de spălat cu presiune", "aparate-de-spalat-cu-presiune", "automotive"),

    _parent(1900, "measuring_electrical", "Electrică", "electrica"),
    _leaf(1903, "electrical_testers", "Aparate de măsură și testere electrice", "aparate-de-masura-si-testere-electrice", "measuring_electrical"),
    _leaf(1904, "cables_extensions", "Cabluri și prelungitoare", "cabluri-si-prelungitoare", "measuring_electrical"),
    _leaf(1905, "work_lighting", "Iluminat de lucru", "iluminat-de-lucru", "measuring_electrical"),
    _leaf(1906, "electrical_installation", "Conectori și materiale electrice", "conectori-si-materiale-electrice", "measuring_electrical"),
    _leaf(1907, "household_batteries", "Baterii și acumulatori de uz general", "baterii-si-acumulatori-de-uz-general", "measuring_electrical"),
    _leaf(1308, "generators", "Generatoare electrice", "generatoare-electrice", "measuring_electrical"),

    _parent(2000, "ppe", "Echipamente de protecție", "echipamente-de-protectie"),
    _leaf(2001, "work_gloves", "Mănuși de protecție", "manusi-de-protectie", "ppe"),
    _leaf(2002, "work_clothing", "Îmbrăcăminte de protecție", "imbracaminte-de-protectie", "ppe"),
    _leaf(2003, "safety_footwear", "Încălțăminte de protecție", "incaltaminte-de-protectie", "ppe"),
    _leaf(2004, "head_face_hearing", "Protecția capului, feței și auzului", "protectia-capului-fetei-si-auzului", "ppe"),
    _leaf(2005, "respiratory_protection", "Protecție respiratorie", "protectie-respiratorie", "ppe"),
    _leaf(2006, "height_protection", "Echipamente pentru lucrul la înălțime", "echipamente-pentru-lucrul-la-inaltime", "ppe"),
    _leaf(2007, "safety_marking", "Semnalizare și delimitare", "semnalizare-si-delimitare", "ppe"),

    _parent(2100, "workshop_storage", "Organizare atelier", "organizare-atelier"),
    _leaf(2101, "tool_boxes_bags", "Cutii, genți și organizatoare pentru scule", "cutii-genti-si-organizatoare-pentru-scule", "workshop_storage"),
    _leaf(2102, "workbenches_cabinets", "Bancuri, dulapuri și cărucioare de atelier", "bancuri-dulapuri-si-carucioare-de-atelier", "workshop_storage"),
    _leaf(2103, "shelving_storage", "Rafturi și sisteme de depozitare", "rafturi-si-sisteme-de-depozitare", "workshop_storage"),

    _parent(2300, "hardware", "Feronerie și fixare", "feronerie-si-fixare"),
    _leaf(2301, "screws_bolts_anchors", "Șuruburi, dibluri și ancore", "suruburi-dibluri-si-ancore", "hardware"),
    _leaf(2302, "locks_safes", "Lacăte, încuietori și seifuri", "lacate-incuietori-si-seifuri", "hardware"),
    _leaf(2303, "brackets_hooks_hinges", "Console, cârlige și balamale", "console-carlige-si-balamale", "hardware"),
    _leaf(2304, "tapes_adhesives_sealants", "Benzi, adezivi și etanșanți", "benzi-adezivi-si-etansanti", "hardware"),
    _leaf(2305, "chains_ropes", "Lanțuri, cabluri și frânghii", "lanturi-cabluri-si-franghii", "hardware"),
    _leaf(2306, "wheels_castors", "Roți și role", "roti-si-role", "hardware"),

    _parent(2400, "handling_access", "Manipulare și acces", "manipulare-si-acces"),
    _leaf(2401, "ladders", "Scări și platforme", "scari-si-platforme", "handling_access"),
    _leaf(2402, "trolleys_hoists", "Cărucioare, stivuitoare și dispozitive de ridicare", "carucioare-stivuitoare-si-dispozitive-de-ridicare", "handling_access"),
    _leaf(2403, "traffic_parking", "Echipamente pentru trafic și parcare", "echipamente-pentru-trafic-si-parcare", "handling_access"),

    _parent(2500, "household", "Casă și gospodărie", "casa-si-gospodarie"),
    _leaf(2501, "bathroom_accessories", "Accesorii pentru baie", "accesorii-pentru-baie", "household"),
    _leaf(2502, "kitchen_tools", "Cuțite și accesorii de bucătărie", "cutite-si-accesorii-de-bucatarie", "household"),
    _leaf(2503, "outdoor_household", "Mobilier și accesorii pentru exterior", "mobilier-si-accesorii-pentru-exterior", "household"),
    _leaf(2504, "covers_film", "Prelate și folii de protecție", "prelate-si-folii-de-protectie", "household"),
    _leaf(2202, "vacuums_steam", "Aspiratoare și aparate de curățat cu aburi", "aspiratoare-si-aparate-de-curatat-cu-aburi", "household"),
    _leaf(2203, "cleaning_accessories", "Perii, bureți și accesorii de curățenie", "perii-bureti-si-accesorii-de-curatenie", "household"),
    _leaf(2204, "bins_buckets", "Găleți și recipiente pentru curățenie", "galeti-si-recipiente-pentru-curatenie", "household"),
)


RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("sockets_ratchets", (r"\bimpact (socket|adapter)\b", r"\b(adaptoare pentru cheie de impact|cap tubular pentru cheie de impact)\b")),
    ("garden_hand_tools", (r"\bgarden trowel\b", r"\blopatica de gradinar\b")),
    ("kitchen_tools", (r"\bkitchen scissors\b",)),
    ("safety_footwear", (r"\bsafety boots?\b", r"\brubber boots?\b", r"\bbocanci\b", r"\bcizme\b")),
    ("work_gloves", (r"\bgloves?\b", r"\bmanusi\b")),
    ("respiratory_protection", (r"\brespirator\b", r"\bdust mask\b", r"\bmasca respiratorie\b")),
    ("height_protection", (r"\bsafety harness\b", r"\bback support belt\b", r"\bcentura de siguranta\b", r"\bcarabiner\b")),
    ("head_face_hearing", (r"\bwelding (helmet|mask|goggles)\b", r"\bsafety (helmet|glasses)\b", r"\bear ?muffs?\b", r"\bearplug\b", r"\bantifon\b", r"\bochelari de protectie\b", r"\bmasca de sudura\b")),
    ("work_clothing", (r"\brain (coat|cape|suit)\b", r"\bsafety vest\b", r"\btool (apron|vest)\b", r"\bprotective clothing\b", r"\bimbracaminte\b", r"\bpelerina\b", r"\bcostum impermeabil\b", r"\bvesta reflectorizanta\b")),
    ("safety_marking", (r"\btraffic cone\b", r"\bsafety warning tape\b", r"\breflective tape\b", r"\bwarning tape\b")),

    ("pressure_washers", (r"\bpressure washer\b", r"\baparat de spalat cu presiune\b", r"\brotary nozzle\b")),
    ("vacuums_steam", (r"\bvacuum\b", r"\bsteam cleaner\b", r"\bspot cleaner\b", r"\baspirator\b", r"\baparat de curatat cu aburi\b")),
    ("cleaning_accessories", (r"\bmop\b", r"\bscrubber", r"\bcleaning\b", r"\bdetailing brush\b", r"\bbristle brush\b", r"\bsponges?\b", r"\btoilet brush\b", r"\bsweeper\b")),
    ("bins_buckets", (r"\brubbish bin\b", r"\bplastic bucket\b", r"\bwash basin\b")),
    ("bathroom_accessories", (r"\b(bathroom accessor|soap dish|towel bar|towel ring|tumbler holder|robe hook|paper holder)\b", r"\baccesorii pentru baie\b")),

    ("jacks_lifts_stands", (r"\bjack stand\b", r"\b(scissor|vehicle|motorcycle|car|four post|two post|mid-rise|in-ground|wheel alignment) lift\b", r"\b(hydraulic|pneumatic hydraulic|mechanical|electric|scissor|transmission|off-road) (floor |garage |long floor |bottle )?jack\b", r"\bengine (leveler|stand|crane)\b", r"\bcric\b", r"\belevator\b")),
    ("jacks_lifts_stands", (r"\bair jack\b", r"\bpost overhead clearfloor\b")),
    ("tire_wheel_service", (r"\btire (changer|spreader)\b", r"\bwheel (balancer|alignment|weight)\b", r"\bbrake (pad|piston|spring)\b", r"\bdisc brake\b", r"\bcar ramps\b", r"\bcar dolly\b", r"\bwheel dolly\b")),
    ("auto_battery_service", (r"\bbattery (load )?tester\b", r"\bjump starter\b", r"\bbooster cable\b", r"\bcar battery (charger|tester)\b", r"\bacumulator auto\b")),
    ("car_inflators", (r"\b(auto air compressor|tire inflat|foot pump)\b", r"\bcompresor auto\b")),
    ("auto_service_tools", (r"\b(ball joint|injector|pulley|bearing|oil filter|oxygen sensor|windscreen|wiper arm|panel removal|spring compressor|thread repair|puller|oil drain plug|door trim|fuse set|creeper seat|brake pad thickness|car fuse)\b", r"\bscule auto\b")),
    ("garage_equipment", (r"\b(parts washer|shop press|sand blaster|garage tool|garage cabinets|car tire changer)\b", r"\bunealta pentru garaj\b")),
    ("towing_transport", (r"\b(tow strap|lashing strap|bungee cord|hand winch|mechanical winch|trailer)\b", r"\bchinga\b", r"\btroliu\b", r"\bmacara manuala\b")),

    ("welders_cutters", (r"\bwelding machine\b", r"\bwelder\b", r"\bplasma cutter\b", r"\baparat de sudura\b")),
    ("soldering", (r"\bsolder(ing)? (station|gun|iron|feeder)\b", r"\bdesoldering pump\b", r"\bhot air rework\b", r"\bpistol de lipit\b")),
    ("welding_consumables", (r"\bwelding (wire|electrode|magnet|plier|accessory)\b", r"\belectrode holder\b", r"\bsolder wire\b", r"\bsoldering iron tips\b", r"\bsudura\b")),
    ("gas_torches", (r"\bgas torch\b", r"\barzator cu gaz\b")),

    ("pneumatic_wrenches_ratchets", (r"\bair impact wrench\b", r"\bpneumatic ratchet\b", r"\bclichet pneumatic\b")),
    ("pneumatic_hammers", (r"\bair hammer\b", r"\bciocan pneumatic\b")),
    ("pneumatic_nailers", (r"\bair (brad|concrete) nailer\b", r"\bpistol pneumatic de cuie\b")),
    ("pneumatic_tool_sets", (r"\bpneumatic tool\b", r"\bset de scule pneumatice\b", r"\bscula pneumatica\b")),
    ("air_guns_accessories", (r"\bair (blow|washing|grease|tire inflating) gun\b", r"\bpneumatic (paint|spray|air blow) gun\b", r"\bair (filter|grease lubricator)\b", r"\bduct hose\b", r"\bpistol pneumatic\b")),
    ("air_compressors", (r"\bair compressor\b", r"\bcompresor de aer\b")),

    ("powered_tile_concrete_tools", (r"\b(cordless tile cutter|tile vibrator|cordless concrete vibrator)\b", r"\bmasina de taiat gresie cu acumulator\b", r"\bvibrator (intern pentru beton|cu ventuza pentru gresie).*acumulator\b")),
    ("concrete_mixers", (r"\bconcrete mixer\b", r"\bbetoniera\b")),
    ("concrete_vibrators", (r"\bconcrete (vibrator|trowel|screed|edger|groover)\b", r"\bvibrator (electric|intern|pe benzina|motor)\b", r"\belicopter de finisare\b", r"\briga vibratoare\b", r"\bcap vibrator\b")),
    ("compactors_rollers", (r"\b(plate compactor|drum roller|floor saw)\b", r"\bplaca compactoare\b")),
    ("electric_paint_sprayers", (r"\belectric paint sprayer\b", r"\bpistol de vopsit electric\b")),
    ("manual_caulk_guns", (r"\bmanual caulking gun\b", r"\bpistol pentru silicon si adeziv\b")),
    ("manual_tile_tools", (r"\bmanual tile cutter\b", r"\baparat de taiat gresie manual\b", r"\bventuze? pentru sticla si gresie\b")),
    ("power_tool_accessories", (r"\btile cutter blade\b", r"\blama pentru taiat gresie\b")),
    ("tile_tools", (r"\b(tile|grout|gresie|faianta|suction cup)\b", r"\bventuze pentru sticla\b")),
    ("power_tool_accessories", (r"\bcollated drywall screw magazine\b",)),
    ("drills_drivers", (r"\bcordless drywall screwdriver\b", r"\bsurubelnita pentru rigips cu acumulator\b")),
    ("hammers_axes_pry", (r"\bdrywall hammer\b", r"\bciocan pentru rigips\b")),
    ("screws_bolts_anchors", (r"\b(collated )?drywall screw\b",)),
    ("drywall_equipment", (r"\bdrywall and panel hoist\b", r"\belevator pentru (placi de )?gips-carton\b")),
    ("painting_finishing", (r"\bpaint (sprayer|brush|roller|tray|cup|can opener)\b", r"\bfoam roller\b", r"\broller cover\b", r"\b(caulking|sealant|silicone) gun\b", r"\bpistol (de vopsit|pentru silicon)\b", r"\bpensule\b", r"\btrafalet\b")),
    ("masonry_plastering", (r"\b(plastering hawk|screeding level|mud pan|putty knife|trowel|masons hammer|concrete chisel|leveling bar)\b", r"\bmistrie\b", r"\bspaclu\b", r"\briga de nivelare\b")),
    ("generators", (r"\b(diesel |silent diesel |inverter )?generator\b", r"\bgenerator electric\b")),
    ("rebar_machines", (r"\bsteel bar (bender|cutter)\b",)),
    ("combustion_engines", (r"\b(diesel|gasoline|petrol) engine\b",)),

    ("power_tool_accessories", (r"\b(trimmer line|trimmer head|brush cutter blade|chainsaw guide bar|chainsaw chain|hose clamp set)\b", r"\bfir nailon pentru motocoasa\b", r"\bdisc de taiere pentru motocoasa\b", r"\bsina de ghidaj pentru drujba\b", r"\blant pentru drujba\b", r"\bset coliere pentru furtun\b")),
    ("chainsaws", (r"\bchain ?saw\b", r"\bchainsaw\b", r"\bdrujba\b")),
    ("grass_trimmers", (r"\bgrass trimmer\b", r"\btrimmer (line|blade)\b", r"\bmotocoasa\b", r"\bfir nailon\b")),
    ("lawn_mowers", (r"\blawn mower\b", r"\bmasina de tuns gazon\b")),
    ("tillers", (r"\b(tiller|cultivator|motosapa|motocultor)\b",)),
    ("pruning_tools", (r"\b(pruner|loppers?|pruning shears|grass shear|grape shears)\b", r"\bfoarfece de gradina\b", r"\bfoarfece pentru crengi\b")),
    ("blowers_chippers", (r"\bleaf blower\b", r"\bwood chipper\b", r"\bsuflanta frunze\b", r"\btocator de crengi\b")),
    ("garden_sprayers", (r"\b(garden|backpack|battery powered|soft) sprayer\b", r"\bpompa de stropit\b", r"\bpulverizator\b")),
    ("garden_watering", (r"\b(sprinkler|watering can|garden hose|hose reel|water can)\b", r"\baspersor\b", r"\bstropitoare\b", r"\bfurtun\b")),
    ("garden_hand_tools", (r"\b(garden (trowel|hand tool|rake|auger)|shovel|weeder|weed knife|gravel rake|grain shovel|wheel ?barrow|sample ditcher)\b", r"\bgrebla\b", r"\blopatica\b", r"\bunealta de gradinar\b", r"\bmotoburghiu\b")),
    ("garden_hand_tools", (r"\bseed spreader\b", r"\bdistribuitor de seminte\b")),

    ("water_pumps", (r"\b(water|submersible|deep well|centrifugal|drainage|dc submersible|solar) pump\b", r"\bpompa (pentru apa|submersibila|de drenaj)\b", r"\bpump auto controller\b")),
    ("fluid_transfer", (r"\b(oil|grease|waste oil) (pump|gun|can|lubricator|drainer|drain|funnel)\b", r"\b(plastic funnel|fuel can)\b", r"\bpompa (manuala pentru ulei|de gresat)\b", r"\bpistol de extras ulei\b", r"\bdozator de ulei\b", r"\bpalnii?\b", r"\bcanistra de combustibil\b")),
    ("pipe_installation", (r"\b(pipe (welder|bender)|plastic tube welding|manual press tool|pressure testing pump|drain snake|o-ring|flexible tub)\b", r"\baparat de sudat tevi\b", r"\bcablu de desfundat\b")),
    ("plumbing_fixtures", (r"\b(kitchen faucet|faucet)\b",)),

    ("levels_lasers", (r"\b(spirit|hand|mini spirit|laser) level\b", r"\blaser distance (meter|detector)\b", r"\bnivela\b", r"\btelemetru\b", r"\blaser level tripod\b")),
    ("electrical_testers", (r"\b(multimeter|clamp meter|electrical test|voltage tester|socket tester|network cable tester|rcd/loop tester|anemometer|luxmeter|sound level meter|humidity.*meter|infrared thermometer|wood moisture meter|test lead)\b", r"\bmultimetru\b", r"\btester de tensiune\b")),
    ("measuring_marking", (r"\b(tape measure|measuring wheel|measuring tool|ruler|steel square|marking kit|crane scale|electronic scale|kitchen scale)\b", r"\bruleta\b", r"\becher\b", r"\bmasurare\b", r"\btrasare\b")),
    ("work_lighting", (r"\b(work lamp|hand lamp|headlamp|flashlight|led (floodlight|t lamp|vapor tight|bulb))\b", r"\bproiector led\b")),
    ("cables_extensions", (r"\b(extension cord|cable reel|usb .*cable|charging cable)\b", r"\bprelungitor\b", r"\btambur cu cablu\b")),
    ("electrical_installation", (r"\b(terminals?|tubular terminal|wire caps|electrical wire|circuit breaker|cable clips|insulating tape|cable tie)\b", r"\bcoliere de plastic\b")),
    ("electrical_installation", (r"\b(cable clip|heat shrink tubing)\b",)),
    ("household_batteries", (r"\balkaline battery\b",)),

    ("tool_boxes_bags", (r"\b(tool (box|bag|organizer|pouch)|plastic tool box|transparent organizer|storage tower)\b", r"\bcutii? pentru scule\b", r"\bgeanta.*scule\b", r"\borganizator.*scule\b")),
    ("workbenches_cabinets", (r"\b(workbench|roller cabinet|tool cart|chest and roller cabinet|garage cabinets)\b", r"\bbanc de lucru\b")),
    ("shelving_storage", (r"\b(shelving|storage bins?|storage box|storage container|shelf brackets?|wall hanger)\b", r"\braft\b")),

    ("locks_safes", (r"\b(padlock|rim lock|cylinder lock|cash box|safe|mailbox|hasp and staple|key ring)\b", r"\blacat\b", r"\bseif\b")),
    ("screws_bolts_anchors", (r"\b(screws?|bolts?|anchors?|wall plugs?|nail-in plugs?|rivet|staples|brad nail|screw eyes)\b",)),
    ("tapes_adhesives_sealants", (r"\b(tape|sealant|adhesive|liquid nails|stretch wrap film)\b", r"\bsilicone sealant\b")),
    ("brackets_hooks_hinges", (r"\b(brace|bracket|hooks?|hinges?|corner guard|post base plate|tower bolt|roller catch)\b",)),
    ("chains_ropes", (r"\b(chain|rope|shackle|connecting ring|wire rope)\b",)),
    ("wheels_castors", (r"\b(caster wheel|solid wheel|pneumatic wheel|foam wheel)\b",)),

    ("ladders", (r"\bladder\b",)),
    ("trolleys_hoists", (r"\b(hand truck|hand trolley|lift table|stacker|hoist frame|camping cart|platform hand truck)\b",)),
    ("traffic_parking", (r"\b(parking blocks?|speed bump)\b",)),

    ("drill_bits_hole_saws", (r"\b(drill bits?|drill bit|hole saw|core drill|carota|burghiu)\b",)),
    ("saw_blades", (r"\b(saw blades?|hacksaw blade|circular saw blade|panze? fierastrau|lama ferastrau)\b",)),
    ("saw_blades", (r"\b(carbide wood blade|disc circular cu placute|disc circular pentru lemn)\b",)),
    ("cutting_grinding_discs", (r"\b(cutting disc|grinding disc|diamond disc|flap disc|sanding disc|disc abraziv|disc diamantat|disc de taiere)\b",)),
    ("abrasives_brushes", (r"\b(sanding (sheet|block)|wire brush|wire wheels|nylon brush|pencil brush|tube brush|hartie abraziva|perie tip cupa|perii cu sarma)\b",)),
    ("screwdrivers", (r"\bprofessional screwdriver bit set\b", r"\bset biti profesional\b", r"\bset biti.*(maner|clichet)\b")),
    ("screwdriver_bits", (r"\b(screwdriver bits?|bit holder|magnetic nut set|biti? pentru surubelnita|port-bit)\b",)),
    ("power_tool_accessories", (r"\b(arbor for hole saw|key chuck|drill stand|grinder stand|mini drill accessories|oscillating tool accessory|mixer paddle|router bit|hot glue stick)\b", r"\baccesoriu pentru.*(scula|drujba|masina multif)\b", r"\bsuport pentru (masina de gaurit|polizor)\b", r"\b(set )?freze pentru lemn\b", r"\bbaton de silicon\b")),

    ("tool_batteries_chargers", (r"\b(lithium-ion battery|li-ion battery|battery pack|cordless power source|battery charger)\b", r"\bacumulator li-ion\b", r"\bincarcator rapid\b")),
    ("sds_chisels_accessories", (r"\bsds(?:[- ]max| plus|\+)? chisel\b", r"\bdalta sds\b")),
    ("rotary_demolition_hammers", (r"\b(rotary hammer|demolition (hammer|breaker)|sds-max hammer drill)\b", r"\bciocan (rotopercutor|demolator)\b")),
    ("impact_tools", (r"\b(impact wrench|drive ratchet|cheie de impact)\b",)),
    ("drills_drivers", (r"\b(cordless|corded|electric).*drill\b", r"\b(cordless|corded|electric).*screwdriver\b", r"\bdrill\b", r"\bmasina de gaurit\b", r"\bsurubelnita.*acumulator\b")),
    ("polishers", (r"\b(polisher|polishing machine)\b", r"\bmasina de lustruit\b")),
    ("grinders", (r"\b(angle|straight|mini) grinder\b", r"\bgrinder\b", r"\bpolizor\b")),
    ("sanders", (r"\b(belt|orbital|detail) sander\b", r"\bmasina de slefuit\b", r"\bslefuitor\b")),
    ("power_saws", (r"\b(jigsaw|circular saw|miter.*saw|cut-off saw|table saw)\b", r"\bfierastrau.*(electric|acumulator|retezat)\b", r"\bmasina de debitat metal\b")),
    ("routers_planers_rotary", (r"\b(router|laminate trimmer|rotary tool|engraver)\b", r"\bmasina de (frezat|gravurat)\b")),
    ("multi_tools", (r"\boscillating tool\b", r"\bmasina multifunctionala\b")),
    ("heat_guns", (r"\bheat gun\b", r"\bpistol de aer cald\b")),
    ("glue_guns", (r"\bglue gun\b", r"\bpistol.*lipit.*silicon\b")),
    ("nailers_staplers", (r"\b(cordless|electric).*(nailer|stapler)\b", r"\bcapsator cu acumulator\b")),
    ("power_mixers", (r"\bcordless mixer\b", r"\bmixer\b", r"\bmalaxor\b")),
    ("power_tool_sets", (r"\b(cordless|power) tools? set\b", r"\btool combo kit\b", r"\bset scule cu acumulator\b")),
    ("fans_heaters", (r"\b(fan|heater)\b", r"\bventilator\b")),

    ("clamps_vices", (r"\b(clamp|bench vice|table vice)\b", r"\bmenghina\b", r"\bclema\b")),
    ("threading_tools", (r"\b(tap (and|&) die|filiere|tarozi)\b",)),
    ("manual_staplers_riveters", (r"\b(stapler.?riveter|stapler and riveter)\b", r"\bcapsator si nituitor\b")),
    ("plumbing_hand_tools", (r"\b(pipe wrench|basin wrench|pump pliers|pipe cutter|press tool)\b", r"\bcheie pentru tevi\b", r"\bfoarfece pentru tevi\b")),
    ("pliers_cutters", (r"\b(pliers?|nippers?|bolt cutter|wire stripper|cable stripper|cable cutter|crimping tool|stripping knife|stud crimper)\b", r"\bcleste\b", r"\bclesti\b")),
    ("sockets_ratchets", (r"\b(socket|ratchet|sliding t-bar|flexible handle|universal joint|socket adaptor|socket adapter|impact adapter|extension bar|adaptor)\b", r"\bclichet\b", r"\bcapuri? tubulare\b")),
    ("wrenches_spanners", (r"\b(wrench|spanner|hex key|hex and torx folding key|l type wrench)\b", r"\bcheie\b", r"\bchei\b")),
    ("screwdrivers", (r"\bscrewdriver\b", r"\bsurubelnita\b")),
    ("hammers_axes_pry", (r"\b(hammer|mallet|axe|pry bar|splitting wedge)\b", r"\bciocan\b", r"\btopor\b", r"\blevier\b")),
    ("hand_saws", (r"\b(hand saw|back saw|bow saw|compass saw|folding saw|hacksaw frame)\b", r"\bfierastrau manual\b")),
    ("files_chisels_planes", (r"\b(file|chisel|block plane|hand plane|punch set)\b", r"\bdalta\b", r"\brindea\b", r"\bpile\b")),
    ("knives_scissors", (r"\b(utility knife|hobby knife|glass cutter|scissors|tin snip|machete)\b", r"\bcutter\b", r"\bfoarfece\b", r"\btaietor de sticla\b")),
    ("hand_tool_sets", (r"\b(hand tool|tools? set|tap & die set|extractor set)\b", r"\btrusa de scule\b", r"\bunealta manuala\b")),

    ("painting_finishing", (r"\b(artist brush|aritist brush|cylinder brush|caulking gun)\b",)),
    ("measuring_marking", (r"\b(carpenter pencil|creioane pentru tamplarie)\b",)),
    ("garden_watering", (r"\bspray gun.*quick connector\b",)),
    ("auto_service_tools", (r"\bice scraper\b",)),

    ("bathroom_accessories", (r"\b(bathroom|soap dish|toilet brush with holder|towel|tumbler|paper holder|robe hook)\b",)),
    ("kitchen_tools", (r"\b(kitchen|chef knife|bread knife|paring knife|slicer knife)\b",)),
    ("outdoor_household", (r"\b(outdoor chair|outdoor table|plastic stool)\b",)),
    ("covers_film", (r"\b(tarp|fiberglass mesh|plastic chain)\b",)),
)


SEMANTIC_GATES: tuple[tuple[str, frozenset[str]], ...] = (
    (r"\bwelding (helmet|mask|goggles)\b", frozenset({"head_face_hearing"})),
    (r"\b(safety gloves?|manusi de protectie)\b", frozenset({"work_gloves"})),
    (r"\b(lawn mower|masina de tuns gazon)\b", frozenset({"lawn_mowers"})),
    (r"\b(pressure washer|aparat de spalat cu presiune)\b", frozenset({"pressure_washers"})),
    (r"\b(submersible|deep well|water) pump\b", frozenset({"water_pumps"})),
    (r"\bpadlock\b", frozenset({"locks_safes"})),
    (r"\bladder\b", frozenset({"ladders"})),
    (r"\bimpact socket\b", frozenset({"sockets_ratchets"})),
    (r"\bgarden trowel\b", frozenset({"garden_hand_tools"})),
    (r"\bkitchen scissors\b", frozenset({"kitchen_tools"})),
    (r"\b(tool|plastic tool) box\b", frozenset({"tool_boxes_bags"})),
    (r"\b(tile|gresie|faianta)\b", frozenset({"tile_tools"})),
    (r"\bsds(?:[- ]max| plus|\+)? chisel\b", frozenset({"sds_chisels_accessories"})),
    (r"\bdrywall hammer\b", frozenset({"hammers_axes_pry"})),
    (r"\bcordless drywall screwdriver\b", frozenset({"drills_drivers"})),
    (r"\bair impact wrench\b", frozenset({"pneumatic_wrenches_ratchets"})),
    (r"\bair hammer\b", frozenset({"pneumatic_hammers"})),
    (r"\bair (brad|concrete) nailer\b", frozenset({"pneumatic_nailers"})),
    (r"\b(polisher|polishing machine)\b", frozenset({"polishers"})),
)


def normalize(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = "".join(char for char in text if not unicodedata.combining(char))
    return re.sub(r"\s+", " ", text.casefold()).strip()


def classify_product(title_ro: str, title_en: str, current_category: str = "") -> Classification | None:
    title = normalize(f"{title_ro} {title_en}")
    for category_key, patterns in RULES:
        for pattern in patterns:
            if re.search(pattern, title):
                return Classification(category_key, "high", f"Title matched {pattern}")
    category_hint = normalize(current_category)
    if category_hint:
        for category_key, patterns in RULES:
            for pattern in patterns:
                if re.search(pattern, category_hint):
                    return Classification(category_key, "medium", f"Existing category matched {pattern}")
    return None


def build_plan(conn: sqlite3.Connection) -> dict[str, object]:
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT p.id,p.title_ro,p.title_en,c.name_ro current_category "
        "FROM product p LEFT JOIN category c ON c.id=p.category_id ORDER BY p.id"
    ).fetchall()
    assignments = []
    unmatched = []
    for row in rows:
        classification = classify_product(
            row["title_ro"] or "",
            row["title_en"] or "",
            row["current_category"] or "",
        )
        if classification is None:
            unmatched.append({"product_id": row["id"], "title": row["title_ro"] or row["title_en"] or ""})
            continue
        assignments.append({
            "product_id": row["id"],
            "category_key": classification.category_key,
            "confidence": classification.confidence,
            "reason": classification.reason,
            "source_title": row["title_ro"] or row["title_en"] or "",
        })
    quality_issues = []
    for row in assignments:
        title = normalize(row["source_title"])
        for pattern, allowed_keys in SEMANTIC_GATES:
            if re.search(pattern, title) and row["category_key"] not in allowed_keys:
                quality_issues.append({
                    "product_id": row["product_id"],
                    "title": row["source_title"],
                    "category_key": row["category_key"],
                    "gate": pattern,
                })
    category_by_key = {category.key: category for category in CATEGORIES}
    counts: dict[str, int] = {}
    for row in assignments:
        counts[row["category_key"]] = counts.get(row["category_key"], 0) + 1
    return {
        "categories": [category.__dict__ for category in CATEGORIES],
        "assignments": assignments,
        "unmatched": unmatched,
        "quality_issues": quality_issues,
        "summary": {
            "products": len(rows),
            "assigned": len(assignments),
            "unmatched": len(unmatched),
            "quality_issues": len(quality_issues),
            "parents": sum(category.parent_key is None for category in CATEGORIES),
            "leaves": sum(category.parent_key is not None for category in CATEGORIES),
            "used_leaves": sum(count > 0 for count in counts.values()),
            "assignment_counts": {
                category_by_key[key].name_ro: value
                for key, value in sorted(counts.items(), key=lambda item: category_by_key[item[0]].name_ro)
            },
        },
    }


def _backup_database(conn: sqlite3.Connection, backup_dir: Path) -> Path:
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%fZ")
    path = backup_dir / f"catalog-before-taxonomy-{timestamp}.db"
    target = sqlite3.connect(path)
    try:
        conn.backup(target)
    finally:
        target.close()
    return path


def apply_plan(conn: sqlite3.Connection, plan: dict[str, object], backup_dir: Path) -> Path:
    unmatched = plan["unmatched"]
    if unmatched:
        raise ValueError(f"Cannot apply taxonomy with {len(unmatched)} unmatched products")
    quality_issues = plan["quality_issues"]
    if quality_issues:
        raise ValueError(f"Cannot apply taxonomy with {len(quality_issues)} semantic gate failures")
    backup_path = _backup_database(conn, backup_dir)
    now = datetime.now(UTC).isoformat()
    categories = [TaxonomyCategory(**row) for row in plan["categories"]]
    category_by_key = {category.key: category for category in categories}
    old_handle_by_id = {
        row["id"]: row["medusa_handle"]
        for row in conn.execute("SELECT id,medusa_handle FROM category WHERE medusa_handle IS NOT NULL")
    }
    try:
        conn.execute("BEGIN IMMEDIATE")
        conn.execute(
            "CREATE TABLE IF NOT EXISTS catalog_taxonomy_assignment ("
            "product_id TEXT PRIMARY KEY, category_id INTEGER NOT NULL, confidence TEXT NOT NULL, "
            "reason TEXT NOT NULL, source_title TEXT NOT NULL, generated_at TEXT NOT NULL)"
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS catalog_taxonomy_application ("
            "id INTEGER PRIMARY KEY, generated_at TEXT NOT NULL, backup_path TEXT NOT NULL, summary_json TEXT NOT NULL)"
        )
        conn.execute("DELETE FROM catalog_taxonomy_assignment")
        conn.execute("DELETE FROM category")
        for category in categories:
            parent_id = category_by_key[category.parent_key].id if category.parent_key else None
            path = (
                f"{category_by_key[category.parent_key].name_ro} > {category.name_ro}"
                if category.parent_key
                else category.name_ro
            )
            medusa_handle = old_handle_by_id.get(category.id)
            conn.execute(
                "INSERT INTO category(id,name_ro,parent_id,path,medusa_handle) VALUES (?,?,?,?,?)",
                (category.id, category.name_ro, parent_id, path, medusa_handle),
            )
        for row in plan["assignments"]:
            category = category_by_key[row["category_key"]]
            conn.execute("UPDATE product SET category_id=? WHERE id=?", (category.id, row["product_id"]))
            conn.execute("UPDATE variant SET category_id=? WHERE product_id=?", (category.id, row["product_id"]))
            conn.execute(
                "INSERT INTO catalog_taxonomy_assignment(product_id,category_id,confidence,reason,source_title,generated_at) "
                "VALUES (?,?,?,?,?,?)",
                (row["product_id"], category.id, row["confidence"], row["reason"], row["source_title"], now),
            )
        conn.execute(
            "INSERT INTO catalog_taxonomy_application(generated_at,backup_path,summary_json) VALUES (?,?,?)",
            (now, str(backup_path), json.dumps(plan["summary"], ensure_ascii=False, sort_keys=True)),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    return backup_path


def write_report(path: str | Path, plan: dict[str, object], backup_path: Path | None = None) -> None:
    payload = dict(plan)
    if backup_path:
        payload["backup_path"] = str(backup_path)
    Path(path).write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("database")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--report")
    args = parser.parse_args(argv)
    conn = sqlite3.connect(args.database)
    conn.row_factory = sqlite3.Row
    try:
        plan = build_plan(conn)
        backup_path = None
        if args.apply:
            backup_path = apply_plan(conn, plan, Path(args.database).parent / "backups")
        if args.report:
            write_report(args.report, plan, backup_path)
        print(json.dumps(plan["summary"], ensure_ascii=False, indent=2))
        if plan["unmatched"]:
            print(json.dumps(plan["unmatched"], ensure_ascii=False, indent=2))
        return 1 if plan["unmatched"] or plan["quality_issues"] else 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
