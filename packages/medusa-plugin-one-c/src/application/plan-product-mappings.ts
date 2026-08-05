export type SuggestedMappingItem = {
  id: string;
  externalId: string;
  name: string;
  suggestedMedusaSku: string | null;
  hidden: boolean;
  deleted: boolean;
};

export type MappingVariant = {
  id: string;
  sku: string | null;
};

export type ExistingMapping = {
  externalId: string;
  medusaVariantId: string;
};

export type PlannedMapping = {
  syncItemId: string;
  externalId: string;
  name: string;
  medusaVariantId: string;
  medusaSku: string;
};

export function planExactProductMappings(
  items: SuggestedMappingItem[],
  variants: MappingVariant[],
  existingMappings: ExistingMapping[]
) {
  const suggestionCounts = new Map<string, number>();
  for (const item of items) {
    const sku = item.suggestedMedusaSku?.trim();
    if (sku) suggestionCounts.set(sku, (suggestionCounts.get(sku) ?? 0) + 1);
  }

  const variantsBySku = new Map<string, MappingVariant[]>();
  for (const variant of variants) {
    const sku = variant.sku?.trim();
    if (!sku) continue;
    const values = variantsBySku.get(sku) ?? [];
    values.push(variant);
    variantsBySku.set(sku, values);
  }

  const mappedExternalIds = new Set(
    existingMappings.map((mapping) => mapping.externalId)
  );
  const mappedVariantIds = new Set(
    existingMappings.map((mapping) => mapping.medusaVariantId)
  );
  const mappings: PlannedMapping[] = [];

  for (const item of items) {
    const sku = item.suggestedMedusaSku?.trim();
    if (!sku || item.hidden || item.deleted) continue;
    if ((suggestionCounts.get(sku) ?? 0) !== 1) continue;
    if (mappedExternalIds.has(item.externalId)) continue;
    const matches = variantsBySku.get(sku) ?? [];
    if (matches.length !== 1) continue;
    const variant = matches[0]!;
    if (mappedVariantIds.has(variant.id)) continue;
    mappings.push({
      syncItemId: item.id,
      externalId: item.externalId,
      name: item.name,
      medusaVariantId: variant.id,
      medusaSku: sku,
    });
  }

  return {
    mappings,
    skippedCount: items.length - mappings.length,
  };
}
