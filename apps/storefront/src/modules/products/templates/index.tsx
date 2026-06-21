import { Suspense } from "react";
import { notFound } from "next/navigation";
import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { AnatomyShowcase } from "@/components/organisms/anatomy-showcase";
import { PdpHero } from "@/components/organisms/pdp-hero";
import { ANATOMY_ITEMS } from "@/lib/data/anatomy-items";
import { CompatibleAccessories } from "@modules/products/components/compatible-accessories";
import ImageGallery from "@modules/products/components/image-gallery";
import ProductActions from "@modules/products/components/product-actions";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductTabs from "@modules/products/components/product-tabs";
import RelatedProducts from "@modules/products/components/related-products";
import ProductInfo from "@modules/products/templates/product-info";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";

import ProductActionsWrapper from "./product-actions-wrapper";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  images: HttpTypes.StoreProductImage[];
};

export default function ProductTemplate({ product, region, images }: Props) {
  if (!product || !product.id) return notFound();

  const eyebrow = (() => {
    const md = (product.metadata ?? {}) as Record<string, unknown>;
    const cat = md.ingco_source_categories;
    if (typeof cat === "string" && cat.length > 0) {
      return cat.split(",")[0]?.trim();
    }
    return undefined;
  })();

  return (
    <>
      <PdpHero product={product} region={region} eyebrow={eyebrow} />

      <Container className="pb-24 pt-6 small:pb-32 small:pt-10">
        <div
          className="grid gap-10 small:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)] small:gap-14"
          data-testid="product-container"
        >
          <div className="space-y-10">
            <ImageGallery images={images} />
            <div className="rounded-2xl border border-border bg-card p-6 small:p-8">
              <ProductTabs product={product} />
            </div>
          </div>
          <div className="space-y-8 small:sticky small:top-28 small:self-start">
            <ProductInfo product={product} />
            <ProductOnboardingCta />
            <Suspense
              fallback={
                <ProductActions disabled product={product} region={region} />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
          </div>
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
