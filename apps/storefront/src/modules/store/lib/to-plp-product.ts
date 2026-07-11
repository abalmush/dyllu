import { HttpTypes } from "@medusajs/types";

import { getProductPrice } from "@lib/util/get-product-price";
import {
  getProductCategoryLabel,
  getProductUiType,
  getSetCount,
  isProductInStock,
} from "@modules/products/lib/product-presentation";

export function toPlpProduct(product: HttpTypes.StoreProduct) {
  const { cheapestPrice } = getProductPrice({ product });
  const setCount = getSetCount(product);

  return {
    id: product.id,
    href: `/products/${product.handle}`,
    title: product.title ?? "Produs DYLLU",
    thumbnail: product.thumbnail ?? product.images?.[0]?.url ?? undefined,
    category: getProductCategoryLabel(product),
    price: cheapestPrice,
    productType: getProductUiType(product),
    setCount: setCount > 0 ? setCount : undefined,
    variantId:
      product.variants?.length === 1 ? product.variants[0]?.id : undefined,
    inStock: isProductInStock(product),
  };
}
