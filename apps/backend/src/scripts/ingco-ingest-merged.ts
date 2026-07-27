import {
  ExecArgs,
  PricingTypes,
  ProductTypes,
} from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductsWorkflow,
  createProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

import { revalidateStorefront } from "./_revalidate";
import {
  loadTerminalHandles,
  loadV4Overrides,
  resolveV4Override,
  type V4Override,
} from "./lib/load-v4-product-overrides";
import {
  indexBatteryVariantFamilies,
  loadBatteryVariantFamilies,
  planBatteryVariantImports,
} from "./lib/battery-variant-families";

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

  const v4Overrides = flags.v4Mapping
    ? await loadV4Overrides(flags.v4Mapping)
    : undefined;
  const v4TerminalHandles = v4Overrides
    ? await loadTerminalHandles()
    : undefined;
  if (v4Overrides) {
    logger.info(
      `[ingco-merged] v4 taxonomy enabled: ${v4Overrides.size} SKU overrides, ${v4TerminalHandles!.size} category paths`
    );
  }

  const products: MergedProduct[] = [];
  for (const f of files) {
    products.push(JSON.parse(await readFile(f, "utf8")) as MergedProduct);
  }

  const batteryFamilies = await loadBatteryVariantFamilies(
    flags.familyManifest
  );
  const batteryMemberBySku = indexBatteryVariantFamilies(batteryFamilies);

  // Idempotency: skip products with any variant SKU already in the DB. Handle
  // is NOT a safe identity check here — v4Mapping overrides a product's
  // handle to its canonical_id at creation time, so a re-run's raw file
  // handle no longer matches what's actually in the DB for already-migrated
  // products. SKU is the one thing that's always the true, stable identity.
  const allSkus = products.flatMap((p) => p.variants.map((v) => v.sku));
  const normalizedIncomingSkus = allSkus.map((sku) => sku.toUpperCase());
  if (new Set(normalizedIncomingSkus).size !== normalizedIncomingSkus.length) {
    throw new Error("[ingco-merged] duplicate incoming variant SKU");
  }
  const lookupSkus = [...new Set([...allSkus, ...batteryMemberBySku.keys()])];
  const skuChunks: string[][] = [];
  for (let i = 0; i < lookupSkus.length; i += 200) {
    skuChunks.push(lookupSkus.slice(i, i + 200));
  }
  const existingSkus = new Set<string>();
  const existingProductIdBySku = new Map<string, string>();
  for (const chunk of skuChunks) {
    const { data: existing } = await query.graph({
      entity: "product_variant",
      fields: ["sku", "product_id"],
      filters: { sku: chunk },
    });
    for (const e of existing as Array<{
      sku: string | null;
      product_id: string | null;
    }>) {
      if (e.sku) existingSkus.add(e.sku.toUpperCase());
      if (e.sku && e.product_id) {
        existingProductIdBySku.set(e.sku.toUpperCase(), e.product_id);
      }
    }
  }
  const familyPlan = planBatteryVariantImports({
    families: batteryFamilies,
    incomingSkus: allSkus,
    existingProductIdBySku,
  });
  const unsafeFreshFamilies = familyPlan.create.filter((planned) => {
    const sourceProducts = new Set(
      products
        .filter((product) =>
          product.variants.some((variant) =>
            planned.skus.includes(variant.sku.toUpperCase())
          )
        )
        .map((product) => product.handle)
    );
    return sourceProducts.size > 1;
  });
  if (unsafeFreshFamilies.length > 0) {
    throw new Error(
      `[ingco-merged] fresh reviewed families must be pre-grouped before import: ${unsafeFreshFamilies
        .map((family) => family.familyId)
        .join(", ")}`
    );
  }
  const incomingVariantBySku = new Map(
    products.flatMap((product) =>
      product.variants.map(
        (variant) => [variant.sku.toUpperCase(), variant] as const
      )
    )
  );
  const appendedSkus = new Set<string>();
  const appendProductIds = [
    ...new Set(familyPlan.append.map((item) => item.productId)),
  ];
  const targetProductById = new Map<
    string,
    { options?: Array<{ title: string }> }
  >();
  if (appendProductIds.length > 0) {
    const { data: targetProducts } = await query.graph({
      entity: "product",
      fields: ["id", "options.title"],
      filters: { id: appendProductIds },
    });
    for (const product of targetProducts as Array<{
      id: string;
      options?: Array<{ title: string }>;
    }>) {
      targetProductById.set(product.id, product);
    }
  }
  const appendInputs: Array<
    ProductTypes.CreateProductVariantDTO & {
      prices: PricingTypes.CreateMoneyAmountDTO[];
    }
  > = [];
  for (const planned of familyPlan.append) {
    const familyMembers = planned.skus.map((sku) => {
      const variant = incomingVariantBySku.get(sku);
      const member = batteryMemberBySku.get(sku);
      if (!variant || !member) {
        throw new Error(
          `[ingco-merged] missing reviewed family input for ${sku}`
        );
      }
      return { variant, member };
    });
    const targetProduct = targetProductById.get(planned.productId);
    const optionTitles = new Set(
      (targetProduct?.options ?? []).map((option) => option.title)
    );
    if (optionTitles.size !== 1 || !optionTitles.has("Configurație")) {
      throw new Error(
        `[ingco-merged] family ${planned.familyId} must be normalized to the Configurație option before appending variants`
      );
    }
    appendInputs.push(
      ...familyMembers.map(({ variant, member }) => ({
        product_id: planned.productId,
        title: member.configuration,
        sku: variant.sku,
        manage_inventory: false,
        options: { Configurație: member.configuration },
        prices: [{ currency_code: "mdl", amount: variant.priceMdl }],
        metadata: {
          ingco_article: variant.article,
          ingco_internal_sku: variant.internalSku,
          ingco_source_url: variant.sourceUrl,
          ingco_source_id: variant.sourceId,
          ingco_variant_image: variant.image,
          catalog_variant_family: member.familyId,
          catalog_variant_configuration: member.configuration,
          catalog_variant_position: member.position,
        },
      }))
    );
    for (const sku of planned.skus) appendedSkus.add(sku);
  }
  for (const product of products) {
    const handled = product.variants.filter((variant) =>
      appendedSkus.has(variant.sku.toUpperCase())
    );
    if (handled.length > 0 && handled.length !== product.variants.length) {
      throw new Error(
        `[ingco-merged] source product ${product.handle} mixes appended family variants with unrelated variants`
      );
    }
  }
  if (appendInputs.length > 0) {
    await createProductVariantsWorkflow(container).run({
      input: { product_variants: appendInputs },
    });
    for (const planned of familyPlan.append) {
      logger.info(
        `[ingco-merged] appended ${planned.skus.join(", ")} to family ${planned.familyId}`
      );
    }
  }
  const fresh = products.filter(
    (product) =>
      !product.variants.some((variant) =>
        appendedSkus.has(variant.sku.toUpperCase())
      ) &&
      !product.variants.some((variant) =>
        existingSkus.has(variant.sku.toUpperCase())
      )
  );
  logger.info(
    `[ingco-merged] ${products.length} merged, ${products.length - fresh.length} already in DB, ${fresh.length} to create`
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
        fallbackCategoryId,
        v4Overrides,
        v4TerminalHandles
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
  fallbackCategoryId: string | undefined,
  v4Overrides?: Map<string, V4Override>,
  v4TerminalHandles?: Map<string, string>
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

  let title = p.name;
  let handle = p.handle;
  let categoryId: string | undefined;
  let mappedCategoryLabel: string;

  if (v4Overrides && v4TerminalHandles) {
    const matches = p.variants.map((v) =>
      resolveV4Override(v4Overrides, v.sku)
    );
    const found = matches.filter((m): m is V4Override => !!m);
    if (found.length === 0) {
      throw new Error(
        `[ingco-merged] no v4 mapping for any variant of ${p.handle} (skus: ${p.variants.map((v) => v.sku).join(", ")})`
      );
    }
    const distinctCategoryKeys = new Set(found.map((f) => f.categoryKey));
    if (distinctCategoryKeys.size > 1) {
      throw new Error(
        `[ingco-merged] variants of ${p.handle} map to different v4 categories: ${[...distinctCategoryKeys].join(" | ")}`
      );
    }
    const primary = found[0];
    title = primary.title;
    handle = primary.handle;
    const terminalHandle = v4TerminalHandles.get(primary.categoryKey);
    if (!terminalHandle) {
      throw new Error(
        `[ingco-merged] no terminal category handle for path "${primary.categoryKey}"`
      );
    }
    categoryId = categoryIdByHandle.get(terminalHandle);
    if (!categoryId) {
      throw new Error(
        `[ingco-merged] category handle "${terminalHandle}" not found in DB — re-run generate-category-tree-v4 + db seed first`
      );
    }
    mappedCategoryLabel = "(v4)";
  } else {
    const categoryHandle = resolveCategoryHandle(p);
    categoryId =
      (categoryHandle && categoryIdByHandle.get(categoryHandle)) ??
      fallbackCategoryId;
    mappedCategoryLabel = categoryHandle ?? "(fallback)";
    if (!categoryId) {
      throw new Error(
        `[ingco-merged] no category found for ${p.handle}; resolved=${categoryHandle ?? "none"}, fallback=${fallbackCategoryId ? "found" : "missing"}`
      );
    }
  }

  const description = buildDescription(p);
  const optionValues = p.variants.map((v) => v.optionValue);
  return {
    title,
    handle,
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
      ingco_mapped_category: mappedCategoryLabel,
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
  const description = p.descriptionText
    ?.replace(/(?:^|\n)\s*Specificații\s*:[\s\S]*$/i, "")
    .trim();
  return description || p.name;
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
    v4Mapping?: string;
    familyManifest?: string;
  } = {};
  for (const a of args) {
    const stripped = a.replace(/^--/, "");
    const [key, rawValue] = stripped.split("=");
    if (!key || rawValue === undefined) continue;
    if (key === "limit") out.limit = Number(rawValue);
    else if (key === "batch") out.batch = Number(rawValue);
    else if (key === "dir") out.dir = rawValue;
    else if (key === "fallbackCategory") out.fallbackCategory = rawValue;
    else if (key === "v4Mapping") out.v4Mapping = rawValue;
    else if (key === "familyManifest") out.familyManifest = rawValue;
  }
  return out;
}
