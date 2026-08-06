import { normalizeCatalogBrand } from "./normalize-brand";

export type ProductForIndexing = {
  id: string;
  title: string;
  description: string | null;
  handle: string;
  thumbnail: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  tags: { value: string }[];
  categories: { id: string; name: string }[];
  variants: {
    sku: string | null;
    title: string;
    calculated_price: {
      calculated_amount: number;
      original_amount: number;
    } | null;
  }[];
};

export type AlgoliaProductRecord = {
  objectID: string;
  title: string;
  description: string;
  handle: string;
  thumbnail: string | null;
  skus: string[];
  variant_titles: string[];
  category_names: string[];
  category_ids: string[];
  tags: string[];
  metadata: string;
  price: number | null;
  original_price: number | null;
  on_sale: boolean;
  created_at: number;
};

type PricedVariant = ProductForIndexing["variants"][number] & {
  calculated_price: NonNullable<
    ProductForIndexing["variants"][number]["calculated_price"]
  >;
};

function flattenMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "";
  return Object.values(metadata)
    .filter(
      (value): value is string | number =>
        typeof value === "string" || typeof value === "number"
    )
    .map(String)
    .join(" ");
}

export function buildAlgoliaRecord(
  product: ProductForIndexing
): AlgoliaProductRecord {
  const pricedVariants: PricedVariant[] = product.variants.filter(
    (variant): variant is PricedVariant => variant.calculated_price !== null
  );

  const cheapest = pricedVariants.reduce<PricedVariant | null>(
    (lowest, variant) =>
      !lowest ||
      variant.calculated_price.calculated_amount <
        lowest.calculated_price.calculated_amount
        ? variant
        : lowest,
    null
  );

  return {
    objectID: product.id,
    title: normalizeCatalogBrand(product.title),
    description: normalizeCatalogBrand(product.description ?? ""),
    handle: product.handle,
    thumbnail: product.thumbnail,
    skus: product.variants
      .map((variant) => variant.sku)
      .filter((sku): sku is string => Boolean(sku)),
    variant_titles: product.variants.map((variant) => variant.title),
    category_names: product.categories.map((category) => category.name),
    category_ids: product.categories.map((category) => category.id),
    tags: product.tags.map((tag) => tag.value),
    metadata: flattenMetadata(product.metadata),
    price: cheapest?.calculated_price.calculated_amount ?? null,
    original_price: cheapest?.calculated_price.original_amount ?? null,
    on_sale: pricedVariants.some(
      (variant) =>
        variant.calculated_price.original_amount >
        variant.calculated_price.calculated_amount
    ),
    created_at: new Date(product.created_at).getTime(),
  };
}
