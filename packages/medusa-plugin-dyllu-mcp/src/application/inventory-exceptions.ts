import {
  InventoryExceptionCode,
  InventoryExceptionReport,
  InventoryVariantSnapshot,
} from "../domain/types";

export function createInventoryExceptionReport(
  variants: InventoryVariantSnapshot[],
  input: {
    lowStockThreshold: number;
    resultLimit: number;
    publishedOnly: boolean;
  }
): InventoryExceptionReport {
  const scopedVariants = input.publishedOnly
    ? variants.filter((variant) => variant.productStatus === "published")
    : variants;
  const managedVariants = scopedVariants.filter(
    (variant) => variant.manageInventory
  );
  const exceptionCounts: InventoryExceptionReport["exceptionCounts"] = {};
  const results: InventoryExceptionReport["variants"] = [];

  for (const variant of managedVariants) {
    const codes: InventoryExceptionCode[] = [];
    const availableQuantity = getAvailableQuantity(variant);
    if (variant.items.length === 0) {
      codes.push("missing_inventory_item");
    } else if (variant.items.some((item) => item.levels.length === 0)) {
      codes.push("missing_inventory_level");
    }
    if (
      variant.items.some((item) =>
        item.levels.some((level) => level.availableQuantity < 0)
      )
    ) {
      codes.push("negative_available");
    }
    if (
      availableQuantity !== null &&
      availableQuantity <= 0 &&
      !variant.allowBackorder
    ) {
      codes.push("out_of_stock");
    }
    if (
      availableQuantity !== null &&
      availableQuantity > 0 &&
      availableQuantity <= input.lowStockThreshold
    ) {
      codes.push("low_stock");
    }
    if (
      variant.items.some((item) =>
        item.levels.some(
          (level) => level.reservedQuantity > level.stockedQuantity
        )
      )
    ) {
      codes.push("reservation_exceeds_stock");
    }
    if (codes.length === 0) {
      continue;
    }
    for (const code of codes) {
      exceptionCounts[code] = (exceptionCounts[code] ?? 0) + 1;
    }
    results.push({
      productId: variant.productId,
      productTitle: variant.productTitle,
      variantId: variant.variantId,
      variantTitle: variant.variantTitle,
      sku: variant.sku,
      availableQuantity,
      allowBackorder: variant.allowBackorder,
      codes,
      items: variant.items,
    });
  }

  return {
    scannedVariantCount: scopedVariants.length,
    managedVariantCount: managedVariants.length,
    variantsWithExceptions: results.length,
    exceptionCounts,
    resultsTruncated: results.length > input.resultLimit,
    variants: results.slice(0, input.resultLimit),
  };
}

function getAvailableQuantity(variant: InventoryVariantSnapshot) {
  if (
    variant.items.length === 0 ||
    variant.items.some(
      (item) => item.levels.length === 0 || item.requiredQuantity <= 0
    )
  ) {
    return null;
  }
  return Math.min(
    ...variant.items.map((item) =>
      Math.floor(
        item.levels.reduce(
          (total, level) => total + level.availableQuantity,
          0
        ) / item.requiredQuantity
      )
    )
  );
}
