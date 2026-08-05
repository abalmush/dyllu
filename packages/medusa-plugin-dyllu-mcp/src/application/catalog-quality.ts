import {
  CatalogQualityIssue,
  CatalogQualityIssueCode,
  CatalogQualityReport,
  ProductSummary,
} from "../domain/types";

export function createCatalogQualityReport(
  products: ProductSummary[],
  minimumDescriptionLength: number,
  resultLimit: number
): CatalogQualityReport {
  const skuCounts = new Map<string, number>();
  for (const product of products) {
    for (const variant of product.variants) {
      const normalizedSku = normalizeSku(variant.sku);
      if (normalizedSku) {
        skuCounts.set(normalizedSku, (skuCounts.get(normalizedSku) ?? 0) + 1);
      }
    }
  }

  const issueCounts: CatalogQualityReport["issueCounts"] = {};
  const productsWithIssues: CatalogQualityReport["products"] = [];
  for (const product of products) {
    const issues = getProductIssues(
      product,
      minimumDescriptionLength,
      skuCounts
    );
    if (issues.length === 0) {
      continue;
    }
    for (const issue of issues) {
      issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
    }
    productsWithIssues.push({
      productId: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      issues,
    });
  }

  return {
    productCount: products.length,
    productsWithIssues: productsWithIssues.length,
    issueCounts,
    resultsTruncated: productsWithIssues.length > resultLimit,
    products: productsWithIssues.slice(0, resultLimit),
  };
}

function getProductIssues(
  product: ProductSummary,
  minimumDescriptionLength: number,
  skuCounts: Map<string, number>
) {
  const issues: CatalogQualityIssue[] = [];
  if (!product.title.trim()) {
    issues.push(issue("missing_title"));
  }
  if (!product.handle.trim()) {
    issues.push(issue("missing_handle"));
  }
  const descriptionLength = product.description?.trim().length ?? 0;
  if (descriptionLength === 0) {
    issues.push(issue("missing_description"));
  } else if (descriptionLength < minimumDescriptionLength) {
    issues.push(issue("short_description"));
  }
  if (product.imageCount === 0) {
    issues.push(issue("missing_image"));
  }
  if (product.variants.length === 0) {
    issues.push(issue("missing_variant"));
  }

  const missingSku = product.variants.filter((variant) => !normalizeSku(variant.sku));
  if (missingSku.length > 0) {
    issues.push(
      issue(
        "missing_sku",
        missingSku.map((variant) => variant.id)
      )
    );
  }
  const duplicateSku = product.variants.filter((variant) => {
    const normalizedSku = normalizeSku(variant.sku);
    return normalizedSku ? (skuCounts.get(normalizedSku) ?? 0) > 1 : false;
  });
  if (duplicateSku.length > 0) {
    issues.push(
      issue(
        "duplicate_sku",
        duplicateSku.map((variant) => variant.id),
        duplicateSku.map((variant) => variant.sku!)
      )
    );
  }
  const pricesByVariant = product.variants.map((variant) => ({
    variant,
    prices: variant.prices.filter((price) => price.currencyCode === "mdl"),
  }));
  const missingPrices = pricesByVariant.filter(({ prices }) => prices.length === 0);
  if (missingPrices.length > 0) {
    issues.push(
      issue(
        "missing_mdl_price",
        missingPrices.map(({ variant }) => variant.id)
      )
    );
  }
  const duplicatePrices = pricesByVariant.filter(
    ({ prices }) => prices.length > 1
  );
  if (duplicatePrices.length > 0) {
    issues.push(
      issue(
        "duplicate_mdl_price",
        duplicatePrices.map(({ variant }) => variant.id),
        duplicatePrices.flatMap(({ prices }) =>
          prices.map((price) => price.id)
        )
      )
    );
  }
  const invalidPrices = pricesByVariant.filter(({ prices }) =>
    prices.some((price) => price.amount <= 0)
  );
  if (invalidPrices.length > 0) {
    issues.push(
      issue(
        "invalid_mdl_price",
        invalidPrices.map(({ variant }) => variant.id),
        invalidPrices.flatMap(({ prices }) =>
          prices
            .filter((price) => price.amount <= 0)
            .map((price) => String(price.amount))
        )
      )
    );
  }
  return issues;
}

function normalizeSku(sku: string | null) {
  const normalized = sku?.trim().toLocaleUpperCase("en-US") ?? "";
  return normalized || null;
}

function issue(
  code: CatalogQualityIssueCode,
  variantIds: string[] = [],
  values: string[] = []
): CatalogQualityIssue {
  return { code, variantIds, values };
}
