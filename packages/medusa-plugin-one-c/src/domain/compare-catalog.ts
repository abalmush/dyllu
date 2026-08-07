import { NormalizedOneCProduct } from "./normalize-product-feed";

export type MedusaCatalogVariant = {
  productId: string;
  productTitle: string;
  productDescription: string | null;
  productStatus: string;
  productUpdatedAt: Date;
  variantId: string;
  variantTitle: string;
  variantUpdatedAt: Date;
  sku: string | null;
  prices: Array<{
    id: string;
    currencyCode: string;
    amount: number;
    updatedAt: Date;
  }>;
  // TODO(Task 7): medusa-adapters.ts MedusaOneCCatalogReader.listVariants must populate this; tsc fails there until it does.
  salePriceListEntry: { id: string; amount: number } | null;
};

export type CatalogComparison = {
  externalId: string;
  sku: string;
  source: NormalizedOneCProduct;
  mappingStatus: "matched" | "missing_medusa" | "ambiguous" | "excluded";
  medusaProductId: string | null;
  medusaVariantId: string | null;
  medusaProductTitle: string | null;
  suggestedMedusaSku: string | null;
  differences: Array<{
    field:
      | "name"
      | "description"
      | "regular_price_mdl"
      | "sale_price_mdl"
      | "status";
    before: string | number | boolean | null;
    proposed: string | number | boolean | null;
  }>;
};

export function compareCatalog(
  products: NormalizedOneCProduct[],
  medusaVariants: MedusaCatalogVariant[],
  mappings?: Array<{
    externalId: string;
    medusaVariantId: string;
    medusaSku: string;
  }>
): CatalogComparison[] {
  const sourceSkuCounts = new Map<string, number>();
  for (const product of products) {
    sourceSkuCounts.set(
      product.sku,
      (sourceSkuCounts.get(product.sku) ?? 0) + 1
    );
  }
  const variantsBySku = new Map<string, MedusaCatalogVariant[]>();
  const canonicalSku = new Map<string, string>();
  const variantsById = new Map(
    medusaVariants.map((variant) => [variant.variantId, variant])
  );
  const mappingsByExternalId = new Map(
    (mappings ?? []).map((mapping) => [mapping.externalId, mapping])
  );
  for (const variant of medusaVariants) {
    const sku = variant.sku?.trim();
    if (!sku) continue;
    const variants = variantsBySku.get(sku) ?? [];
    variants.push(variant);
    variantsBySku.set(sku, variants);
    canonicalSku.set(sku.toUpperCase(), sku);
  }

  return products.map((product) => {
    const mapped =
      mappings === undefined
        ? null
        : mappingsByExternalId.get(product.externalId);
    const displaySku =
      mappings === undefined ? product.sku : (mapped?.medusaSku ?? "");
    const suggestedMedusaSku =
      mappings === undefined || mapped
        ? null
        : suggestSku(product.name, canonicalSku);
    if (product.hidden || product.deleted) {
      return emptyComparison(
        product,
        "excluded",
        displaySku,
        suggestedMedusaSku
      );
    }
    if ((sourceSkuCounts.get(product.sku) ?? 0) > 1) {
      return emptyComparison(
        product,
        "ambiguous",
        displaySku,
        suggestedMedusaSku
      );
    }
    const mappedVariant = mapped
      ? variantsById.get(mapped.medusaVariantId)
      : null;
    const matches =
      mappings === undefined
        ? (variantsBySku.get(product.sku) ?? [])
        : mappedVariant
          ? [mappedVariant]
          : [];
    if (matches.length === 0) {
      return emptyComparison(
        product,
        "missing_medusa",
        displaySku,
        suggestedMedusaSku
      );
    }
    if (matches.length > 1) {
      return emptyComparison(
        product,
        "ambiguous",
        displaySku,
        suggestedMedusaSku
      );
    }

    const match = matches[0]!;
    const differences: CatalogComparison["differences"] = [];
    if (match.productTitle !== product.name) {
      differences.push({
        field: "name",
        before: match.productTitle,
        proposed: product.name,
      });
    }
    if ((match.productDescription ?? "") !== product.description) {
      differences.push({
        field: "description",
        before: match.productDescription ?? "",
        proposed: product.description,
      });
    }
    const mdlPrice = match.prices.find(
      (price) => price.currencyCode.toLowerCase() === "mdl"
    );
    if (
      product.regularPriceMdl !== null &&
      mdlPrice?.amount !== product.regularPriceMdl
    ) {
      differences.push({
        field: "regular_price_mdl",
        before: mdlPrice?.amount ?? null,
        proposed: product.regularPriceMdl,
      });
    }
    const currentSaleAmount = match.salePriceListEntry?.amount ?? null;
    const proposedSaleAmount = product.salePriceMdl ?? null;
    if (proposedSaleAmount !== currentSaleAmount) {
      differences.push({
        field: "sale_price_mdl",
        before: currentSaleAmount,
        proposed: proposedSaleAmount,
      });
    }
    return {
      externalId: product.externalId,
      sku: match.sku?.trim() ?? mapped?.medusaSku ?? "",
      source: product,
      mappingStatus: "matched",
      medusaProductId: match.productId,
      medusaVariantId: match.variantId,
      medusaProductTitle: match.productTitle,
      suggestedMedusaSku: null,
      differences,
    };
  });
}

function emptyComparison(
  product: NormalizedOneCProduct,
  mappingStatus: "missing_medusa" | "ambiguous" | "excluded",
  sku = product.sku,
  suggestedMedusaSku: string | null = null
): CatalogComparison {
  return {
    externalId: product.externalId,
    sku,
    source: product,
    mappingStatus,
    medusaProductId: null,
    medusaVariantId: null,
    medusaProductTitle: null,
    suggestedMedusaSku,
    differences: [],
  };
}

function suggestSku(name: string, canonicalSku: Map<string, string>) {
  const tokens = name.toUpperCase().match(/[A-Z0-9][A-Z0-9_-]*/g) ?? [];
  const matches = [
    ...new Set(tokens.flatMap((token) => canonicalSku.get(token) ?? [])),
  ];
  return matches.length === 1 ? matches[0]! : null;
}
