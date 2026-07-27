import { HttpTypes } from "@medusajs/types";

import {
  getPricesForVariant,
  getProductPrice,
} from "@lib/util/get-product-price";
import {
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
    title: getVariantDisplayTitle(product, selectedVariant),
    thumbnail: getVariantImageUrl(product, selectedVariant),
    category: getProductCategoryLabel(product),
    price: selectedVariant
      ? getPricesForVariant(selectedVariant)
      : cheapestPrice,
    productType: getProductUiType(product, selectedVariant),
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
