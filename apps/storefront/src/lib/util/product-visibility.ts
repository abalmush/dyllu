import { HttpTypes } from "@medusajs/types";

const hasUrl = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function getProductImageUrl(
  product: HttpTypes.StoreProduct
): string | undefined {
  if (hasUrl(product.thumbnail)) return product.thumbnail;

  const productImage = product.images?.find((image) => hasUrl(image.url))?.url;
  if (productImage) return productImage;

  for (const variant of product.variants ?? []) {
    const variantImage = variant.images?.find((image) =>
      hasUrl(image.url)
    )?.url;
    if (variantImage) return variantImage;
  }

  return undefined;
}

export const hasProductImage = (product: HttpTypes.StoreProduct): boolean =>
  Boolean(getProductImageUrl(product));
