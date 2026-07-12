import { Suspense } from "react";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/atoms/badge";
import { Container } from "@/components/atoms/container";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import { SetBreakdown } from "@/components/organisms/set-breakdown";
import ImageGallery from "@modules/products/components/image-gallery";
import ProductActions from "@modules/products/components/product-actions";
import ProductPageHeader from "@modules/products/components/product-page-header";
import RelatedProducts from "@modules/products/components/related-products";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductTabs from "@modules/products/components/product-tabs";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";

import {
  getPieceCount,
  getSetCount,
  parseKitItems,
  toSetPieces,
} from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
};

export default function SetProductTemplate({ product, region }: Props) {
  const parsedItems = parseKitItems(product.description);
  const pieceCount =
    getSetCount(product, parsedItems) || getPieceCount(parsedItems);
  const setPieces = toSetPieces(parsedItems);
  const summary =
    "Set complet organizat ca un singur SKU, cu accent pe piesele incluse și pregătit pentru utilizare imediată.";

  return (
    <>
      <Container className="pb-24 pt-8 small:pb-32 small:pt-12">
        <ProductPageHeader product={product} className="mb-8 small:mb-10" />
        <div className="grid gap-8 small:grid-cols-[minmax(0,0.96fr)_minmax(380px,1.04fr)] small:items-start small:gap-10 medium:gap-12">
          <div className="space-y-4">
            <div className="clip-corner-cut-lg clip-shadow-lg bg-card p-4 ring-1 ring-border small:p-5">
              <ImageGallery images={product.images ?? []} />
            </div>
            {setPieces.length > 0 && (
              <SetBreakdown pieceCount={pieceCount} pieces={setPieces} />
            )}
          </div>

          <div className="space-y-8 small:sticky small:top-28 small:self-start">
            <ProductActions product={product} region={region} />

            <div className="clip-corner-cut-lg clip-shadow-lg flex flex-col gap-4 bg-card p-6 ring-1 ring-border small:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <ProductTypeBadge type="set" count={pieceCount || undefined} />
                {pieceCount > 0 && (
                  <Badge variant="secondary">{pieceCount} piese în set</Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground small:text-base">
                {summary}
              </p>
            </div>

            <ProductOnboardingCta />
          </div>
        </div>
      </Container>

      <Container className="pb-24 pt-12 small:pb-32 small:pt-16">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="clip-corner-cut-lg clip-shadow-lg bg-card p-6 ring-1 ring-border small:p-8">
            <ProductTabs product={product} />
          </div>
        </div>
      </Container>

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
