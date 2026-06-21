import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const SOURCE_CATEGORY_MAP: Record<string, string> = {
  "scule-electrice": "scule-electrice",
  "scule-manuale": "scule-manuale",
  "constructie-si-reparatii": "scule-electrice",
  "generatoare-sudura-compresoare": "scule-electrice",
  "ferestraie-cu-lant": "scule-electrice",
  "pompe-si-aprovizionarea-cu-apa": "scule-electrice",
  "tehnica-sanitara-si-clima": "scule-electrice",
  gradinarit: "gradinarie",
  "trimmere-si-cositoare-de-gazon": "gradinarie",
  "motocultoare-si-minitractoare": "gradinarie",
  consumabile: "accesorii",
  "auto-moto": "accesorii",
  "lumina-si-electrica": "accesorii",
  "gospodarie-si-intretinerea-spatiilor": "accesorii",
  "tehnica-de-casa-ingco": "accesorii",
  "echipamente-de-protectie": "protectie",
  "imbracaminte-de-lucru": "haine-de-lucru",
  imbracaminte: "haine-de-lucru",
  incaltaminte: "haine-de-lucru",
  depozitare: "depozitare",
  "cutii-pentru-accesorii": "depozitare",
};

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

export default async function ingcoIngest({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const flags = parseArgs(args ?? []);
  const limit = flags.limit ?? Infinity;
  const dataDir =
    flags.dir ?? resolve(process.cwd(), "data", "ingco", "products");

  logger.info(`[ingco] reading scraped products from ${dataDir}`);
  const files = await listJsonFiles(dataDir, limit);
  if (files.length === 0) {
    logger.warn(`[ingco] no JSON files in ${dataDir} — nothing to ingest`);
    return;
  }
  logger.info(`[ingco] candidate files: ${files.length}`);

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSc = salesChannels.find(
    (sc) => sc.name === "Default Sales Channel"
  ) ?? salesChannels[0];
  if (!defaultSc) throw new Error("No sales channel found; run db:migrate first.");

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfileId = profiles[0]?.id;
  if (!shippingProfileId) {
    throw new Error("No shipping profile found; run db:migrate first.");
  }

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  });
  const categoryIdByHandle = new Map<string, string>(
    categories.map((c: { id: string; handle: string }) => [c.handle, c.id])
  );
  const fallbackCategoryHandle = flags.fallbackCategory ?? "scule-manuale";
  const fallbackCategoryId = categoryIdByHandle.get(fallbackCategoryHandle);
  logger.info(
    `[ingco] category map: ${Object.keys(SOURCE_CATEGORY_MAP).length} source slugs, fallback=${fallbackCategoryHandle} (${fallbackCategoryId ? "found" : "MISSING"})`
  );

  const products: ScrapedProduct[] = [];
  for (const f of files) {
    products.push(JSON.parse(await readFile(f, "utf8")) as ScrapedProduct);
  }

  const handles = products.map((p) => deriveHandle(p));
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: handles },
  });
  const existingHandles = new Set(
    existing.map((p: { handle: string }) => p.handle)
  );
  const fresh = products.filter((p) => !existingHandles.has(deriveHandle(p)));
  logger.info(
    `[ingco] ${products.length} scraped, ${existingHandles.size} already in DB, ${fresh.length} to create`
  );
  if (fresh.length === 0) return;

  const batchSize = Number(flags.batch ?? 10);
  for (let i = 0; i < fresh.length; i += batchSize) {
    const batch = fresh.slice(i, i + batchSize);
    const input = batch.map((p) =>
      toCreateInput(p, shippingProfileId, defaultSc.id, categoryIdByHandle, fallbackCategoryId)
    );
    try {
      const { result } = await createProductsWorkflow(container).run({
        input: { products: input },
      });
      logger.info(
        `[ingco] batch ${i / batchSize + 1}: created ${result.length} (running total ${i + result.length}/${fresh.length})`
      );
    } catch (err) {
      logger.error(
        `[ingco] batch ${i / batchSize + 1} FAILED: ${err instanceof Error ? err.message : err}`
      );
      logger.error(
        `[ingco] failing handles: ${batch.map((p) => deriveHandle(p)).join(", ")}`
      );
      throw err;
    }
  }

  logger.info(`[ingco] done — created ${fresh.length} products`);
}

