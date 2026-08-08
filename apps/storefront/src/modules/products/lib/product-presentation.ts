import { HttpTypes } from "@medusajs/types";

import { normalizeCatalogBrand } from "@lib/util/catalog-brand";

import type { ComboItem } from "@/components/organisms/pdp-hero-combo";
import type { PowerSourceKind } from "@/components/organisms/power-source-badge";
import type { ProductType } from "@/components/organisms/product-type-badge";
import type {
  LinkedProduct,
  LinkedRelation,
} from "@/components/organisms/linked-products";
import type { SetPiece } from "@/components/organisms/set-breakdown";

type ProductMetadata = Record<string, unknown>;

export type ProductSpecification = {
  label: string;
  value: string;
};

export type ProductPowerSupply = {
  powerSource: string;
  platform?: string;
  batteryIncluded?: boolean;
  batteryCount?: number;
  batteryCapacity?: string;
  chargerIncluded?: boolean;
  compatibleBatteries: Array<{ sku: string; capacityAh?: number }>;
  compatibleChargers: Array<{ sku: string; outputA?: number }>;
};

export type IncludedAccessoryRelationship = {
  sku?: string;
  name?: string;
  quantity: number;
  kind?: "battery" | "charger";
};

function metadataValue(
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant | undefined,
  key: string
): unknown {
  const variantMetadata = (variant?.metadata ?? {}) as ProductMetadata;
  if (variantMetadata[key] !== undefined) return variantMetadata[key];

  return ((product.metadata ?? {}) as ProductMetadata)[key];
}

function metadataBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "yes" || normalized === "true") return true;
  if (normalized === "no" || normalized === "false") return false;
  return undefined;
}

const TECHNICAL_MEASUREMENT_RE =
  /\b\d[\d.,/–—~×x-]*\s*(?:V|W|kW|A|Ah|mAh|N\s*[·.]?\s*m|Nm|J|rpm|rot\/min|bpm|lovituri\/min|mm|cm|m|L|ml|bar|MPa|kPa|PSI|m\/s|m³\/min|°C|Hz)\b/i;
const TECHNICAL_MEASUREMENT_TOKEN_RE =
  /\b\d[\d.,/–—~×x-]*\s*(?:V|W|kW|A|Ah|mAh|N\s*[·.]?\s*m|Nm|J|rpm|rot\/min|bpm|lovituri\/min|mm|cm|m|L|ml|bar|MPa|kPa|PSI|m\/s|m³\/min|°C|Hz)\b/gi;
function inferAccessoryKind(name?: string): "battery" | "charger" | undefined {
  if (!name?.trim()) return undefined;
  if (/(acumulator|acumulatori|baterie|baterii|battery|batteries)/i.test(name))
    return "battery";
  if (/(încărcător|incarcator|charger)/i.test(name)) return "charger";
  return undefined;
}

function metadataString(
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant | undefined,
  key: string
): string | undefined {
  const value = metadataValue(product, variant, key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function metadataStringArray(value: unknown): string[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }

  return Array.isArray(parsed)
    ? parsed.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : [];
}

function includedRelationships(
  value: unknown
): IncludedAccessoryRelationship[] {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    const rawSku =
      typeof record.sku === "string"
        ? record.sku
        : typeof record.component_sku === "string"
          ? record.component_sku
          : typeof record.target_sku === "string"
            ? record.target_sku
            : "";
    const rawName =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim()
        : undefined;
    if (!rawSku.trim() && !rawName) return [];
    const rawQuantity =
      typeof record.qty === "number"
        ? record.qty
        : typeof record.qty === "string"
          ? Number(record.qty)
          : typeof record.quantity === "number"
            ? record.quantity
            : typeof record.quantity === "string"
              ? Number(record.quantity)
              : 1;

    return [
      {
        sku: rawSku.trim() || undefined,
        name: rawName,
        kind: inferAccessoryKind(
          typeof record.name === "string" ? record.name : undefined
        ),
        quantity:
          Number.isFinite(rawQuantity) && rawQuantity > 0
            ? Math.floor(rawQuantity)
            : 1,
      },
    ];
  });
}

function getExplicitIncludedRelationships(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): IncludedAccessoryRelationship[] {
  return ["bundle_components", "included_items"].flatMap((key) =>
    includedRelationships(metadataValue(product, variant, key))
  );
}

