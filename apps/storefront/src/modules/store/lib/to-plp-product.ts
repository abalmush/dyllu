import { HttpTypes } from "@medusajs/types";

import type { AlgoliaProductHit } from "@lib/data/algolia-search";
import { getPercentageDiff } from "@lib/util/get-percentage-diff";
import { convertToLocale } from "@lib/util/money";
import {
  getPricesForVariant,
  getProductPrice,
} from "@lib/util/get-product-price";
import {
  getPowerSourceKind,
  getProductCategoryLabel,
  getProductUiType,
  getSetCount,
  getVariantDisplayTitle,
  getVariantImageUrl,
  isProductInStock,
  isVariantInStock,
} from "@modules/products/lib/product-presentation";

export function toPlpProduct(
  product: HttpTypes.StoreProduct,
  variant?: HttpTypes.StoreProductVariant
) {
  const { cheapestPrice } = getProductPrice({ product });
  const setCount = getSetCount(product);
  const selectedVariant =
    variant ??
    ((product.variants?.length ?? 0) === 1 ? product.variants?.[0] : undefined);
  const variantQuery =
    selectedVariant?.id && (product.variants?.length ?? 0) > 1
      ? `?v_id=${encodeURIComponent(selectedVariant.id)}`
      : "";

  return {
    id: selectedVariant ? `${product.id}:${selectedVariant.id}` : product.id,
    href: `/products/${product.handle}${variantQuery}`,
    productHandle: product.handle ?? "",
    title: getVariantDisplayTitle(product, selectedVariant),
    thumbnail: getVariantImageUrl(product, selectedVariant),
    category: getProductCategoryLabel(product),
    price: selectedVariant
      ? getPricesForVariant(selectedVariant)
      : cheapestPrice,
    productType: getProductUiType(product, selectedVariant),
    powerSource: getPowerSourceKind(product, selectedVariant),
    setCount: setCount > 0 ? setCount : undefined,
    variantId: selectedVariant?.id,
    inStock: selectedVariant
      ? isVariantInStock(selectedVariant)
      : isProductInStock(product),
  };
}

export function toPlpProducts(product: HttpTypes.StoreProduct) {
  if ((product.variants?.length ?? 0) <= 1) {
    return [toPlpProduct(product)];
  }

  return (
    product.variants?.map((variant) => toPlpProduct(product, variant)) ?? []
  );
}

export function toPlpProductFromHit(hit: AlgoliaProductHit) {
  const price =
    hit.price !== null && hit.original_price !== null
      ? {
          calculated_price_number: hit.price,
          calculated_price: convertToLocale({
            amount: hit.price,
            currency_code: "MDL",
          }),
          original_price_number: hit.original_price,
          original_price: convertToLocale({
            amount: hit.original_price,
            currency_code: "MDL",
          }),
          currency_code: "MDL",
          price_type: hit.on_sale ? ("sale" as const) : ("default" as const),
          percentage_diff: getPercentageDiff(hit.original_price, hit.price),
        }
      : null;

  return {
    id: hit.objectID,
    href: `/products/${hit.handle}`,
    productHandle: hit.handle,
    title: hit.title,
    thumbnail: hit.thumbnail ?? undefined,
    category: undefined,
    price,
    productType: "single" as const,
    powerSource: undefined,
    setCount: undefined,
    variantId: undefined,
    inStock: true,
  };
}