function toCreateInput(
  p: ScrapedProduct,
  shippingProfileId: string,
  salesChannelId: string,
  categoryIdByHandle: Map<string, string>,
  fallbackCategoryId: string | undefined
) {
  const handle = deriveHandle(p);
  const description = buildDescription(p);
  const categoryHandle = resolveCategoryHandle(p);
  const categoryId =
    (categoryHandle && categoryIdByHandle.get(categoryHandle)) ??
    fallbackCategoryId;
  return {
    title: p.name,
    handle,
    description,
    status: "published" as const,
    shipping_profile_id: shippingProfileId,
    sales_channels: [{ id: salesChannelId }],
    options: [{ title: "Variantă", values: ["Standard"] }],
    images: p.images.map((url) => ({ url })),
    category_ids: categoryId ? [categoryId] : [],
    metadata: {
      ingco_source_id: p.sourceId,
      ingco_source_url: p.sourceUrl,
      ingco_source_sku: p.sku,
      ingco_breadcrumbs: p.breadcrumbs.join(" > "),
      ingco_source_categories: p.sourceCategories.join(", "),
      ingco_article: extractArticle(p.name),
      ingco_in_stock: p.inStock,
      ingco_mapped_category: categoryHandle ?? "(fallback)",
    },
    variants: [
      {
        title: "Standard",
        sku: p.sku,
        manage_inventory: false,
        options: { Variantă: "Standard" },
        prices: [
          {
            currency_code: "mdl",
            amount: p.priceMdl,
          },
        ],
      },
    ],
  };
}

function resolveCategoryHandle(p: ScrapedProduct): string | undefined {
  for (const slug of p.breadcrumbs ?? []) {
    if (SOURCE_CATEGORY_MAP[slug]) return SOURCE_CATEGORY_MAP[slug];
  }
  for (const slug of p.sourceCategorySlugs ?? []) {
    if (SOURCE_CATEGORY_MAP[slug]) return SOURCE_CATEGORY_MAP[slug];
  }
  return undefined;
}

function buildDescription(p: ScrapedProduct): string {
  const parts: string[] = [];
  if (p.descriptionText) parts.push(p.descriptionText);
  if (p.attributes.length) {
    const specs = p.attributes
      .map((a) => `${a.key}: ${a.value}`)
      .join("\n");
    parts.push(`\nSpecificații:\n${specs}`);
  }
  return parts.join("\n\n") || p.name;
}

function deriveHandle(p: ScrapedProduct): string {
  const raw = p.sourceUrl
    .replace(/\/$/, "")
    .split("/")
    .pop() ?? "";
  return decodeURIComponent(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractArticle(name: string): string {
  const match = name.match(/\bDT[A-Z0-9]{5,}\b/i);
  return match?.[0]?.toUpperCase() ?? "";
}

async function listJsonFiles(dir: string, limit: number): Promise<string[]> {
  try {
    await stat(dir);
  } catch {
    return [];
  }
  const entries = await readdir(dir);
  return entries
    .filter((e) => e.endsWith(".json"))
    .sort()
    .slice(0, limit)
    .map((e) => join(dir, e));
}

function parseArgs(args: string[]) {
  const out: {
    limit?: number;
    batch?: number;
    dir?: string;
    fallbackCategory?: string;
  } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (!key || rawValue === undefined) continue;
    if (key === "limit") out.limit = Number(rawValue);
    else if (key === "batch") out.batch = Number(rawValue);
    else if (key === "dir") out.dir = rawValue;
    else if (key === "fallbackCategory") out.fallbackCategory = rawValue;
  }
  return out;
}