export function getIncludedAccessoryRelationships(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): IncludedAccessoryRelationship[] {
  const relationships = getExplicitIncludedRelationships(product, variant);

  const mergedRelationships = new Map<string, IncludedAccessoryRelationship>();
  for (const relationship of relationships) {
    const quantity = Number.isFinite(relationship.quantity)
      ? Math.max(1, Math.floor(relationship.quantity))
      : 1;
    const key = `${relationship.kind ?? "unknown"}:${relationship.sku ?? relationship.name}`;
    const existing = mergedRelationships.get(key);
    if (!existing) {
      mergedRelationships.set(key, {
        ...relationship,
        quantity,
      });
      continue;
    }

    mergedRelationships.set(key, {
      ...existing,
      quantity: existing.quantity + quantity,
    });
  }

  return Array.from(mergedRelationships.values());
}

export function stripSpecificationSection(value?: string | null): string {
  if (!value?.trim()) return "";
  const specificationStart = value.search(/(?:^|\n)\s*Specificații\s*:/i);
  return (
    specificationStart >= 0 ? value.slice(0, specificationStart) : value
  ).trim();
}

function safeNarrativeSentences(value?: string): string {
  if (!value) return "";
  return value
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !TECHNICAL_MEASUREMENT_RE.test(sentence))
    .join(" ")
    .trim();
}

function normalizedMeasurementTokens(value: string): Set<string> {
  return new Set(
    (value.match(TECHNICAL_MEASUREMENT_TOKEN_RE) ?? []).map((token) =>
      token
        .toLocaleLowerCase("ro")
        .replace(/,/g, ".")
        .replace(/[\s·]/g, "")
        .replace(/n\.m$/, "nm")
    )
  );
}

function safeIntro(value: string, trustedTitle?: string | null): string {
  const trustedTokens = normalizedMeasurementTokens(trustedTitle ?? "");
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => {
      const punctuation = sentence.match(/[.!?]$/)?.[0] ?? "";
      const body = punctuation ? sentence.slice(0, -1) : sentence;
      const clauses = body.split(/;\s*|,\s+(?=\p{L})/u).filter((clause) => {
        const claims = normalizedMeasurementTokens(clause);
        return (
          claims.size === 0 ||
          [...claims].every((claim) => trustedTokens.has(claim))
        );
      });
      return clauses.length ? `${clauses.join(", ")}${punctuation}` : "";
    })
    .filter(Boolean)
    .join(" ")
    .trim();
}

function uniqueDescriptionParagraphs(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const normalized = value
      .toLocaleLowerCase("ro")
      .replace(/\s+/g, " ")
      .trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function compatiblePowerAccessories(
  value: unknown,
  numericKey: "capacity_ah" | "output_a"
): Array<{ sku: string; value?: number }> {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as Record<string, unknown>;
    if (typeof record.sku !== "string" || !record.sku.trim()) return [];
    const numericValue = record[numericKey];
    return [
      {
        sku: record.sku.trim(),
        value:
          typeof numericValue === "number" && Number.isFinite(numericValue)
            ? numericValue
            : undefined,
      },
    ];
  });
}

function resolvePowerSource(
  product: HttpTypes.StoreProduct,
  variant: HttpTypes.StoreProductVariant | undefined
): string | undefined {
  const rawPowerSource = metadataValue(product, variant, "power_source");
  if (typeof rawPowerSource === "string" && rawPowerSource.trim()) {
    return rawPowerSource.trim().toLowerCase();
  }

  return metadataBoolean(metadataValue(product, variant, "requires_battery"))
    ? "cordless_battery"
    : undefined;
}

const POWER_SOURCE_KINDS: Record<string, PowerSourceKind> = {
  cordless_battery: "cordless",
  corded: "corded",
  petrol: "petrol",
  pneumatic: "pneumatic",
};

export function getPowerSourceKind(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): PowerSourceKind | undefined {
  const powerSource = resolvePowerSource(product, variant);
  return powerSource ? POWER_SOURCE_KINDS[powerSource] : undefined;
}

