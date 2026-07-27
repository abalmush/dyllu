import { ReactNode } from "react";
import type { SetPiece } from "@/components/organisms/set-breakdown";
import { HttpTypes } from "@medusajs/types";

import {
  getCompatibleAccessories,
  type CompatibleAccessories,
} from "@lib/data/compatible-accessories";
import { getIncludedAccessoryImages } from "@lib/data/included-accessories";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import { getProductPowerSupply } from "@modules/products/lib/product-presentation";
import VariantProductStage from "./variant-product-stage";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  images: HttpTypes.StoreProductImage[];
  selectedVariant?: HttpTypes.StoreProductVariant;
  mediaSupplement?: ReactNode;
  purchaseSupplement?: ReactNode;
  includedPieces?: SetPiece[];
};

export default async function SharedProductLayout({
  product,
  region,
  selectedVariant,
  mediaSupplement,
  purchaseSupplement,
  includedPieces,
}: Props) {
  const includedAccessoryImages = await getIncludedAccessoryImages(
    product,
    region.id
  );
  const isSingleVariant = (product.variants?.length ?? 0) <= 1;
  const accessoryPlatform = isSingleVariant
    ? product.variants
        ?.map((variant) => getProductPowerSupply(product, variant))
        .find(
          (supply) =>
            supply?.powerSource === "cordless_battery" &&
            supply.batteryIncluded === false &&
            supply.platform?.startsWith("dyllu-")
        )?.platform
    : undefined;
  let compatiblePowerAccessories: CompatibleAccessories = {
    batteries: [],
    chargers: [],
  };

  if (accessoryPlatform) {
    compatiblePowerAccessories =
      await getCompatibleAccessories(accessoryPlatform);
  }

  return (
    <VariantProductStage
      product={product}
      region={region}
      initialVariantId={selectedVariant?.id}
      includedAccessoryImages={includedAccessoryImages}
      compatiblePowerAccessories={compatiblePowerAccessories}
      mediaSupplement={mediaSupplement}
      purchaseSupplement={purchaseSupplement}
      includedPieces={includedPieces}
      onboarding={<ProductOnboardingCta />}
    />
  );
}
