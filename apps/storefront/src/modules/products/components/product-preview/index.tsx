import { getProductPrice } from "@lib/util/get-product-price";
import { HttpTypes } from "@medusajs/types";

import { ProductCard } from "@/components/molecules/product-card";

type Props = {
  product: HttpTypes.StoreProduct;
  isFeatured?: boolean;
  region: HttpTypes.StoreRegion;
};

export default async function ProductPreview({ product, isFeatured }: Props) {
  const { cheapestPrice } = getProductPrice({ product });

  return (
    <ProductCard
      href={`/products/${product.handle}`}
      title={product.title}
      thumbnail={product.thumbnail}
      imageAlt={product.title}
      price={cheapestPrice ?? null}
      isFeatured={isFeatured}
    />
  );
}
