import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  deleteProductCategoriesWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  ALL_LEAF_HANDLES,
  ALL_ROOT_HANDLES,
  CATEGORY_TREE,
  ROOT_HANDLE_BY_LEAF,
} from "../data/category-tree";
import { revalidateStorefront } from "./_revalidate";

type MergedProduct = {
  handle: string;
  name: string;
  descriptionText?: string;
  breadcrumbs?: string[];
  sourceCategorySlugs?: string[];
  attributes?: Array<{ key: string; value: string }>;
};

type DbProduct = {
  id: string;
  handle: string;
  categories?: Array<{ id: string; handle: string }> | null;
};

type DbCategory = { id: string; handle: string; parent_category_id: string | null };

// Maps a single source-breadcrumb slug to a target leaf handle. The matcher
// scans a product's breadcrumb segments from deepest to shallowest, so more
// specific (deeper) source slugs win automatically.
const BREADCRUMB_TO_LEAF: Record<string, string> = {
  // ─── Scule electrice ──────────────────────────────────────────────────
  "masini-de-gaurit-electrice": "bormasini-si-masini-insurubat",
  "masini-de-insurubat-electrice": "bormasini-si-masini-insurubat",
  "masini-de-insurubat-cu-acumulator": "bormasini-si-masini-insurubat",
  "masini-de-insurubat-si-gaurit-pe-acumulator": "bormasini-si-masini-insurubat",
  "masini-de-insurubat-cu-impact-pe-acumulator": "bormasini-si-masini-insurubat",
  "masini-de-insurubat": "bormasini-si-masini-insurubat",
  "surubelnite-pe-acumulator": "bormasini-si-masini-insurubat",
  "polizoare-unghiulare-electrice": "polizoare-unghiulare",
  "polizoare-unghiulare-pe-acumulator": "polizoare-unghiulare",
  "polizoare-unghiulare": "polizoare-unghiulare",
  "fierastraie-circulare-manuale": "fierastraie",
  "fierastraie-circulare": "fierastraie",
  "fierastraie-pendulare": "fierastraie",
  "fierastraie-alternative": "fierastraie",
  "masini-de-debitat-metal": "fierastraie",
  "masini-de-slefuit-orbitale": "masini-de-slefuit",
  "masini-de-slefuit-cu-banda": "masini-de-slefuit",
  "masini-de-slefuit-alternativ": "masini-de-slefuit",
  "masini-de-slefuit": "masini-de-slefuit",
  "ciocane-rotopercutoare-cu-motor-vertical": "ciocane-rotopercutoare-si-demolatoare",
  "ciocane-rotopercutoare-cu-motor-orizontal": "ciocane-rotopercutoare-si-demolatoare",
  "ciocane-rotopercutoare": "ciocane-rotopercutoare-si-demolatoare",
  "demolatoare": "ciocane-rotopercutoare-si-demolatoare",
  "masini-de-frezat": "masini-de-frezat-si-gravurat",
  "masini-de-gravurat": "masini-de-frezat-si-gravurat",
  "pistoale-de-batut-cuie": "pistoale-batut-cuie",
  "pistoale-de-batut-cuie-pe-acumulator": "pistoale-batut-cuie",
  "fenuri-industriale": "fenuri-industriale",
  "masini-multifunctionale": "masini-multifunctionale",
  "seturi-de-scule-pe-baterie-scule-electrice": "seturi-scule-baterie",

  // ─── Scule manuale ────────────────────────────────────────────────────
  "surubelnite-seturi-de-surubelnite": "surubelnite",
  "surubelnite-seturi-de-surubelnite-scule-manuale": "surubelnite",
  "seturi-de-instrumente": "chei-si-seturi",
  "chei-si-seturi-de-instrumente": "chei-si-seturi",
  "clesti-si-freze-laterale": "clesti",
  "ciocane-topoare": "ciocane-si-topoare",
  "fierestraie-manuale": "fierastraie-manuale",
  "cutite-si-lame": "cutite-si-lame",
  "foarfeci-pentru-metal": "foarfeci-manuale",
  "spatule": "spatule-si-spacluri",
  "dalti": "dalti",
  "menghine": "menghine",
  "capsatoare-si-pistoale-nituri": "capsatoare-si-pistoale-nituri",
  "unelte-de-taiat-faianta-si-teracota": "unelte-faianta-gresie",
  "nivele-manuale": "instrumente-masurare",
  "nivele-cu-laser": "instrumente-masurare",
  "rulete-de-masurare": "instrumente-masurare",
  "telemetre": "instrumente-masurare",
  "sublere-echere-de-tamplariei-termometre": "instrumente-masurare",
  "accesorii-de-masurare": "instrumente-masurare",
  "instrumente-pentru-masurare": "instrumente-masurare",
  "ventuze": "ventuze",
  "ventuze-vibratoare-pe-acumulator": "ventuze",
  "ventuze-manuale": "ventuze",
  "perii": "perii",

  // ─── Sudură, compresoare, generatoare ─────────────────────────────────
  "sudura": "aparate-de-sudat",
  "sudura-polipropilenului": "tehnica-sanitara",
  "compresoare": "compresoare",
  "pneumatica": "pneumatica",
  "generatoare": "generatoare",
  "generatoare-pe-benzina": "generatoare",
  "generatoare-pe-benzina-generatoare-pe-benzina": "generatoare",
  "accesorii-de-sudura": "accesorii-sudura",
  "masti": "accesorii-sudura",
  "electrozi-si-sirma": "accesorii-sudura",

  // ─── Grădină ──────────────────────────────────────────────────────────
  "ferestraie-cu-lant": "motofierastraie",
  "lame-pentru-motofierestraie": "motofierastraie",
  "accesorii-si-consumabile-pentru-ferestraie-cu-lant": "motofierastraie",
  "trimmere": "trimmere-si-cositoare",
  "trimmere-de-tuns-iarba-pe-benzina": "trimmere-si-cositoare",
  "trimmere-electrice-de-tuns-iarba": "trimmere-si-cositoare",
  "masini-de-tuns-iarba": "trimmere-si-cositoare",
  "masini-de-gazon-pe-benzina": "trimmere-si-cositoare",
  "accesorii-si-consumabile-p-u-mototrimmere": "trimmere-si-cositoare",
  "discuri-pentru-trimere": "trimmere-si-cositoare",
  "trimmere-si-cositoare-de-gazon": "trimmere-si-cositoare",
  "foarfeci-pentru-gradina": "foarfeci-de-gradina",
  "foarfeci-p-u-garduri-vii": "foarfeci-de-gradina",
  "foarfeci-de-vie-pe-acumulatori": "foarfeci-de-gradina",
  "foarfeci-de-vie-manuali": "foarfeci-de-gradina",
  "suflante-de-frunze": "suflante-de-frunze",
  "motocultoare-si-minitractoare": "motocultoare",
  "moto%d1%81ultoare": "motocultoare",
  "motobloc-benzina": "motocultoare",
  "atasamente-si-accesorii-pentru-motocultivatori": "motocultoare",
  "accesorii-si-consumabile-pentru-motocultoare": "motocultoare",
  "motobururi": "motocultoare",
  "stropitori": "stropitori-si-pulverizatoare",
  "accesorii-pentru-irigare": "irigare",
  "inventar-de-gradina": "unelte-mana-gradina",
  "inventar-si-elemente-de-gradinarit": "unelte-mana-gradina",
  "gradinarit": "unelte-mana-gradina",

  // ─── Auto și Garaj ────────────────────────────────────────────────────
  "masini-de-spalat-cu-presiune-electrice": "masini-spalat-presiune",
  "masini-de-spalat-cu-presiune-benzina": "masini-spalat-presiune",
  "masini-de-spalat-cu-presiune": "masini-spalat-presiune",
  "furtunuri-si-accesorii": "masini-spalat-presiune",
  "cric-hidraulic-tip-butelie": "cricuri",
  "cricuri-tip-crocodil": "cricuri",
  "cricuri": "cricuri",
  "compresoare-auto": "compresoare-auto",
  "masini-de-lustruire": "masini-de-lustruire",
  "accesorii-auto": "accesorii-auto",

  // ─── Construcție ──────────────────────────────────────────────────────
  "betoniere": "betoniere-si-mixere",
  "mixere-pentru-constructie": "betoniere-si-mixere",
  "vibratoare-pentru-beton": "vibratoare-pentru-beton",
  "compactoare": "compactoare-si-placi-vibrante",
  "elicoptere": "elicoptere-si-rigle-vibrante",
  "utilaj-de-pregatire-si-finisaj": "elicoptere-si-rigle-vibrante",
  "echipament-pentru-vopsire": "pulverizatoare-si-vopsire",
  "pulverizatoare-electrice": "pulverizatoare-si-vopsire",
  "pulverizatoare-pneumatice-pentru-vopsea": "pulverizatoare-si-vopsire",
  "rulouri": "pulverizatoare-si-vopsire",
  "pistoale": "pistoale-constructie",
  "aspiratoare-industriale": "aspiratoare-industriale",

  // ─── Casă, Iluminat, Pompe ────────────────────────────────────────────
  "lumina-si-electrica": "iluminat",
  "multimetre": "multimetre-si-testere",
  "lacati": "lacate",
  "aspiratoare-portative": "aspiratoare-casnice",
  "tehnica-de-casa-ingco": "aspiratoare-casnice",
  "tehnica-sanitara-si-clima": "tehnica-sanitara",
  "ventilatoare": "tehnica-sanitara",
  "aparat-de-taiat-tevi": "tehnica-sanitara",
  "pompe-si-aprovizionarea-cu-apa": "pompe",
  "gospodarie-si-intretinerea-spatiilor": "lacate",

  // ─── Protecție ────────────────────────────────────────────────────────
  "incaltaminte-si-haine-de-protectie": "incaltaminte-si-haine-de-lucru",
  "imbracaminte-de-lucru": "incaltaminte-si-haine-de-lucru",
  "imbracaminte": "incaltaminte-si-haine-de-lucru",
  "incaltaminte": "incaltaminte-si-haine-de-lucru",
  "manusi": "manusi",
  "respiratoare-si-masti-de-protectie": "masti-si-respiratoare",
  "ochelari-de-protectie": "ochelari-de-protectie",
  "casti-de-protectie": "casti-de-protectie",
  "echipamente-de-protectie": "incaltaminte-si-haine-de-lucru",

  // ─── Accesorii și Consumabile ─────────────────────────────────────────
  "acumulatoare-pentru-scule": "acumulatori",
  "incarcatoare-pentru-scule": "incarcatoare",
  "burghie": "burghie",
  "burghie-pe-beton-sds": "burghie",
  "burghiuri-si-duze": "burghie",
  "biti": "bituri-si-capete-cheie",
  "lame-pinze-freze": "lame-pinze-si-freze",
  "discuri-pe-beton": "discuri-abrazive",
  "discuri-pe-metal": "discuri-abrazive",
  "discuri-pe-lemn": "discuri-abrazive",
  "discuri": "discuri-abrazive",
  "pentru-slefuire-si-polizare": "discuri-abrazive",
  "carote-diamante": "carote-diamantate",
  "benzi-abrazive": "benzi-abrazive",
  "cabluri-fringhii": "cabluri-si-franghii",
  "consumabile": "burghie",

  // ─── Depozitare ───────────────────────────────────────────────────────
  "cutii-pentru-accesorii": "cutii-pentru-scule",
  "carucioare-si-depozitare": "carucioare-si-rafturi",
  "rafturi-carucioare": "carucioare-si-rafturi",
  "depozitare": "cutii-pentru-scule",
};

