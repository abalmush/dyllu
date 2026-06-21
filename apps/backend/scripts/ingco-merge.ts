import { mkdir, readFile, readdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data", "ingco");
const PRODUCTS_DIR = join(DATA_DIR, "products");
const MERGED_DIR = join(DATA_DIR, "products-merged");

type ScrapedProduct = {
  sourceId: string;
  sourceUrl: string;
  sku: string;
  internalId?: string;
  name: string;
  brand: string;
  priceMdl: number;
  oldPriceMdl?: number;
  inStock: boolean;
  sourceCategories: string[];
  sourceCategorySlugs: string[];
  breadcrumbs: string[];
  attributes: Array<{ key: string; value: string }>;
  descriptionHtml: string;
  descriptionText: string;
  images: string[];
  scrapedAt: string;
};

type Variant = {
  title: string;
  sku: string;
  internalSku?: string;
  article: string;
  optionValue: string;
  priceMdl: number;
  oldPriceMdl?: number;
  image?: string;
  sourceUrl: string;
  sourceId: string;
};

type MergedProduct = {
  kind: "single" | "multi";
  handle: string;
  name: string;
  descriptionText: string;
  descriptionHtml: string;
  brand: string;
  optionTitle: string;
  variants: Variant[];
  images: string[];
  inStock: boolean;
  attributes: Array<{ key: string; value: string }>;
  sourceCategories: string[];
  sourceCategorySlugs: string[];
  breadcrumbs: string[];
  metadata: {
    ingco_family: string;
    ingco_articles: string[];
    ingco_source_urls: string[];
    ingco_source_skus: string[];
  };
};

const ARTICLE_RE = /\bDT[A-Z0-9]{5,}\b/i;

function extractArticle(name: string): string {
  const m = name.match(ARTICLE_RE);
  return m ? m[0].toUpperCase() : "";
}

function articleFamily(article: string): string {
  return article.length >= 5 ? article.slice(0, 5) : article;
}

type UnitDetection = { value: string; unit: string; rank: number };

const UNIT_PATTERNS: Array<{ unit: string; rank: number; re: RegExp; format: (n: string) => string }> = [
  { unit: "mm", rank: 1, re: /(\d+(?:[.,]\d+)?)\s*mm\b/i, format: (n) => `${n} mm` },
  { unit: "cm", rank: 1, re: /(\d+(?:[.,]\d+)?)\s*cm\b/i, format: (n) => `${n} cm` },
  { unit: "m", rank: 1, re: /(\d+(?:[.,]\d+)?)\s*m\b/i, format: (n) => `${n} m` },
  { unit: "inch", rank: 2, re: /(\d+(?:\/\d+)?)\s*(?:″|"|&#8243;|\binch\b|\bin\b)/i, format: (n) => `${n}"` },
  { unit: "L", rank: 3, re: /(\d+(?:[.,]\d+)?)\s*l\b/i, format: (n) => `${n} L` },
  { unit: "ml", rank: 3, re: /(\d+(?:[.,]\d+)?)\s*ml\b/i, format: (n) => `${n} ml` },
  { unit: "kg", rank: 4, re: /(\d+(?:[.,]\d+)?)\s*kg\b/i, format: (n) => `${n} kg` },
  { unit: "g", rank: 4, re: /(\d+(?:[.,]\d+)?)\s*g\b/i, format: (n) => `${n} g` },
  { unit: "cc", rank: 5, re: /(\d+(?:[.,]\d+)?)\s*cc\b/i, format: (n) => `${n} cc` },
  { unit: "Ah", rank: 5, re: /(\d+(?:[.,]\d+)?)\s*ah\b/i, format: (n) => `${n} Ah` },
  { unit: "A", rank: 5, re: /(\d+(?:[.,]\d+)?)\s*a\b(?!h)/i, format: (n) => `${n} A` },
  { unit: "W", rank: 6, re: /(\d+(?:[.,]\d+)?)\s*w\b/i, format: (n) => `${n} W` },
  { unit: "V", rank: 6, re: /(\d+(?:[.,]\d+)?)\s*v\b/i, format: (n) => `${n} V` },
  { unit: "buc", rank: 7, re: /(\d+)\s*buc/i, format: (n) => `${n} buc` },
  { unit: "buc", rank: 7, re: /(\d+)\s*in\s*1/i, format: (n) => `${n} in 1` },
  { unit: "buc", rank: 7, re: /(\d+)\s*piese?/i, format: (n) => `${n} piese` },
];

const UNIT_TITLES: Record<string, string> = {
  mm: "Mărime",
  cm: "Mărime",
  m: "Mărime",
  inch: "Mărime",
  L: "Capacitate",
  ml: "Capacitate",
  kg: "Greutate",
  g: "Greutate",
  cc: "Cilindree",
  Ah: "Capacitate baterie",
  A: "Amperaj",
  W: "Putere",
  V: "Tensiune",
  buc: "Numărul de piese",
};

function detectUnit(text: string): UnitDetection | null {
  let best: UnitDetection | null = null;
  for (const p of UNIT_PATTERNS) {
    const m = text.match(p.re);
    if (m) {
      const candidate: UnitDetection = {
        value: p.format(m[1]),
        unit: p.unit,
        rank: p.rank,
      };
      if (!best || candidate.rank < best.rank) best = candidate;
    }
  }
  return best;
}

function shoeSizeFromArticle(article: string): string | null {
  const m = article.match(/(\d{2})$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n >= 35 && n <= 50) return String(n);
  return null;
}

function deriveHandleFromSlug(family: string, baseName: string): string {
  const slug = baseName
    .toLowerCase()
    .replace(/dyllu/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}-${family.toLowerCase()}`.replace(/-+/g, "-");
}

function deriveHandleFromUrl(url: string): string {
  const last = url.replace(/\/$/, "").split("/").pop() ?? "";
  return decodeURIComponent(last)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const HTML_ENTITY_MAP: Array<[RegExp, string]> = [
  [/&#8243;/g, '"'],
  [/&#8242;/g, "'"],
  [/&#8217;/g, "'"],
  [/&#8211;/g, "-"],
  [/&#8212;/g, "-"],
  [/&nbsp;/g, " "],
  [/&amp;/g, "&"],
  [/&quot;/g, '"'],
];

function decodeEntities(text: string): string {
  let out = text;
  for (const [re, replacement] of HTML_ENTITY_MAP) {
    out = out.replace(re, replacement);
  }
  return out;
}

function cleanClusterName(names: string[]): string {
  // Strip article codes, size tokens, and "DYLLU" from each name, then pick the
  // most common cleaned form. Falls back to the shortest.
  const cleaned = names.map((n) =>
    decodeEntities(n)
      .replace(ARTICLE_RE, "")
      .replace(/\bDYLLU\b/gi, "")
      // strip drive/spec tokens like SL6.5*150mm, PH2*100mm, M14x2 100mm
      .replace(/\b(?:SL|PH|PZ|TX|T|M)\d+(?:[.,]\d+)?(?:\s*[*x×]\s*\d+(?:[.,]\d+)?(?:\s*(?:mm|cm|m))?)+\b/gi, "")
      // strip inch fractions like 1/2", 3/8"
      .replace(/\b\d+\s*\/\s*\d+\s*(?:["″]|inch|in)\b/gi, "")
      // strip pure inch tokens like 27"
      .replace(/\b\d+(?:[.,]\d+)?\s*["″]/g, "")
      // strip values with units
      .replace(/\b\d+(?:[.,]\d+)?\s*(mm|cm|m|km|kg|g|l|ml|w|kw|v|a|ah|hp|hz|cc|rpm|oz|inch|in|buc|piese?)\b/gi, "")
      .replace(/\b\d+(?:[.,]\d+)?x\d+(?:[.,]\d+)?(?:x\d+(?:[.,]\d+)?)?\s*(mm|cm|m)?\b/gi, "")
      .replace(/\b\d+\s*in\s*1\b/gi, "")
      // strip leftover bare numbers (must come last)
      .replace(/\b\d+(?:[.,]\d+)?\b/g, "")
      // strip dangling regex-like leftovers and orphan punctuation
      .replace(/[*×]+/g, "")
      .replace(/[\.,]\s*\*/g, "")
      .replace(/\s*[\/\.][\.,]\s*/g, " ")
      // strip dangling separators ("/", "\", "-") with no value around them
      .replace(/\s+[\/\\\-]+(?=\s|$)/g, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.])/g, "$1")
      .trim()
      .replace(/[-,.\s\*\/\\]+$/g, "")
      .replace(/^[-,.\s\*\/\\]+/g, "")
      .trim()
  );
  const counts = new Map<string, number>();
  for (const c of cleaned) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best = "";
  let bestCount = 0;
  for (const [c, n] of counts) {
    if (n > bestCount || (n === bestCount && c.length < best.length)) {
      best = c;
      bestCount = n;
    }
  }
  return best || cleaned[0] || names[0];
}

function pickLongestDescription(products: ScrapedProduct[]): {
  text: string;
  html: string;
} {
  let bestText = "";
  let bestHtml = "";
  for (const p of products) {
    if (p.descriptionText.length > bestText.length) {
      bestText = p.descriptionText;
      bestHtml = p.descriptionHtml;
    }
  }
  return { text: bestText, html: bestHtml };
}

function buildVariant(
  p: ScrapedProduct,
  optionValueHint: string,
  productImagesSet: Set<string>
): Variant {
  const article = extractArticle(p.name);
  const image = p.images[0];
  if (image) productImagesSet.add(image);
  return {
    title: optionValueHint,
    sku: p.sku,
    internalSku: p.sku,
    article,
    optionValue: optionValueHint,
    priceMdl: p.priceMdl,
    oldPriceMdl: p.oldPriceMdl,
    image,
    sourceUrl: p.sourceUrl,
    sourceId: p.sourceId,
  };
}

function buildSingleton(p: ScrapedProduct): MergedProduct {
  const article = extractArticle(p.name);
  const family = articleFamily(article);
  const images = new Set<string>();
  const variant = buildVariant(p, "Standard", images);
  return {
    kind: "single",
    handle: deriveHandleFromUrl(p.sourceUrl),
    name: p.name,
    descriptionText: p.descriptionText,
    descriptionHtml: p.descriptionHtml,
    brand: p.brand,
    optionTitle: "Variantă",
    variants: [variant],
    images: [...images],
    inStock: p.inStock,
    attributes: p.attributes,
    sourceCategories: p.sourceCategories,
    sourceCategorySlugs: p.sourceCategorySlugs,
    breadcrumbs: p.breadcrumbs,
    metadata: {
      ingco_family: family,
      ingco_articles: article ? [article] : [],
      ingco_source_urls: [p.sourceUrl],
      ingco_source_skus: [p.sku],
    },
  };
}

function buildCluster(family: string, products: ScrapedProduct[]): MergedProduct {
  const sorted = [...products].sort((a, b) => a.priceMdl - b.priceMdl);
  const baseName = cleanClusterName(sorted.map((p) => p.name));

  // Detect unit per variant (decode HTML entities first so `&#8243;` → `"`)
  const detections = sorted.map((p) => {
    const clean = decodeEntities(p.name);
    const fromName = detectUnit(clean);
    if (fromName) return { product: p, detection: fromName };
    const shoe = shoeSizeFromArticle(extractArticle(p.name));
    if (shoe) return { product: p, detection: { value: shoe, unit: "shoe", rank: 0 } };
    return { product: p, detection: null };
  });

  // Pick the dominant unit (lowest rank wins, ties go to most-common)
  const unitCounts = new Map<string, number>();
  for (const { detection } of detections) {
    if (!detection) continue;
    unitCounts.set(detection.unit, (unitCounts.get(detection.unit) ?? 0) + 1);
  }
  let dominantUnit: string | undefined;
  let dominantRank = Infinity;
  let dominantCount = -1;
  for (const { detection } of detections) {
    if (!detection) continue;
    const count = unitCounts.get(detection.unit) ?? 0;
    if (
      detection.rank < dominantRank ||
      (detection.rank === dominantRank && count > dominantCount)
    ) {
      dominantUnit = detection.unit;
      dominantRank = detection.rank;
      dominantCount = count;
    }
  }

  const optionTitle =
    dominantUnit === "shoe"
      ? "Mărime încălțăminte"
      : dominantUnit
        ? (UNIT_TITLES[dominantUnit] ?? "Variantă")
        : "Variantă";

  // Build variants
  const images = new Set<string>();
  const seenOptionValues = new Map<string, number>();
  const variants: Variant[] = detections.map(({ product, detection }) => {
    const article = extractArticle(product.name);
    let raw: string;
    if (detection && detection.unit === dominantUnit) {
      raw = detection.value;
    } else if (dominantUnit === "shoe") {
      raw = shoeSizeFromArticle(article) ?? article.slice(-3);
    } else {
      raw = detection?.value ?? article;
    }
    // Disambiguate duplicates by appending the internal SKU (numeric and
    // guaranteed unique even when article code is repeated on the source)
    const count = seenOptionValues.get(raw) ?? 0;
    seenOptionValues.set(raw, count + 1);
    const value = count > 0 ? `${raw} (${product.sku})` : raw;
    return buildVariant(product, value, images);
  });

  // Second pass: if raw duplicates existed, also disambiguate the first
  // occurrence (otherwise option values are still non-unique on the option)
  const finalSeen = new Map<string, number>();
  for (const v of variants) finalSeen.set(v.optionValue, (finalSeen.get(v.optionValue) ?? 0) + 1);
  const stillDuplicate = [...finalSeen.entries()].some(([, n]) => n > 1);
  if (stillDuplicate) {
    const seen = new Map<string, number>();
    for (const v of variants) {
      const c = seen.get(v.optionValue) ?? 0;
      seen.set(v.optionValue, c + 1);
      v.optionValue = `${v.optionValue} (${v.internalSku ?? v.sku})`;
      v.title = v.optionValue;
    }
  }

  const { text: descriptionText, html: descriptionHtml } =
    pickLongestDescription(sorted);

  // Aggregate attributes — for now, the dominant variant's
  const cheapest = sorted[0];

  const handle = deriveHandleFromSlug(family, baseName);
  return {
    kind: "multi",
    handle,
    name: baseName,
    descriptionText,
    descriptionHtml,
    brand: cheapest.brand,
    optionTitle,
    variants,
    images: [...images],
    inStock: sorted.some((p) => p.inStock),
    attributes: cheapest.attributes,
    sourceCategories: cheapest.sourceCategories,
    sourceCategorySlugs: cheapest.sourceCategorySlugs,
    breadcrumbs: cheapest.breadcrumbs,
    metadata: {
      ingco_family: family,
      ingco_articles: variants.map((v) => v.article),
      ingco_source_urls: sorted.map((p) => p.sourceUrl),
      ingco_source_skus: sorted.map((p) => p.sku),
    },
  };
}

async function main() {
  await rm(MERGED_DIR, { recursive: true, force: true });
  await mkdir(MERGED_DIR, { recursive: true });

  const entries = await readdir(PRODUCTS_DIR);
  const files = entries.filter((e) => e.endsWith(".json"));
  console.log(`[merge] reading ${files.length} scraped JSONs`);

  const byFamily = new Map<string, ScrapedProduct[]>();
  const noFamily: ScrapedProduct[] = [];

  for (const f of files) {
    const data = JSON.parse(
      await readFile(join(PRODUCTS_DIR, f), "utf8")
    ) as ScrapedProduct;
    const article = extractArticle(data.name);
    if (!article) {
      noFamily.push(data);
      continue;
    }
    const fam = articleFamily(article);
    const list = byFamily.get(fam);
    if (list) list.push(data);
    else byFamily.set(fam, [data]);
  }

  // Within each family, also deduplicate exact same source URL (the perie-cupa
  // had a duplicate JSON because of slug encoding)
  for (const [fam, list] of byFamily) {
    const seen = new Set<string>();
    const dedup: ScrapedProduct[] = [];
    for (const p of list) {
      if (seen.has(p.sourceUrl)) continue;
      seen.add(p.sourceUrl);
      dedup.push(p);
    }
    byFamily.set(fam, dedup);
  }

  let singletons = 0;
  let clusters = 0;
  let totalVariants = 0;
  const handleSet = new Set<string>();
  for (const [fam, list] of byFamily) {
    if (list.length === 1) {
      const merged = buildSingleton(list[0]);
      await writeMerged(merged, handleSet);
      singletons++;
    } else {
      const merged = buildCluster(fam, list);
      await writeMerged(merged, handleSet);
      clusters++;
      totalVariants += merged.variants.length;
    }
  }
  for (const orphan of noFamily) {
    const merged = buildSingleton(orphan);
    await writeMerged(merged, handleSet);
    singletons++;
  }

  console.log(
    `[merge] done — ${clusters} multi-variant (${totalVariants} variants), ${singletons} singletons, ${clusters + singletons} total products`
  );
}

async function writeMerged(p: MergedProduct, handleSet: Set<string>) {
  let handle = p.handle;
  let i = 1;
  while (handleSet.has(handle)) {
    i++;
    handle = `${p.handle}-${i}`;
  }
  handleSet.add(handle);
  p.handle = handle;
  await writeFile(
    join(MERGED_DIR, `${handle}.json`),
    JSON.stringify(p, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
