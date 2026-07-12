import { HttpTypes } from "@medusajs/types";

import type { ComboItem } from "@/components/organisms/pdp-hero-combo";
import type { ProductType } from "@/components/organisms/product-type-badge";
import type {
  LinkedProduct,
  LinkedRelation,
} from "@/components/organisms/linked-products";
import type { SetPiece } from "@/components/organisms/set-breakdown";

type ProductMetadata = Record<string, unknown>;

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

export function getProductUiType(product: HttpTypes.StoreProduct): ProductType {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const sourceCategory = String(
    metadata.ingco_source_categories ?? ""
  ).toLowerCase();
  const title = String(product.title ?? "").toLowerCase();
  const accessoryKind = String(metadata.accessory_kind ?? "");
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

  if (!accessoryKind && hasBundledPowerAccessories) {
    return "combo";
  }

  if (metadata.requires_battery === true) {
    return "needs-battery";
  }

  return "single";
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
  product: HttpTypes.StoreProduct
): ProductBreadcrumb[] {
  const metadata = (product.metadata ?? {}) as ProductMetadata;
  const category = product.categories?.[0];
  const sourceCategory = String(metadata.ingco_source_categories ?? "")
    .split(",")[0]
    ?.trim();

  return [
    { label: "Acasă", href: "/" },
    { label: "Magazin", href: "/store" },
    ...(category?.handle && category.name
      ? [{ label: category.name, href: `/categories/${category.handle}` }]
      : sourceCategory
        ? [
            {
              label: sourceCategory,
              href: `/categories/${slugify(sourceCategory)}`,
            },
          ]
        : []),
    { label: product.title ?? "Produs" },
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