// Name-based fallback patterns, evaluated in order. First match wins.
// Used when the breadcrumb path doesn't disambiguate (e.g. it's just the root
// "scule-manuale" or "auto-moto" with no deeper segments).
const NAME_PATTERNS: Array<{ re: RegExp; leaf: string }> = [
  // Hand tools
  { re: /\b(șurubelni|surubelni)/i, leaf: "surubelnite" },
  { re: /\bset.*(chei|capete|filier|instrumente\s+manuale)|cheie\s+(tubular|cruce|fix[ăa]|inel|combinat|reglabil|pentru\s+țevi|pentru\s+tevi)|antrenor.*clichet|articulație|articulatie.*impact|\bfilier[ăae]\b/i, leaf: "chei-si-seturi" },
  { re: /\b(clește|cleste)\b/i, leaf: "clesti" },
  { re: /\b(ciocan|topor|baros|daltă|dalta).*manual|^ciocan\s/i, leaf: "ciocane-si-topoare" },
  { re: /\bfier(ă|a)strău\s+manual|fierăstrău\s+(coadă|de\s+mână)/i, leaf: "fierastraie-manuale" },
  { re: /\b(cuțit|cutit|lamă\s+cutter|cuter|set\s+pile|\bpil[ăae]\s+(?:o-?el|metal))\b/i, leaf: "cutite-si-lame" },
  { re: /\bfoarfec[ăaei]\b(?!.*grădin)/i, leaf: "foarfeci-manuale" },
  { re: /\b(spaclu|șpaclu|spatul)/i, leaf: "spatule-si-spacluri" },
  { re: /\b(dalt[ăa])\b/i, leaf: "dalti" },
  { re: /\b(menghin)/i, leaf: "menghine" },
  { re: /\b(capsator|pistol\s+nituri|cleste\s+nituri)/i, leaf: "capsatoare-si-pistoale-nituri" },
  { re: /\b(taiat|tăiat)\s+(faianț|gresie|teracot)|aparat.*gresie/i, leaf: "unelte-faianta-gresie" },
  { re: /\b(nivel[ăa]|rulet[ăa]|șubler|subler|telemetru|laser|distanțmetru|distantmetru|echer)/i, leaf: "instrumente-masurare" },
  { re: /\bunealt[ăa]\s+telescopic.*magnetic|telescopic.*magnetic.*ridicare/i, leaf: "instrumente-masurare" },
  { re: /\b(ventuz)/i, leaf: "ventuze" },
  { re: /\b(perie)\b/i, leaf: "perii" },
  { re: /\bp[ăa]trat\s+(în|in)\s+hexagonal/i, leaf: "bituri-si-capete-cheie" },

  // Power tools
  { re: /\b(bormaș|mașina\s+de\s+găurit|masina\s+de\s+gaurit|mașină\s+de\s+înșurubat|masina\s+de\s+insurubat)/i, leaf: "bormasini-si-masini-insurubat" },
  { re: /\bpolizor\s+unghiular/i, leaf: "polizoare-unghiulare" },
  { re: /\b(ferestrău|fierastrau|fierăstrău)\s+(circular|pendular|alternativ)|mașină\s+de\s+debitat/i, leaf: "fierastraie" },
  { re: /\b(șlefuit|slefuit)\b/i, leaf: "masini-de-slefuit" },
  { re: /\b(ciocan\s+rotopercut|rotopercutor|demolator)/i, leaf: "ciocane-rotopercutoare-si-demolatoare" },
  { re: /\bmașină\s+de\s+frezat|masina\s+de\s+frezat|gravurat/i, leaf: "masini-de-frezat-si-gravurat" },
  { re: /\bpistol\s+de\s+bătut\s+cuie|pistol\s+cuie/i, leaf: "pistoale-batut-cuie" },
  { re: /\b(fen\s+industrial|termosuflant)/i, leaf: "fenuri-industriale" },
  { re: /\bmașin[ăa]\s+multifuncțional|masina\s+multifunctional/i, leaf: "masini-multifunctionale" },
  { re: /\b(set.*scule|combo.*kit|SET\s+MASINA)/i, leaf: "seturi-scule-baterie" },

  // Welding / air
  { re: /\baparat\s+de\s+sudat|sudur[ăa]/i, leaf: "aparate-de-sudat" },
  { re: /\bcompresor(?!\s+auto)/i, leaf: "compresoare" },
  { re: /\bgenerator/i, leaf: "generatoare" },

  // Garden
  { re: /\bmotofier(ă|a)str[ăa]u/i, leaf: "motofierastraie" },
  { re: /\b(trimer|cositoare|tuns\s+iarb[ăa]|mototrimer)/i, leaf: "trimmere-si-cositoare" },
  { re: /\bfoarfec.*(grădin|viță|gard)/i, leaf: "foarfeci-de-gradina" },
  { re: /\bsuflant[ăa]\s+de\s+frunze/i, leaf: "suflante-de-frunze" },
  { re: /\b(motocultor|motobloc|motobur)/i, leaf: "motocultoare" },
  { re: /\bstropitoare|pulverizator(?!\s+(electric|pneumat))/i, leaf: "stropitori-si-pulverizatoare" },
  { re: /\birigare|furtun\s+grădin/i, leaf: "irigare" },
  { re: /\b(lopat|grebla|sap[ăa]|cazma|f(o|u)rc[ăa]\s+grădin)/i, leaf: "unelte-mana-gradina" },

  // Auto & Garaj
  { re: /\bmașin[ăa]\s+de\s+spălat\s+cu\s+presiune|masina\s+de\s+spalat/i, leaf: "masini-spalat-presiune" },
  { re: /\bcric\b|\btroliu/i, leaf: "cricuri" },
  { re: /\bcompresor\s+auto/i, leaf: "compresoare-auto" },
  { re: /\bmașin[ăa]\s+de\s+lustru/i, leaf: "masini-de-lustruire" },
  { re: /\bcanistr[ăa]/i, leaf: "canistre-combustibil" },
  { re: /\bp[âa]lni[ei]|dispenser.*adeziv/i, leaf: "accesorii-auto" },

  // Construcție
  { re: /\b(betonier[ăa]|malaxor|mixer\s+de\s+construc)/i, leaf: "betoniere-si-mixere" },
  { re: /\bvibrator.*beton/i, leaf: "vibratoare-pentru-beton" },
  { re: /\b(compactor|plac[ăa]\s+compact)/i, leaf: "compactoare-si-placi-vibrante" },
  { re: /\b(elicopter|rigl[ăa]\s+vibrat)/i, leaf: "elicoptere-si-rigle-vibrante" },
  { re: /\b(pulverizator|aparat\s+pentru\s+vopsire|trafalet|rul(ou|ouri)\b)/i, leaf: "pulverizatoare-si-vopsire" },
  { re: /\bpistol\s+(pentru\s+silicon|de\s+lipit|spum[ăa])/i, leaf: "pistoale-constructie" },
  { re: /\baspirator\s+(industrial|universal)/i, leaf: "aspiratoare-industriale" },

  // Casă, Iluminat, Pompe
  { re: /\b(led|proiector|lantern|lamp[ăa]\s+de\s+lucru|reflector)/i, leaf: "iluminat" },
  { re: /\bprelungitor|cablu.*electric/i, leaf: "prelungitoare" },
  { re: /\bmultimetru|detector\s+de\s+cabluri|tester/i, leaf: "multimetre-si-testere" },
  { re: /\b(l[ăa]cat)/i, leaf: "lacate" },
  { re: /\baspirator(?!\s+(industrial|universal))/i, leaf: "aspiratoare-casnice" },
  { re: /\baparat\s+de\s+cur(ă|a)țat\s+cu\s+aburi/i, leaf: "aparate-curatat-aburi" },
  { re: /\b(țeav[ăa]|teava|polipropilen|sanitar|ventilator|desfundare)/i, leaf: "tehnica-sanitara" },
  { re: /\b(arz[ăa]tor|aprindere\s+piezo)/i, leaf: "arzatoare" },
  { re: /\bpomp[ăa]\b/i, leaf: "pompe" },

  // Protecție
  { re: /\b(mănuș|manus)/i, leaf: "manusi" },
  { re: /\b(respirator|mask|masc[ăa]\s+de\s+protec)/i, leaf: "masti-si-respiratoare" },
  { re: /\bochelari\s+de\s+protec/i, leaf: "ochelari-de-protectie" },
  { re: /\bcasc[ăa]\s+de\s+protec/i, leaf: "casti-de-protectie" },
  { re: /\b(bocanci|cizme|salopet|jachet|veston|haine\s+de\s+lucru|încălțăminte|incaltaminte)/i, leaf: "incaltaminte-si-haine-de-lucru" },

  // Accesorii și Consumabile
  { re: /^acumulator|^baterie\s+li-?ion/i, leaf: "acumulatori" },
  { re: /^(încărcător|incarcator)|cablu\s+usb/i, leaf: "incarcatoare" },
  { re: /\bburghiu\b/i, leaf: "burghie" },
  { re: /\bbit\b|bit-uri|cap\s+(șurubelniță|chei)/i, leaf: "bituri-si-capete-cheie" },
  { re: /\blam[ăa]|pânz[ăa]|panza\s+ferestrau|frez[ăa]\b/i, leaf: "lame-pinze-si-freze" },
  { re: /\bdisc\b/i, leaf: "discuri-abrazive" },
  { re: /\bcarot[ăa]\s+diamant/i, leaf: "carote-diamantate" },
  { re: /\bbenz[ăa]\s+abraziv|hârtie\s+abraziv/i, leaf: "benzi-abrazive" },
  { re: /\b(coliere\s+plastic|chinga|frânghi|franghi|ancorare)/i, leaf: "cabluri-si-franghii" },

  // Depozitare
  { re: /\b(cutie\s+(metalica|pentru\s+scule)|cutie\s+pt\s+scule)/i, leaf: "cutii-pentru-scule" },
  { re: /\b(geant[ăa]\s+(pentru\s+)?scule|centura\s+instrumente|centura\s+scule|suport\s+magnetic\s+pentru\s+unelte)/i, leaf: "genti-pentru-scule" },
  { re: /\b(cărucior|carucior|raft|trolley)/i, leaf: "carucioare-si-rafturi" },
  { re: /\bbanc\s+de\s+lucru/i, leaf: "bancuri-de-lucru" },
];

