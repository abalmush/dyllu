import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { revalidateStorefront } from "./_revalidate";

const SOURCE_CATEGORY_MAP: Record<string, string> = {
  "scule-electrice": "scule-electrice",
  "scule-manuale": "scule-manuale",
  "constructie-si-reparatii": "constructii",
  "generatoare-sudura-compresoare": "scule-electrice",
  "ferestraie-cu-lant": "gradinarit",
  "pompe-si-aprovizionarea-cu-apa": "gradinarit",
  "tehnica-sanitara-si-clima": "constructii",
  gradinarit: "gradinarit",
  "trimmere-si-cositoare-de-gazon": "gradinarit",
  "motocultoare-si-minitractoare": "gradinarit",
  consumabile: "consumabile-si-accesorii",
  "auto-moto": "auto-si-moto",
  "lumina-si-electrica": "electrice",
  "gospodarie-si-intretinerea-spatiilor": "electrice",
  "tehnica-de-casa-ingco": "electrice",
  "echipamente-de-protectie": "echipament-de-protectie",
  "imbracaminte-de-lucru": "echipament-de-protectie",
  imbracaminte: "echipament-de-protectie",
  incaltaminte: "echipament-de-protectie",
  depozitare: "depozitare",
  "cutii-pentru-accesorii": "depozitare",
};

type MergedVariant = {
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
  categoryHandle?: string;
  classification?: Record<string, unknown>;
  variants: MergedVariant[];
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

export default async function ingcoIngestMerged({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const flags = parseArgs(args ?? []);
  const limit = flags.limit ?? Infinity;
  const dataDir =
    flags.dir ?? resolve(process.cwd(), "data", "ingco", "products-merged");

  logger.info(`[ingco-merged] reading merged products from ${dataDir}`);
  const files = await listJsonFiles(dataDir, limit);
  if (files.length === 0) {
    logger.warn(`[ingco-merged] no JSON files in ${dataDir}`);
    return;
  }
  logger.info(`[ingco-merged] candidate files: ${files.length}`);

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  });
  const defaultSc =
    salesChannels.find((sc) => sc.name === "Default Sales Channel") ??
    salesChannels[0];
  if (!defaultSc)
    throw new Error("No sales channel found; run db:migrate first.");

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
    `[ingco-merged] category map: ${Object.keys(SOURCE_CATEGORY_MAP).length} source slugs, fallback=${fallbackCategoryHandle} (${fallbackCategoryId ? "found" : "MISSING"})`
  );

  const products: MergedProduct[] = [];
  for (const f of files) {
    products.push(JSON.parse(await readFile(f, "utf8")) as MergedProduct);
  }

  // Idempotency: skip products whose handle is already in the DB
  const handles = products.map((p) => p.handle);
  const handleChunks: string[][] = [];
  for (let i = 0; i < handles.length; i += 200) {
    handleChunks.push(handles.slice(i, i + 200));
  }
  const existingHandles = new Set<string>();
  for (const chunk of handleChunks) {
    const { data: existing } = await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: { handle: chunk },
    });
    for (const e of existing as Array<{ handle: string }>) {
      existingHandles.add(e.handle);
    }
  }
  const fresh = products.filter((p) => !existingHandles.has(p.handle));
  logger.info(
    `[ingco-merged] ${products.length} merged, ${existingHandles.size} already in DB, ${fresh.length} to create`
  );
  if (fresh.length === 0) return;

  const stats = { single: 0, multi: 0, variants: 0 };
  for (const p of fresh) {
    if (p.kind === "multi") {
      stats.multi++;
      stats.variants += p.variants.length;
    } else {
      stats.single++;
    }
  }
  logger.info(
    `[ingco-merged] to create: ${stats.single} singletons + ${stats.multi} multi-variant (${stats.variants} variants)`
  );

  const batchSize = Number(flags.batch ?? 10);
  for (let i = 0; i < fresh.length; i += batchSize) {
    const batch = fresh.slice(i, i + batchSize);
    const input = batch.map((p) =>
      toCreateInput(
        p,
        shippingProfileId,
        defaultSc.id,
        categoryIdByHandle,
        fallbackCategoryId
      )
    );
    try {
      const { result } = await createProductsWorkflow(container).run({
        input: { products: input },
      });
      logger.info(
        `[ingco-merged] batch ${i / batchSize + 1}: created ${result.length} (running total ${i + result.length}/${fresh.length})`
      );
    } catch (err) {
      logger.error(
        `[ingco-merged] batch ${i / batchSize + 1} FAILED: ${err instanceof Error ? err.message : err}`
      );
      logger.error(
        `[ingco-merged] failing handles: ${batch.map((p) => p.handle).join(", ")}`
      );
      throw err;
    }
  }

  logger.info(`[ingco-merged] done — created ${fresh.length} products`);

  await revalidateStorefront(logger);
}

