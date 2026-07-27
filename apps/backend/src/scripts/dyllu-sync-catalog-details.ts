import { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { revalidateStorefront } from "./_revalidate";
import {
  assertCatalogSyncPlanIsSafe,
  clearProductCatalogFacts,
} from "./lib/catalog-details-sync";

type SourceComponent = {
  qty: number;
  unit: string;
  name: string;
  display_name_ro?: string;
  component_sku: string | null;
};

type SourceEntry = {
  source_row: number;
  name_en: string;
  description: string;
  marketing_type: string | null;
  sales_unit: string | null;
  price_mdl: number;
  picture: string | null;
  highlights_ro: string[];
  specs: Array<{ label: string; value: string }>;
  components: SourceComponent[];
  packaging: string | null;
  stock: {
    received: number | null;
    on_the_way: number | null;
    planned_to_ship: number | null;
  };
  discount: number | null;
  is_gift: boolean;
  power: {
    power_source: string;
    platform: string | null;
    battery_voltage: string | null;
    battery_included: "yes" | "no";
    battery_count: number | null;
    battery_capacity: string | null;
    charger_included: "yes" | "no";
    requires_battery: boolean;
  } | null;
};

type CatalogPayload = {
  schema_version: 1;
  source: {
    name: string;
    sha256: string;
    row_count: number;
  };
  items: Record<string, SourceEntry>;
};

type VariantRow = {
  id: string;
  sku: string | null;
  metadata: Record<string, unknown> | null;
  product: {
    id: string;
    metadata: Record<string, unknown> | null;
  } | null;
};

const SOURCE_SKU_BY_CATALOG_SKU = new Map([
  ["DTCD1B1285", "DTCD1B12856"],
  ["DTCD1B78", "DTCD1B785"],
]);

const BATTERY_RE = /(acumulator|baterie|battery|batteries)/i;
const CHARGER_RE = /(încărcător|incarcator|charger)/i;
const CASE_RE = /(cutie|valiză|valiza|case|box|bmc)/i;
function parseArgs(args: string[]) {
  const out: { dryRun: boolean; source?: string; batch: number; sku?: string } =
    {
      dryRun: true,
      batch: 50,
    };
  for (const arg of args) {
    const [key, rawValue] = arg.replace(/^--/, "").split("=");
    if (key === "dryRun") out.dryRun = rawValue !== "false";
    else if (key === "source" && rawValue) out.source = rawValue;
    else if (key === "batch" && rawValue) out.batch = Number(rawValue);
    else if (key === "sku" && rawValue) out.sku = rawValue.toUpperCase();
  }
  return out;
}

export default async function dylluSyncCatalogDetails({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Omit<
    RemoteQueryFunction,
    symbol
  >;
  const flags = parseArgs(args ?? []);
  if (!flags.source) throw new Error("source=<absolute-json-path> is required");
  if (!Number.isInteger(flags.batch) || flags.batch < 1) {
    throw new Error("batch must be a positive integer");
  }

  const payload = JSON.parse(
    await readFile(resolve(flags.source), "utf8")
  ) as CatalogPayload;
  if (
    payload.schema_version !== 1 ||
    payload.source?.name !== "Dyllu Full range price MDL.csv" ||
    !payload.source.sha256 ||
    !payload.items
  ) {
    throw new Error(
      "source must be a catalog projection generated from Dyllu Full range price MDL.csv"
    );
  }
  const source = payload.items;
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "metadata", "product.id", "product.metadata"],
    pagination: { skip: 0, take: 5000 },
  });
  const variants = data as VariantRow[];
  const scopedVariants = flags.sku
    ? variants.filter((variant) => variant.sku?.toUpperCase() === flags.sku)
    : variants;
  if (flags.sku && scopedVariants.length === 0) {
    throw new Error(`No Medusa variant found for SKU ${flags.sku}`);
  }
  const catalogSkuByNormalized = new Map(
    variants.flatMap((variant) =>
      variant.sku ? [[variant.sku.toUpperCase(), variant.sku] as const] : []
    )
  );
  const unmatchedVariantSkus = scopedVariants.flatMap((variant) => {
    if (!variant.sku) return ["<missing SKU>"];
    const catalogSku = variant.sku.toUpperCase();
    const sourceSku = SOURCE_SKU_BY_CATALOG_SKU.get(catalogSku) ?? catalogSku;
    return source[sourceSku] ? [] : [variant.sku];
  });
  const productsWithUnmatchedVariants = new Set(
    variants.flatMap((variant) => {
      if (!variant.product) return [];
      if (!variant.sku) return [variant.product.id];
      const catalogSku = variant.sku.toUpperCase();
      const sourceSku = SOURCE_SKU_BY_CATALOG_SKU.get(catalogSku) ?? catalogSku;
      return source[sourceSku] ? [] : [variant.product.id];
    })
  );

  let linkedComponents = 0;
  let textComponents = 0;
  const missingComponentProducts = new Map<string, Set<string>>();
  const productUpdates = new Map<
    string,
    { id: string; metadata: Record<string, unknown> }
  >();
  const updates = scopedVariants.flatMap((variant) => {
    if (!variant.sku) return [];
    const catalogSku = variant.sku.toUpperCase();
    const sourceSku = SOURCE_SKU_BY_CATALOG_SKU.get(catalogSku) ?? catalogSku;
    const entry = source[sourceSku];
    if (!entry) return [];

    const components = entry.components.map((component) => {
      const linkedSku = component.component_sku
        ? catalogSkuByNormalized.get(component.component_sku.toUpperCase())
        : undefined;
      if (linkedSku) linkedComponents += 1;
      else {
        textComponents += 1;
        if (component.component_sku) {
          const missingSku = component.component_sku.toUpperCase();
          const parents =
            missingComponentProducts.get(missingSku) ?? new Set<string>();
          parents.add(catalogSku);
          missingComponentProducts.set(missingSku, parents);
        }
      }
      return {
        qty: component.qty,
        unit: component.unit,
        name: component.display_name_ro ?? component.name,
        sku: linkedSku ?? component.component_sku ?? null,
        resolution: linkedSku ? "linked" : "loose",
      };
    });
    const batteryCount = components
      .filter((component) => BATTERY_RE.test(component.name))
      .reduce((total, component) => total + component.qty, 0);
    const chargerIncluded = components.some((component) =>
      CHARGER_RE.test(component.name)
    );
    const caseIncluded =
      components.some((component) => CASE_RE.test(component.name)) ||
      CASE_RE.test(entry.packaging ?? "");
    const sourcePower = entry.power;
    if (
      variant.product &&
      !productsWithUnmatchedVariants.has(variant.product.id)
    ) {
      productUpdates.set(variant.product.id, {
        id: variant.product.id,
        metadata: clearProductCatalogFacts(variant.product.metadata),
      });
    }

    return [
      {
        id: variant.id,
        prices: [{ amount: entry.price_mdl, currency_code: "mdl" }],
        metadata: {
          ...(variant.metadata ?? {}),
          catalog_source_sku: sourceSku,
          catalog_source_kind: "catalog_csv",
          catalog_source_row: entry.source_row,
          catalog_source_name_en: entry.name_en,
          catalog_source_description: entry.description,
          catalog_marketing_type: entry.marketing_type,
          catalog_sales_unit: entry.sales_unit,
          catalog_picture: entry.picture,
          catalog_stock: JSON.stringify(entry.stock),
          catalog_discount: entry.discount,
          catalog_is_gift: entry.is_gift,
          description: entry.description,
          short_description: null,
          why_good: null,
          seo_text: null,
          highlights: JSON.stringify(entry.highlights_ro),
          use_cases: JSON.stringify([]),
          specs: JSON.stringify(entry.specs),
          bundle_components: JSON.stringify(components),
          included_items: JSON.stringify([]),
          power_source: sourcePower?.power_source ?? null,
          platform: sourcePower?.platform ?? null,
          battery_voltage: sourcePower?.battery_voltage ?? null,
          battery_included: sourcePower?.battery_included ?? null,
          battery_count:
            sourcePower?.battery_count ??
            (batteryCount > 0 ? batteryCount : null),
          battery_capacity: sourcePower?.battery_capacity ?? null,
          charger_included:
            sourcePower?.charger_included ?? (chargerIncluded ? "yes" : null),
          requires_battery: sourcePower?.requires_battery ?? false,
          case_included: caseIncluded ? "yes" : "no",
        },
      },
    ];
  });

  assertCatalogSyncPlanIsSafe({
    sourceRowCount: Object.keys(source).length,
    scopedVariantCount: scopedVariants.length,
    matchingVariantCount: updates.length,
    requestedSku: flags.sku,
  });

  logger.info(
    `[catalog-details-sync] ${Object.keys(source).length} CSV rows (${payload.source.sha256.slice(0, 12)}); ` +
      `${updates.length}/${scopedVariants.length} variant matches; ${productUpdates.size} product metadata cleanups; ` +
      `${linkedComponents} linked components; ` +
      `${textComponents} text-only components`
  );
  if (unmatchedVariantSkus.length > 0) {
    logger.warn(
      `[catalog-details-sync] ${unmatchedVariantSkus.length} variants are absent from the CSV: ` +
        `${unmatchedVariantSkus.slice(0, 30).join(", ")}; leaving them unchanged`
    );
  }
  if (missingComponentProducts.size > 0) {
    logger.warn(
      `[catalog-details-sync] ${missingComponentProducts.size} referenced component SKUs have no Medusa variant: ` +
        [...missingComponentProducts.entries()]
          .slice(0, 30)
          .map(([sku, parents]) => `${sku} (${parents.size} products)`)
          .join(", ")
    );
  }
  if (flags.dryRun) {
    logger.info("[catalog-details-sync] DRY RUN — not writing to DB");
    return;
  }

  for (let i = 0; i < updates.length; i += flags.batch) {
    const batch = updates.slice(i, i + flags.batch);
    await updateProductVariantsWorkflow(container).run({
      input: { product_variants: batch },
    });
    logger.info(
      `[catalog-details-sync] updated ${i + batch.length}/${updates.length} variants`
    );
  }

  const products = [...productUpdates.values()];
  for (let i = 0; i < products.length; i += flags.batch) {
    const batch = products.slice(i, i + flags.batch);
    await updateProductsWorkflow(container).run({
      input: { products: batch },
    });
    logger.info(
      `[catalog-details-sync] cleaned product metadata ${i + batch.length}/${products.length}`
    );
  }

  await revalidateStorefront(logger);
}