function pickLeafFromBreadcrumbs(crumbs: string[]): string | undefined {
  for (let i = crumbs.length - 1; i >= 0; i--) {
    const leaf = BREADCRUMB_TO_LEAF[crumbs[i]];
    if (leaf && ALL_LEAF_HANDLES.has(leaf)) return leaf;
  }
  return undefined;
}

function pickLeafFromName(name: string): string | undefined {
  for (const { re, leaf } of NAME_PATTERNS) {
    if (re.test(name) && ALL_LEAF_HANDLES.has(leaf)) return leaf;
  }
  return undefined;
}

type Logger = { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void };

async function ensureCategories(
  container: ExecArgs["container"],
  logger: Logger
): Promise<Map<string, DbCategory>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "parent_category_id"],
  });
  const byHandle = new Map<string, DbCategory>(
    (data as DbCategory[]).map((c) => [c.handle, c])
  );

  // Create missing roots
  const missingRoots = CATEGORY_TREE.filter((r) => !byHandle.has(r.handle));
  if (missingRoots.length > 0) {
    logger.info(`[categorize] creating ${missingRoots.length} missing roots`);
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: missingRoots.map((r) => ({
          name: r.name,
          handle: r.handle,
          is_active: true,
          rank: CATEGORY_TREE.findIndex((x) => x.handle === r.handle),
        })),
      },
    });
    for (const cat of result) {
      byHandle.set(cat.handle, {
        id: cat.id,
        handle: cat.handle,
        parent_category_id: null,
      });
    }
  }

  // Create missing leaves
  const missingLeaves: Array<{
    name: string;
    handle: string;
    parent_category_id: string;
    rank: number;
  }> = [];
  for (const root of CATEGORY_TREE) {
    const parent = byHandle.get(root.handle);
    if (!parent) continue;
    root.children.forEach((leaf, i) => {
      if (!byHandle.has(leaf.handle)) {
        missingLeaves.push({
          name: leaf.name,
          handle: leaf.handle,
          parent_category_id: parent.id,
          rank: i,
        });
      }
    });
  }
  if (missingLeaves.length > 0) {
    logger.info(`[categorize] creating ${missingLeaves.length} missing leaves`);
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: missingLeaves },
    });
    for (const cat of result) {
      byHandle.set(cat.handle, {
        id: cat.id,
        handle: cat.handle,
        parent_category_id: cat.parent_category_id ?? null,
      });
    }
  }

  return byHandle;
}

