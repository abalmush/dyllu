import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const BASE = "https://ingcomoldova.md";
const API_URL = `${BASE}/wp-json/wc/store/v1/products`;
const BRAND_SLUG = "dyllu";
const PER_PAGE = 100;

const DATA_DIR = join(__dirname, "..", "data", "ingco");
const PRODUCTS_DIR = join(DATA_DIR, "products");
const IMAGES_DIR = join(DATA_DIR, "images");
const URLS_FILE = join(DATA_DIR, "product-urls.json");
const FAILED_FILE = join(DATA_DIR, "failed.json");

const DELAY_MS = Number(process.env.INGCO_DELAY_MS ?? 1200);
const JITTER_MS = Number(process.env.INGCO_JITTER_MS ?? 600);
const MAX_RETRIES = Number(process.env.INGCO_MAX_RETRIES ?? 4);
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type Phase = "products" | "images" | "all";

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

type ApiProduct = {
  id: number;
  name: string;
  slug: string;
  type: string;
  permalink: string;
  sku: string;
  description: string;
  short_description: string;
  on_sale: boolean;
  prices: {
    price: string;
    regular_price: string;
    sale_price: string;
    currency_code: string;
    currency_minor_unit: number;
  };
  is_in_stock?: boolean;
  is_purchasable?: boolean;
  is_on_backorder?: boolean;
  images: Array<{ id: number; src: string; name?: string; alt?: string }>;
  categories: Array<{ id: number; name: string; slug: string; link: string }>;
  brands: Array<{ id: number; name: string; slug: string }>;
  attributes: Array<{
    id: number;
    name: string;
    taxonomy: string;
    terms: Array<{ id: number; name: string; slug: string }>;
  }>;
};

const cli = parseArgs(process.argv.slice(2));

async function main() {
  await ensureDirs();
  const phase = (cli.phase ?? "all") as Phase;
  const limit = cli.limit ?? Infinity;

  if (phase === "products" || phase === "all") {
    await crawlProductsViaApi({ limit });
  }
  if (phase === "images" || phase === "all") {
    await downloadImages({ limit });
  }

  console.log("\nDone.");
}

