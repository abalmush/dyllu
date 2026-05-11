import { getProductPrice } from "@lib/util/get-product-price";
import { HttpTypes } from "@medusajs/types";

import { PriceBlock } from "@/components/molecules/price-block";

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  });

  const selectedPrice = variant ? variantPrice : cheapestPrice;

  if (!selectedPrice) {
    return <div className="ds-shimmer block h-9 w-32 rounded-md" />;
  }

  return (
    <PriceBlock
      price={selectedPrice}
      prefix={!variant ? "de la" : undefined}
      size="xl"
    />
  );
}
