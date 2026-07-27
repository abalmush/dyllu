import { HttpTypes } from "@medusajs/types";

export function normalizeCatalogBrand(value: string): string {
  return value.replace(/ingco/gi, "DYLLU");
}

export function normalizeProductBrand(
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProduct {
  return {
    ...product,
    title: normalizeCatalogBrand(product.title),
    subtitle: product.subtitle
      ? normalizeCatalogBrand(product.subtitle)
      : product.subtitle,
    description: product.description
      ? normalizeCatalogBrand(product.description)
      : product.description,
  };
}
