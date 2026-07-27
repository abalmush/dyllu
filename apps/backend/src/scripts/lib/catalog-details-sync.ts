const PRODUCT_CATALOG_FACT_KEYS = new Set([
  "specs",
  "included_items",
  "bundle_components",
  "battery_included",
  "battery_count",
  "battery_capacity",
  "battery_voltage",
  "charger_included",
  "case_included",
  "power_source",
  "platform",
  "requires_battery",
  "description",
  "short_description",
  "why_good",
  "seo_text",
  "highlights",
  "use_cases",
  "catalog_power_evidence",
  "catalog_source_sku",
  "catalog_source_kind",
  "catalog_source_row",
  "catalog_source_name_en",
  "catalog_source_description",
  "catalog_marketing_type",
  "catalog_sales_unit",
  "catalog_picture",
  "catalog_stock",
  "catalog_discount",
  "catalog_is_gift",
]);

export function clearProductCatalogFacts(
  metadata: Record<string, unknown> | null
): Record<string, unknown> {
  const preservedMetadata = Object.fromEntries(
    Object.entries(metadata ?? {}).filter(
      ([key]) => !PRODUCT_CATALOG_FACT_KEYS.has(key)
    )
  );

  return {
    ...preservedMetadata,
    ...Object.fromEntries(
      [...PRODUCT_CATALOG_FACT_KEYS].map((key) => [key, null])
    ),
  };
}

export function assertCatalogSyncPlanIsSafe({
  sourceRowCount,
  scopedVariantCount,
  matchingVariantCount,
  requestedSku,
}: {
  sourceRowCount: number;
  scopedVariantCount: number;
  matchingVariantCount: number;
  requestedSku?: string;
}) {
  if (sourceRowCount < 1) {
    throw new Error("The catalog projection contains no source rows");
  }
  if (scopedVariantCount < 1) {
    throw new Error("Medusa contains no variants in the requested scope");
  }
  if (matchingVariantCount < 0 || matchingVariantCount > scopedVariantCount) {
    throw new Error("The catalog sync plan contains invalid variant counts");
  }
  if (matchingVariantCount < 1) {
    throw new Error("No Medusa variants match the catalog projection");
  }
  if (requestedSku && matchingVariantCount !== scopedVariantCount) {
    throw new Error(
      `SKU ${requestedSku} is not fully represented in the catalog projection`
    );
  }
}
