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
};

export type CatalogComparison = {
  externalId: string;
  sku: string;
  source: NormalizedOneCProduct;
  mappingStatus: "matched" | "missing_medusa" | "ambiguous" | "excluded";
  medusaProductId: string | null;
  medusaVariantId: string | null;
  medusaProductTitle: string | null;
  differences: Array<{
    field: "name" | "description" | "regular_price_mdl" | "status";
    before: string | number | boolean | null;
    proposed: string | number | boolean | null;
  }>;
};

export function compareCatalog(
  products: NormalizedOneCProduct[],
  medusaVariants: MedusaCatalogVariant[]
): CatalogComparison[] {
  const sourceSkuCounts = new Map<string, number>();
  for (const product of products) {
    sourceSkuCounts.set(
      product.sku,
      (sourceSkuCounts.get(product.sku) ?? 0) + 1
    );
  }
  const variantsBySku = new Map<string, MedusaCatalogVariant[]>();
  for (const variant of medusaVariants) {
    const sku = variant.sku?.trim();
    if (!sku) continue;
    const variants = variantsBySku.get(sku) ?? [];
    variants.push(variant);
    variantsBySku.set(sku, variants);
  }

  return products.map((product) => {
    if (product.hidden || product.deleted) {
      return emptyComparison(product, "excluded");
    }
    if ((sourceSkuCounts.get(product.sku) ?? 0) > 1) {
      return emptyComparison(product, "ambiguous");
    }
    const matches = variantsBySku.get(product.sku) ?? [];
    if (matches.length === 0) {
      return emptyComparison(product, "missing_medusa");
    }
    if (matches.length > 1) {
      return emptyComparison(product, "ambiguous");
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
    return {
      externalId: product.externalId,
      sku: product.sku,
      source: product,
      mappingStatus: "matched",
      medusaProductId: match.productId,
      medusaVariantId: match.variantId,
      medusaProductTitle: match.productTitle,
      differences,
    };
  });
}

function emptyComparison(
  product: NormalizedOneCProduct,
  mappingStatus: "missing_medusa" | "ambiguous" | "excluded"
): CatalogComparison {
  return {
    externalId: product.externalId,
    sku: product.sku,
    source: product,
    mappingStatus,
    medusaProductId: null,
    medusaVariantId: null,
    medusaProductTitle: null,
    differences: [],
  };
}