function toCreateInput(
  p: MergedProduct,
  shippingProfileId: string,
  salesChannelId: string,
  categoryIdByHandle: Map<string, string>,
  fallbackCategoryId: string | undefined
) {
  if (!p.handle || !p.name || p.variants.length === 0) {
    throw new Error("Merged product is missing a handle, name, or variant");
  }
  for (const variant of p.variants) {
    if (
      !variant.sku ||
      !Number.isFinite(variant.priceMdl) ||
      variant.priceMdl <= 0
    ) {
      throw new Error(`Invalid SKU or price for ${p.handle}`);
    }
  }

  const description = buildDescription(p);
  const categoryHandle = resolveCategoryHandle(p);
  const categoryId =
    (categoryHandle && categoryIdByHandle.get(categoryHandle)) ??
    fallbackCategoryId;
  const optionValues = p.variants.map((v) => v.optionValue);
  return {
    title: p.name,
    handle: p.handle,
    description,
    status: (p.inStock ? "published" : "draft") as "published" | "draft",
    shipping_profile_id: shippingProfileId,
    sales_channels: [{ id: salesChannelId }],
    options: [{ title: p.optionTitle, values: optionValues }],
    images: p.images.map((url) => ({ url })),
    category_ids: categoryId ? [categoryId] : [],
    metadata: {
      // classification (platform / accessory_kind / requires_battery / voltage)
      // computed upstream in the catalog pipeline — drives PDP accessories & combos
      ...(p.classification ?? {}),
      ingco_family: p.metadata.ingco_family,
      ingco_articles: p.metadata.ingco_articles.join(","),
      ingco_source_urls: p.metadata.ingco_source_urls.join("\n"),
      ingco_source_skus: p.metadata.ingco_source_skus.join(","),
      ingco_breadcrumbs: p.breadcrumbs.join(" > "),
      ingco_source_categories: p.sourceCategories.join(", "),
      ingco_kind: p.kind,
      ingco_in_stock: p.inStock,
      ingco_mapped_category: categoryHandle ?? "(fallback)",
    },
    variants: p.variants.map((v) => ({
      title: v.optionValue,
      sku: v.sku,
      manage_inventory: false,
      options: { [p.optionTitle]: v.optionValue },
      prices: [{ currency_code: "mdl", amount: v.priceMdl }],
      metadata: {
        ingco_article: v.article,
        ingco_internal_sku: v.internalSku,
        ingco_source_url: v.sourceUrl,
        ingco_source_id: v.sourceId,
        ingco_variant_image: v.image,
      },
    })),
  };
}

function resolveCategoryHandle(p: MergedProduct): string | undefined {
  // Explicit leaf handle from the catalog pipeline wins — lands the product in the
  // correct sub-category. Falls back to the source-breadcrumb → root map below.
  if (p.categoryHandle) return p.categoryHandle;
  for (const slug of p.breadcrumbs ?? []) {
    if (SOURCE_CATEGORY_MAP[slug]) return SOURCE_CATEGORY_MAP[slug];
  }
  for (const slug of p.sourceCategorySlugs ?? []) {
    if (SOURCE_CATEGORY_MAP[slug]) return SOURCE_CATEGORY_MAP[slug];
  }
  return undefined;
}

function buildDescription(p: MergedProduct): string {
  const parts: string[] = [];
  if (p.descriptionText) parts.push(p.descriptionText);
  if (p.attributes.length) {
    const specs = p.attributes.map((a) => `${a.key}: ${a.value}`).join("\n");
    parts.push(`\nSpecificații:\n${specs}`);
  }
  if (p.kind === "multi" && p.variants.length > 1) {
    const skus = p.variants.map((v) => v.article).join(", ");
    parts.push(`\nCoduri produs: ${skus}`);
  }
  return parts.join("\n\n") || p.name;
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