export function getProductPowerSupply(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): ProductPowerSupply | undefined {
  const requiresBattery = metadataBoolean(
    metadataValue(product, variant, "requires_battery")
  );
  const powerSource = resolvePowerSource(product, variant);

  if (!powerSource) return undefined;

  const rawCount = metadataValue(product, variant, "battery_count");
  const batteryCount =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string"
        ? Number.parseInt(rawCount, 10)
        : undefined;
  const rawCapacity = metadataValue(product, variant, "battery_capacity");
  const batteryCapacity =
    typeof rawCapacity === "string" && rawCapacity.trim()
      ? rawCapacity.trim()
      : undefined;
  const rawPlatform = metadataValue(product, variant, "platform");
  const platform =
    typeof rawPlatform === "string" && rawPlatform.trim()
      ? rawPlatform.trim()
      : undefined;
  const batteries = compatiblePowerAccessories(
    metadataValue(product, variant, "compatible_batteries"),
    "capacity_ah"
  );
  const chargers = compatiblePowerAccessories(
    metadataValue(product, variant, "compatible_chargers"),
    "output_a"
  );

  const explicitRelationships = getExplicitIncludedRelationships(
    product,
    variant
  );
  const linkedBatteries = explicitRelationships.filter(
    (relationship) => relationship.kind === "battery"
  );
  const linkedChargers = explicitRelationships.filter(
    (relationship) => relationship.kind === "charger"
  );
  const linkedBatteryCount = linkedBatteries.reduce(
    (sum, relationship) => sum + relationship.quantity,
    0
  );

  return {
    powerSource,
    platform,
    batteryIncluded:
      linkedBatteries.length > 0
        ? true
        : (metadataBoolean(
            metadataValue(product, variant, "battery_included")
          ) ?? (requiresBattery ? false : undefined)),
    batteryCount:
      linkedBatteryCount > 0
        ? linkedBatteryCount
        : batteryCount !== undefined && batteryCount > 0
          ? batteryCount
          : undefined,
    batteryCapacity,
    chargerIncluded:
      linkedChargers.length > 0
        ? true
        : metadataBoolean(metadataValue(product, variant, "charger_included")),
    compatibleBatteries: batteries.map(({ sku, value }) => ({
      sku,
      capacityAh: value,
    })),
    compatibleChargers: chargers.map(({ sku, value }) => ({
      sku,
      outputA: value,
    })),
  };
}

const BATTERY_INCLUDED_RE =
  /\b(acumulator|încărcător|incarcator|charger|battery)\b/i;
const NON_INCLUDED_LINE_RE =
  /^(ambalat|mânere|manere|tensiune|motor|vitez|lungime|diametru|putere|cuplu|frecven|setări|setari|funcție|functie|lumină|lumina)\b/i;
const SET_COUNT_RE = /(\d+)\s*(?:buc(?:\.|ăți)?|piese)\b/i;

export type ParsedKitItem = {
  code?: string;
  id: string;
  label: string;
  qty: number;
};

export type ProductBreadcrumb = {
  label: string;
  href?: string;
};

export function getProductEyebrow(
  product: HttpTypes.StoreProduct
): string | undefined {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const category = metadata.ingco_source_categories;
  if (typeof category !== "string" || category.length === 0) {
    return undefined;
  }

  return category.split(",")[0]?.trim() || undefined;
}

export function getProductUiType(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): ProductType {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const powerSupply = getProductPowerSupply(product, variant);

  // A "Configurație" option (bare vs. tool+battery+charger kit) is an authoritative
  // variant selector: the shopper must be able to pick a configuration, so this
  // product always renders the interactive purchase card — never a static
  // combo/kit/set breakdown (the bare hero's description may still list a battery).
  const hasConfigurationOption = (product.options ?? []).some(
    (o) => (o.title ?? "").trim().toLowerCase() === "configurație"
  );

  if (hasConfigurationOption) {
    return powerSupply?.powerSource === "cordless_battery" &&
      powerSupply?.batteryIncluded === false
      ? "needs-battery"
      : "single";
  }

  const sourceCategory = String(
    metadata.ingco_source_categories ?? ""
  ).toLowerCase();
  const title = String(product.title ?? "").toLowerCase();
  const includedItems = parseKitItems(product.description);
  const setCount = getSetCount(product, includedItems);
  const hasBundledPowerAccessories = includedItems.some((item) =>
    BATTERY_INCLUDED_RE.test(item.label)
  );
  const platform = getEffectivePlatform(product);
  const looksLikeSet =
    title.startsWith("set") ||
    sourceCategory.includes("set") ||
    sourceCategory.includes("truse");
  const isBatterySet =
    sourceCategory.includes("seturi de scule pe baterie") ||
    (title.startsWith("set ") &&
      (platform.startsWith("dyllu-") || hasBundledPowerAccessories));

  if (isBatterySet) {
    return "kit";
  }

  if (
    looksLikeSet &&
    setCount > 1 &&
    !sourceCategory.includes("seturi de scule pe baterie")
  ) {
    return "set";
  }

  // A single tool that merely ships with its own batteries/charger (or its
  // standard accessories) is NOT a combo — it renders the normal purchase PDP,
  // and its bundled contents show in an "Include în cutie" section. The combo/kit
  // templates are reserved for genuine multi-tool bundles (handled above).
  //
  // Only cordless power tools "need" a battery — a battery not being included
  // is meaningless for a manual/corded/pneumatic/petrol tool (or the battery
  // product itself, whose own power_source is "battery").
  if (
    powerSupply?.powerSource === "cordless_battery" &&
    powerSupply?.batteryIncluded === false
  ) {
    return "needs-battery";
  }

  return "single";
}