export default async function ingcoCategorize({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const flags = parseArgs(args ?? []);
  const dryRun =
    flags.dryRun ?? (process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true");
  const dataDir = resolve(process.cwd(), "data", "ingco", "products-merged");
  if (dryRun) logger.info("[categorize] DRY_RUN active — DB will not be touched");

  const files = (await readdir(dataDir)).filter((f) => f.endsWith(".json"));
  logger.info(`[categorize] reading ${files.length} merged products`);

  type Resolution = {
    product: MergedProduct;
    leafHandle: string | null;
    via: "breadcrumb" | "name" | "unmatched";
  };

  const resolutions = new Map<string, Resolution>();
  const stats = { breadcrumb: 0, name: 0, unmatched: 0 };
  const unmatchedHandles: string[] = [];

  for (const f of files) {
    const product = JSON.parse(
      await readFile(join(dataDir, f), "utf8")
    ) as MergedProduct;

    let leafHandle = pickLeafFromBreadcrumbs(product.breadcrumbs ?? []);
    let via: Resolution["via"] = leafHandle ? "breadcrumb" : "unmatched";

    if (!leafHandle) {
      leafHandle = pickLeafFromName(product.name);
      if (leafHandle) via = "name";
    }

    if (!leafHandle) {
      unmatchedHandles.push(product.handle);
      stats.unmatched++;
    } else {
      stats[via]++;
    }

    resolutions.set(product.handle, {
      product,
      leafHandle: leafHandle ?? null,
      via,
    });
  }

  logger.info(
    `[categorize] resolved: breadcrumb=${stats.breadcrumb}, name=${stats.name}, unmatched=${stats.unmatched}`
  );

  // Tally by leaf
  const leafCounts: Record<string, number> = {};
  for (const { leafHandle } of resolutions.values()) {
    if (leafHandle) leafCounts[leafHandle] = (leafCounts[leafHandle] ?? 0) + 1;
  }
  const sortedLeaves = Object.entries(leafCounts).sort(([, a], [, b]) => b - a);
  logger.info(`[categorize] distribution across ${sortedLeaves.length} leaves:`);
  for (const [handle, n] of sortedLeaves) {
    logger.info(`  ${handle}: ${n}`);
  }

  if (unmatchedHandles.length > 0) {
    logger.warn(`[categorize] ${unmatchedHandles.length} products unmatched:`);
    for (const h of unmatchedHandles.slice(0, 30)) logger.warn(`  - ${h}`);
    if (unmatchedHandles.length > 30) {
      logger.warn(`  ... and ${unmatchedHandles.length - 30} more`);
    }
  }

  if (dryRun) {
    logger.info("[categorize] DRY RUN — not touching DB");
    return;
  }

  const categoryByHandle = await ensureCategories(container, logger);

  // Load existing products + their current categories
  const handles = [...resolutions.keys()];
  const handleChunks: string[][] = [];
  for (let i = 0; i < handles.length; i += 200) {
    handleChunks.push(handles.slice(i, i + 200));
  }
  const dbProducts: DbProduct[] = [];
  for (const chunk of handleChunks) {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "handle", "categories.id", "categories.handle"],
      filters: { handle: chunk },
    });
    for (const p of data as DbProduct[]) dbProducts.push(p);
  }
  logger.info(`[categorize] matched ${dbProducts.length}/${handles.length} in DB`);

  // Build update payloads — products get [leafId, rootId] when leaf is known,
  // [rootId] as a fallback (so the root listing still shows them), or no
  // change when unmatched.
  const updates: Array<{ id: string; category_ids: string[] }> = [];
  let skipped = 0;
  for (const p of dbProducts) {
    const res = resolutions.get(p.handle);
    if (!res || !res.leafHandle) {
      skipped++;
      continue;
    }
    const leafCat = categoryByHandle.get(res.leafHandle);
    if (!leafCat) continue;
    const rootHandle = ROOT_HANDLE_BY_LEAF.get(res.leafHandle);
    const rootCat = rootHandle ? categoryByHandle.get(rootHandle) : undefined;
    const targetIds = [leafCat.id, ...(rootCat ? [rootCat.id] : [])];
    const currentIds = new Set((p.categories ?? []).map((c) => c.id));
    const sameMembership =
      targetIds.length === currentIds.size &&
      targetIds.every((id) => currentIds.has(id));
    if (sameMembership) {
      skipped++;
      continue;
    }
    updates.push({ id: p.id, category_ids: targetIds });
  }
  logger.info(
    `[categorize] ${updates.length} products to reassign, ${skipped} already correct or unmatched`
  );

  const batchSize = Number(flags.batch ?? 50);
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    try {
      await updateProductsWorkflow(container).run({
        input: { products: batch },
      });
      logger.info(
        `[categorize] batch ${i / batchSize + 1}: updated ${batch.length} (total ${i + batch.length}/${updates.length})`
      );
    } catch (err) {
      logger.error(
        `[categorize] batch ${i / batchSize + 1} FAILED: ${err instanceof Error ? err.message : err}`
      );
      throw err;
    }
  }
  logger.info(`[categorize] done — updated ${updates.length} products`);

  await cleanupStaleCategories(container, logger);

  await revalidateStorefront(logger);
}

