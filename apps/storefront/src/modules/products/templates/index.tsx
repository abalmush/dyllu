import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { AnatomyShowcase } from "@/components/organisms/anatomy-showcase";
import { ANATOMY_ITEMS } from "@/lib/data/anatomy-items";
import { CompatibleAccessories } from "@modules/products/components/compatible-accessories";
import ImageGallery from "@modules/products/components/image-gallery";
import ProductActions from "@modules/products/components/product-actions";
import ProductPageHeader from "@modules/products/components/product-page-header";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductTabs from "@modules/products/components/product-tabs";
import RelatedProducts from "@modules/products/components/related-products";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";
import ComboProductTemplate from "./combo-product-template";
import KitProductTemplate from "./kit-product-template";
import SetProductTemplate from "./set-product-template";
import { getProductUiType } from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  images: HttpTypes.StoreProductImage[];
};

export default function ProductTemplate({ product, region, images }: Props) {
  if (!product || !product.id) return notFound();

  const uiType = getProductUiType(product);

  if (uiType === "kit") {
    return <KitProductTemplate product={product} />;
  }

  if (uiType === "combo") {
    return <ComboProductTemplate product={product} />;
  }

  if (uiType === "set") {
    return <SetProductTemplate product={product} region={region} />;
  }

  return (
    <>
      <Container className="pb-24 pt-8 small:pb-32 small:pt-12">
        <ProductPageHeader product={product} className="mb-8 small:mb-10" />
        <div
          className="grid gap-8 small:grid-cols-[minmax(0,0.96fr)_minmax(380px,1.04fr)] small:items-start small:gap-10 medium:gap-12"
          data-testid="product-container"
        >
          <div className="clip-corner-cut-lg clip-shadow-lg bg-card p-4 ring-1 ring-border small:p-5">
            <ImageGallery images={images} />
          </div>

          <div className="space-y-8 small:sticky small:top-28 small:self-start">
            <ProductActions product={product} region={region} />
            <ProductOnboardingCta />
          </div>
        </div>

        <div className="clip-corner-cut-lg clip-shadow-lg mt-8 bg-card p-6 ring-1 ring-border small:mt-10 small:p-8">
          <ProductTabs product={product} />
        </div>
      </Container>

      <Suspense fallback={null}>
        <CompatibleAccessories product={product} />
      </Suspense>

      <AnatomyShowcase
        eyebrow="Anatomia DYLLU"
        title="Ce găsești sub carcasă"
        intro="Fiecare produs trece prin testele noastre. Iată componentele care contează — și de ce."
        items={ANATOMY_ITEMS}
      />

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
