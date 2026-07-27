import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HttpTypes } from "@medusajs/types";

import RelatedProducts from "@modules/products/components/related-products";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";
import ComboProductTemplate from "./combo-product-template";
import KitProductTemplate from "./kit-product-template";
import SetProductTemplate from "./set-product-template";
import SharedProductLayout from "./shared-product-layout";
import { getProductUiType } from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  images: HttpTypes.StoreProductImage[];
  selectedVariant?: HttpTypes.StoreProductVariant;
};

export default function ProductTemplate({
  product,
  region,
  images,
  selectedVariant,
}: Props) {
  if (!product || !product.id) return notFound();

  const uiType = getProductUiType(product, selectedVariant);

  if (uiType === "kit") {
    return (
      <KitProductTemplate
        product={product}
        region={region}
        images={images}
        selectedVariant={selectedVariant}
      />
    );
  }

  if (uiType === "combo") {
    return (
      <ComboProductTemplate
        product={product}
        region={region}
        images={images}
        selectedVariant={selectedVariant}
      />
    );
  }

  if (uiType === "set") {
    return (
      <SetProductTemplate
        product={product}
        region={region}
        images={images}
        selectedVariant={selectedVariant}
      />
    );
  }

  return (
    <>
      <SharedProductLayout
        product={product}
        region={region}
        images={images}
        selectedVariant={selectedVariant}
      />

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
