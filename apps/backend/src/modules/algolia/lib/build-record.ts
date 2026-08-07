import { normalizeCatalogBrand } from "./normalize-brand";

export type ProductForIndexing = {
  id: string;
  title: string;
  description: string | null;
  titleRu?: string | null;
  descriptionRu?: string | null;
  handle: string;
  thumbnail: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  tags: { value: string }[];
  categories: {
    id: string;
    name: string;
    nameRu?: string | null;
    parentCategoryName: string | null;
  }[];
  variants: {
    id: string;
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
  title_ru?: string;
  description_ru?: string;
  handle: string;
  thumbnail: string | null;
  skus: string[];
  variant_titles: string[];
  category_names: string[];
  category_names_ru?: string[];
  category_ids: string[];
  tags: string[];
  metadata: string;
  price: number | null;
  original_price: number | null;
  on_sale: boolean;
  created_at: number;
  variant_id: string | null;
  variant_title: string | null;
  is_accessory: boolean;
};

const ACCESSORY_CATEGORY_NAME = "Accesorii și consumabile";

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

  // The reindex job fetches a second, ru-RU-locale pass of the same query;
  // when a product/category has no Russian translation row, Medusa's
  // translation module silently returns the same Romanian text rather than
  // null — so only treat it as "actually translated" when it differs from
  // the Romanian value, otherwise every untranslated record would carry a
  // duplicate _ru field.
  const titleRu =
    product.titleRu && product.titleRu !== product.title
      ? normalizeCatalogBrand(product.titleRu)
      : null;
  const descriptionRu =
    product.descriptionRu && product.descriptionRu !== product.description
      ? normalizeCatalogBrand(product.descriptionRu)
      : null;
  const categoryNamesRu = product.categories
    .filter((category) => category.nameRu && category.nameRu !== category.name)
    .map((category) => category.nameRu as string);

  return {
    objectID: product.id,
    title: normalizeCatalogBrand(product.title),
    description: normalizeCatalogBrand(product.description ?? ""),
    ...(titleRu ? { title_ru: titleRu } : {}),
    ...(descriptionRu ? { description_ru: descriptionRu } : {}),
    handle: product.handle,
    thumbnail: product.thumbnail,
    skus: product.variants
      .map((variant) => variant.sku)
      .filter((sku): sku is string => Boolean(sku)),
    variant_titles: product.variants.map((variant) => variant.title),
    category_names: product.categories.map((category) => category.name),
    ...(categoryNamesRu.length ? { category_names_ru: categoryNamesRu } : {}),
    category_ids: product.categories.map((category) => category.id),
    tags: product.tags.map((tag) => tag.value),
    metadata: flattenMetadata(product.metadata),
    price: cheapest?.calculated_price.calculated_amount ?? null,
    original_price: cheapest?.calculated_price.original_amount ?? null,
    on_sale: cheapest
      ? cheapest.calculated_price.original_amount >
        cheapest.calculated_price.calculated_amount
      : false,
    created_at: new Date(product.created_at).getTime(),
    variant_id: cheapest?.id ?? null,
    variant_title: cheapest?.title ?? null,
    is_accessory: product.categories.some(
      (category) =>
        category.name === ACCESSORY_CATEGORY_NAME ||
        category.parentCategoryName === ACCESSORY_CATEGORY_NAME
    ),
  };
}