async function cleanupStaleCategories(
  container: ExecArgs["container"],
  logger: Logger
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle", "products.id"],
  });

  type CategoryWithProducts = {
    id: string;
    handle: string;
    products?: Array<{ id: string }> | null;
  };

  const stale: CategoryWithProducts[] = [];
  for (const c of data as CategoryWithProducts[]) {
    const inCanonicalTree =
      ALL_LEAF_HANDLES.has(c.handle) || ALL_ROOT_HANDLES.has(c.handle);
    if (inCanonicalTree) continue;
    const productCount = c.products?.length ?? 0;
    if (productCount > 0) {
      logger.warn(
        `[cleanup] keeping stale category "${c.handle}" — still holds ${productCount} products`
      );
      continue;
    }
    stale.push(c);
  }

  if (stale.length === 0) {
    logger.info("[cleanup] no stale empty categories to delete");
    return;
  }

  logger.info(`[cleanup] deleting ${stale.length} stale empty categories:`);
  for (const c of stale) logger.info(`  - ${c.handle}`);

  await deleteProductCategoriesWorkflow(container).run({
    input: stale.map((c) => c.id),
  });
  logger.info(`[cleanup] done`);
}

function parseArgs(args: string[]) {
  const out: { dryRun?: boolean; batch?: number } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (key === "dryRun") out.dryRun = rawValue !== "false";
    else if (key === "batch" && rawValue) out.batch = Number(rawValue);
  }
  return out;
}