async function crawlProductsViaApi({ limit }: { limit: number }) {
  console.log(
    `\n[api] fetching DYLLU products via WC Store API (limit=${limit === Infinity ? "all" : limit})`
  );
  const urlSet = new Set<string>();
  const failed: Array<{ id?: number; slug?: string; error: string }> = [];
  let total = 0;
  let written = 0;
  let skipped = 0;
  let page = 1;

  while (written + skipped < limit) {
    const apiUrl = `${API_URL}?brand=${BRAND_SLUG}&per_page=${PER_PAGE}&page=${page}`;
    let products: ApiProduct[];
    try {
      const res = await politeFetchJson<ApiProduct[]>(apiUrl);
      products = res.body;
      if (page === 1) {
        const totalHeader = res.headers.get("x-wp-total");
        if (totalHeader) {
          total = Number(totalHeader);
          console.log(`[api] x-wp-total=${total} products`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[api] page ${page} FAILED: ${msg}`);
      failed.push({ error: `page ${page}: ${msg}` });
      break;
    }
    if (products.length === 0) {
      console.log(`[api] page ${page}: empty — stopping`);
      break;
    }
    for (const apiProduct of products) {
      if (written + skipped >= limit) break;
      const slug = sanitizeSlug(apiProduct.slug);
      urlSet.add(apiProduct.permalink);
      const outPath = join(PRODUCTS_DIR, `${slug}.json`);
      if (await fileExists(outPath)) {
        skipped++;
        continue;
      }
      try {
        const scraped = transformApiProduct(apiProduct);
        await writeFile(outPath, JSON.stringify(scraped, null, 2));
        written++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        failed.push({ id: apiProduct.id, slug: apiProduct.slug, error: msg });
        console.warn(
          `[api] FAILED transform id=${apiProduct.id} slug=${apiProduct.slug}: ${msg}`
        );
      }
    }
    console.log(
      `[api] page ${page}: got ${products.length} (written ${written}, skipped ${skipped})`
    );
    if (products.length < PER_PAGE) {
      console.log(`[api] page ${page} returned <${PER_PAGE} — last page`);
      break;
    }
    page++;
  }

  await writeFile(URLS_FILE, JSON.stringify([...urlSet], null, 2));
  if (failed.length) {
    await writeFile(FAILED_FILE, JSON.stringify(failed, null, 2));
  }
  console.log(
    `[api] done — written=${written} skipped=${skipped} failed=${failed.length} (total source: ${total || "unknown"})`
  );
}

function transformApiProduct(p: ApiProduct): ScrapedProduct {
  const priceMdl = parsePriceFromApi(p.prices.price, p.prices.currency_minor_unit);
  const regularPrice = parsePriceFromApi(
    p.prices.regular_price,
    p.prices.currency_minor_unit
  );
  const oldPriceMdl =
    p.on_sale && regularPrice > priceMdl ? regularPrice : undefined;

  const brandName =
    p.brands?.find((b) => b.slug === BRAND_SLUG)?.name ?? "DYLLU";

  const sourceCategories: string[] = [];
  const sourceCategorySlugs: string[] = [];
  const breadcrumbSlugPath: string[] = [];
  for (const cat of p.categories ?? []) {
    sourceCategories.push(cat.name);
    sourceCategorySlugs.push(cat.slug);
    const fromLink = extractSlugPath(cat.link);
    if (fromLink.length > breadcrumbSlugPath.length) {
      breadcrumbSlugPath.splice(0, breadcrumbSlugPath.length, ...fromLink);
    }
  }

  const attributes: Array<{ key: string; value: string }> = [];
  for (const attr of p.attributes ?? []) {
    if (!attr.terms?.length) continue;
    const value = attr.terms.map((t) => t.name).join(", ");
    attributes.push({ key: attr.name, value });
  }

  const descriptionHtml = (p.description ?? "").trim();
  const descriptionText = stripHtml(descriptionHtml);

  const images = (p.images ?? []).map((img) => img.src).filter(Boolean);

  return {
    sourceId: String(p.id),
    sourceUrl: p.permalink,
    sku: p.sku ?? "",
    internalId: String(p.id),
    name: p.name,
    brand: brandName,
    priceMdl,
    oldPriceMdl,
    inStock: p.is_in_stock ?? true,
    sourceCategories,
    sourceCategorySlugs,
    breadcrumbs: breadcrumbSlugPath,
    attributes,
    descriptionHtml,
    descriptionText,
    images,
    scrapedAt: new Date().toISOString(),
  };
}

function parsePriceFromApi(priceStr: string, minorUnit: number): number {
  const n = Number.parseInt(priceStr, 10);
  if (!Number.isFinite(n)) return 0;
  return minorUnit > 0 ? n / 10 ** minorUnit : n;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "’")
    .replace(/&#8211;/g, "–")
    .replace(/&#8243;/g, "″")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractSlugPath(link: string): string[] {
  try {
    const u = new URL(link);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.filter(
      (p) => p !== "categorie-produs" && p !== "catalog"
    );
  } catch {
    return [];
  }
}

async function downloadImages({ limit }: { limit: number }) {
  const productFiles = await listProductFiles(limit);
  console.log(`\n[images] processing ${productFiles.length} products`);
  let done = 0;
  let saved = 0;
  let skipped = 0;
  let failedCount = 0;
  for (const file of productFiles) {
    const product = JSON.parse(await readFile(file, "utf8")) as ScrapedProduct;
    for (let i = 0; i < product.images.length; i++) {
      const imgUrl = product.images[i];
      if (!imgUrl) continue;
      const ext = extFromUrl(imgUrl);
      const slug = slugFromFilename(file);
      const filename = `${slug}-${i + 1}.${ext}`;
      const outPath = join(IMAGES_DIR, filename);
      if (await fileExists(outPath)) {
        skipped++;
        continue;
      }
      try {
        const buf = await politeFetchBinary(imgUrl);
        await writeFile(outPath, buf);
        saved++;
      } catch (err) {
        failedCount++;
        console.warn(
          `[images] FAILED ${imgUrl}: ${err instanceof Error ? err.message : err}`
        );
      }
    }
    done++;
    if (done % 100 === 0) {
      console.log(`[images] ${done}/${productFiles.length} (saved=${saved})`);
    }
  }
  console.log(
    `[images] products=${done} saved=${saved} skipped=${skipped} failed=${failedCount}`
  );
}

async function politeFetchJson<T>(
  url: string,
  attempt = 0
): Promise<{ body: T; headers: Headers }> {
  await delay(DELAY_MS + Math.random() * JITTER_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    if (res.status === 429 || res.status >= 500) {
      throw new RetryableHttpError(res.status);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} (terminal) ${url}`);
    const body = (await res.json()) as T;
    return { body, headers: res.headers };
  } catch (err) {
    if (attempt >= MAX_RETRIES || !(err instanceof RetryableHttpError)) {
      throw err;
    }
    const backoff = 1000 * 2 ** attempt + Math.random() * 500;
    console.warn(
      `  retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(backoff)}ms (${err.message}) ${url}`
    );
    await delay(backoff);
    return politeFetchJson<T>(url, attempt + 1);
  }
}

async function politeFetchBinary(url: string, attempt = 0): Promise<Uint8Array> {
  await delay(DELAY_MS / 3 + Math.random() * JITTER_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (res.status === 429 || res.status >= 500) {
      throw new RetryableHttpError(res.status);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} (terminal) ${url}`);
    return new Uint8Array(await res.arrayBuffer());
  } catch (err) {
    if (attempt >= MAX_RETRIES || !(err instanceof RetryableHttpError)) {
      throw err;
    }
    const backoff = 1000 * 2 ** attempt + Math.random() * 500;
    await delay(backoff);
    return politeFetchBinary(url, attempt + 1);
  }
}

class RetryableHttpError extends Error {
  constructor(status: number) {
    super(`HTTP ${status}`);
    this.name = "RetryableHttpError";
  }
}

function sanitizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugFromFilename(path: string): string {
  const last = path.split("/").pop() ?? "";
  return last.replace(/\.json$/, "");
}

function extFromUrl(url: string): string {
  const m = url.match(/\.([a-z0-9]{2,5})(?:\?|$)/i);
  return (m?.[1] ?? "webp").toLowerCase();
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function listProductFiles(limit: number): Promise<string[]> {
  const entries = await readdir(PRODUCTS_DIR);
  return entries
    .filter((e) => e.endsWith(".json"))
    .slice(0, limit)
    .map((e) => join(PRODUCTS_DIR, e));
}

async function ensureDirs() {
  await mkdir(PRODUCTS_DIR, { recursive: true });
  await mkdir(IMAGES_DIR, { recursive: true });
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseArgs(args: string[]) {
  const out: { phase?: string; limit?: number } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (!key || rawValue === undefined) continue;
    if (key === "phase") out.phase = rawValue;
    else if (key === "limit") out.limit = Number(rawValue);
  }
  return out;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
