import { getTranslations } from "next-intl/server";
import { getProductPrice } from "@lib/util/get-product-price";
import { HttpTypes } from "@medusajs/types";

import { PriceBlock } from "@/components/molecules/price-block";

export default async function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
}) {
  const t = await getTranslations("ProductPrice");
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
      prefix={!variant ? t("fromPricePrefix") : undefined}
      size="xl"
    />
  );
}