export function getSelectedVariant(
  product: HttpTypes.StoreProduct,
  variantId?: string
): HttpTypes.StoreProductVariant | undefined {
  if (!product.variants?.length) return undefined;

  return (
    product.variants.find((variant) => variant.id === variantId) ??
    product.variants[0]
  );
}

export function getVariantDisplayTitle(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): string {
  const powerSupply = getProductPowerSupply(product, variant);
  let productTitle = normalizeCatalogBrand(
    product.title?.trim() || "Produs DYLLU"
  );

  if (powerSupply?.chargerIncluded === false) {
    productTitle = productTitle
      .replace(/\s+(?:și|cu)\s+încărcător(?=\s+Dyllu\b|[,.]|$)/giu, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  if (!variant || (product.variants?.length ?? 0) <= 1) return productTitle;

  const variantTitle = variant.title?.trim();
  if (!variantTitle || /^default(?:\s+variant)?$/i.test(variantTitle)) {
    return productTitle;
  }

  return `${productTitle} — ${normalizeCatalogBrand(variantTitle)}`;
}

export function getVariantDescription(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): string | undefined {
  const explicitDescription = metadataString(product, variant, "description");
  const intro = safeIntro(
    stripSpecificationSection(
      metadataString(product, variant, "short_description") ||
        explicitDescription ||
        product.description
    ),
    product.title
  );
  const reason = safeNarrativeSentences(
    metadataString(product, variant, "why_good") ||
      metadataString(product, variant, "seo_text")
  );
  const highlights = metadataStringArray(
    metadataValue(product, variant, "highlights")
  ).filter((highlight) => !TECHNICAL_MEASUREMENT_RE.test(highlight));
  const useCases = metadataStringArray(
    metadataValue(product, variant, "use_cases")
  );
  const description = uniqueDescriptionParagraphs([
    intro,
    reason,
    highlights.length ? `Avantaje: ${highlights.join("; ")}.` : "",
    useCases.length ? `Recomandat pentru: ${useCases.join("; ")}.` : "",
  ]).join("\n\n");

  return description ? normalizeCatalogBrand(description) : undefined;
}

export function getVariantSpecifications(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): ProductSpecification[] {
  const variantSpecs = parseSpecifications(
    ((variant?.metadata ?? {}) as ProductMetadata).specs
  );
  if (variantSpecs.length > 0) return variantSpecs;

  return parseSpecifications(
    ((product.metadata ?? {}) as ProductMetadata).specs
  );
}

export function getVariantImageUrl(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): string | undefined {
  const directImage = variant?.images?.[0]?.url;
  if (directImage) return directImage;

  return product.thumbnail ?? product.images?.[0]?.url ?? undefined;
}

export function getVariantImages(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): HttpTypes.StoreProductImage[] {
  const images = variant?.images?.length
    ? variant.images
    : (product.images ?? []);
  const originalImage = metadataString(product, variant, "original_image");

  if (!originalImage || images.some((image) => image.url === originalImage)) {
    return images;
  }

  return [
    ...images,
    {
      id: `original-${variant?.id ?? product.id}`,
      url: originalImage,
    } as HttpTypes.StoreProductImage,
  ];
}

export function isVariantInStock(
  variant?: HttpTypes.StoreProductVariant
): boolean {
  if (!variant) return false;
  if (variant.manage_inventory !== true) return true;

  return (variant.inventory_quantity ?? 0) > 0 || !!variant.allow_backorder;
}

function parseSpecifications(raw: unknown): ProductSpecification[] {
  let value = raw;

  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (spec): spec is ProductSpecification =>
        !!spec &&
        typeof spec === "object" &&
        typeof (spec as ProductSpecification).label === "string" &&
        typeof (spec as ProductSpecification).value === "string"
    )
    .map((spec) => ({
      label: spec.label.trim(),
      value: spec.value.trim(),
    }))
    .filter((spec) => spec.label.length > 0 && spec.value.length > 0);
}

export function getEffectivePlatform(product: HttpTypes.StoreProduct): string {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const explicitPlatform = String(metadata.platform ?? "");
  if (explicitPlatform.startsWith("dyllu-")) {
    return explicitPlatform;
  }

  const category = String(metadata.ingco_source_categories ?? "").toLowerCase();
  const description = String(product.description ?? "").toLowerCase();
  const batteryVoltage = String(metadata.battery_voltage ?? "").trim();
  const isBatteryKit =
    category.includes("seturi de scule pe baterie") ||
    description.includes("acumulator");

  if (isBatteryKit && batteryVoltage) {
    return `dyllu-${batteryVoltage}v`;
  }

  return explicitPlatform;
}

export function parseKitItems(description?: string | null): ParsedKitItem[] {
  if (!description) return [];

  const lines = description
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .flatMap((line) => {
      const inlineInclude = line.match(/^include:\s*(.+)$/i);
      if (inlineInclude?.[1]) {
        return ["Include:", inlineInclude[1].trim()];
      }

      return [line];
    })
    .filter(Boolean);

  const items: ParsedKitItem[] = [];
  let inIncludeBlock = false;

  for (const line of lines) {
    if (/^include:?$/i.test(line)) {
      inIncludeBlock = true;
      continue;
    }

    if (/:$/.test(line) && !/^conține\b/i.test(line)) {
      inIncludeBlock = false;
    }

    const parsedLine = parseIncludedLine(line);
    if (parsedLine) {
      items.push(parsedLine);
      continue;
    }

    if (/^Ambalat\b/i.test(line) && items.length > 0) {
      const label = cleanKitLabel(line.replace(/^Ambalat\s+în\s+/i, "").trim());
      items.push({
        id: slugify(label),
        label,
        qty: 1,
      });
      inIncludeBlock = false;
      continue;
    }

    if (inIncludeBlock && NON_INCLUDED_LINE_RE.test(line)) {
      inIncludeBlock = false;
      continue;
    }

    if (inIncludeBlock && !/:/.test(line)) {
      const label = cleanKitLabel(line.replace(/^[-–•]\s*/, ""));
      items.push({
        code: extractArticleCode(label),
        id: slugify(label),
        label,
        qty: 1,
      });
    }
  }

  return items;
}

export function toSetPieces(
  items: ParsedKitItem[],
  imageByCode = new Map<string, string>()
): SetPiece[] {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    image: item.code ? imageByCode.get(item.code) : undefined,
    qty: item.qty,
  }));
}

// Included-item labels that are a plastic case/box. These don't sell separately
// (no SKU) but should still show in "what's included" with a shared box image.
const PLASTIC_BOX_RE = /cutie\s+(?:de|din)\s+plastic|cutie\s+tip\s+bmc/i;
const PLASTIC_BOX_IMAGE = "/images/dyllu-box.png";

export function toComboItems(
  items: ParsedKitItem[],
  imageByCode = new Map<string, string>()
): ComboItem[] {
  return items.map((item) => ({
    id: item.id,
    name: item.label,
    image: item.code
      ? (imageByCode.get(item.code) ?? "")
      : PLASTIC_BOX_RE.test(item.label)
        ? PLASTIC_BOX_IMAGE
        : "",
    quantity: item.qty,
  }));
}

export function getPieceCount(items: ParsedKitItem[]): number {
  return items.reduce((sum, item) => sum + Math.max(1, item.qty), 0);
}

export function getSetCount(
  product: HttpTypes.StoreProduct,
  parsedItems = parseKitItems(product.description)
): number {
  const title = String(product.title ?? "");
  const match = title.match(SET_COUNT_RE);
  if (match?.[1]) {
    return Number.parseInt(match[1], 10);
  }

  return parsedItems.length > 1 ? getPieceCount(parsedItems) : 0;
}

export function getPrimaryArticleCode(product: HttpTypes.StoreProduct) {
  const metadata = (product.variants?.[0]?.metadata ?? {}) as ProductMetadata;
  const article = metadata.ingco_article;
  return typeof article === "string" && article.length > 0
    ? article
    : undefined;
}

export function getVariantImage(product: HttpTypes.StoreProduct) {
  return product.thumbnail || product.images?.[0]?.url || "";
}

export function getProductCategoryLabel(
  product: HttpTypes.StoreProduct
): string | undefined {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const sourceCategory = String(metadata.ingco_source_categories ?? "");
  if (sourceCategory) {
    return sourceCategory.split(",")[0]?.trim() || undefined;
  }

  return product.categories?.[0]?.name;
}

export function buildProductBreadcrumbs(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
): ProductBreadcrumb[] {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const category = product.categories?.[0];
  const sourceCategory = String(metadata.ingco_source_categories ?? "")
    .split(",")[0]
    ?.trim();
  const normalizeCategoryLabel = (value?: string) =>
    (value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => `${word[0]?.toUpperCase()}${word.slice(1)}`)
      .join(" ");
  const breadcrumbCategory = category?.name
    ? normalizeCategoryLabel(category.name)
    : sourceCategory
      ? normalizeCategoryLabel(sourceCategory)
      : undefined;
  const categorySlug =
    category?.handle ?? (sourceCategory ? slugify(sourceCategory) : "");
  const categoryPath = categorySlug
    ? `/categories/${slugify(categorySlug)}`
    : undefined;

  return [
    { label: "Acasă", href: "/" },
    ...(breadcrumbCategory && categoryPath
      ? [{ label: breadcrumbCategory, href: categoryPath }]
      : []),
    { label: getVariantDisplayTitle(product, variant) },
  ];
}

export function isProductInStock(product: HttpTypes.StoreProduct): boolean {
  const variant = product.variants?.[0];
  if (!variant) return false;

  return variant.manage_inventory === true
    ? (variant.inventory_quantity ?? 0) > 0 || !!variant.allow_backorder
    : true;
}

export function toLinkedProduct(
  product: HttpTypes.StoreProduct,
  relation: LinkedRelation,
  compatibility?: string
): LinkedProduct | null {
  const variant = product.variants?.[0];
  const price = variant?.calculated_price?.calculated_amount;
  const image = getVariantImage(product);

  if (typeof price !== "number" || !product.handle || !image) {
    return null;
  }

  return {
    id: product.id,
    handle: product.handle,
    name: product.title ?? "Produs compatibil",
    image,
    price,
    relation,
    compatibility,
    inStock:
      variant?.manage_inventory === true
        ? (variant.inventory_quantity ?? 0) > 0 || !!variant.allow_backorder
        : true,
    variantId: variant?.id,
  };
}

export function prettifyPlatform(platform: string): string {
  if (platform === "dyllu-20v") return "DYLLU 20V Max";
  if (platform === "dyllu-12v") return "DYLLU 12V";
  return platform.replace(/^dyllu-/, "DYLLU ").toUpperCase();
}

function cleanKitLabel(label: string) {
  return label.replace(/\s+/g, " ").trim().replace(/\.$/, "");
}

function parseIncludedLine(line: string): ParsedKitItem | null {
  const normalized = line.replace(/^[-–•]\s*/, "");
  const includedMatch = normalized.match(
    /^(?:Conține\s+)?(\d+)\s*(?:x|buc\.?)?\s+(.+)$/i
  );
  if (!includedMatch) {
    return null;
  }

  const qty = Number.parseInt(includedMatch[1] ?? "1", 10);
  const label = cleanKitLabel(includedMatch[2] ?? line);
  const code = extractArticleCode(label);

  return {
    code,
    id: code ?? slugify(label),
    label,
    qty: Number.isFinite(qty) ? qty : 1,
  };
}

function extractArticleCode(label: string) {
  const match = label.match(/\(([A-Z0-9-]+)\)/);
  return match?.[1];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
