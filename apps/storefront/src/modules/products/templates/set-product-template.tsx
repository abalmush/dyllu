import { Suspense } from "react";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/atoms/badge";
import { Container } from "@/components/atoms/container";
import { PdpHero } from "@/components/organisms/pdp-hero";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import { SetBreakdown } from "@/components/organisms/set-breakdown";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import RelatedProducts from "@modules/products/components/related-products";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductTabs from "@modules/products/components/product-tabs";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";

import {
  getPieceCount,
  getProductEyebrow,
  getSetCount,
  parseKitItems,
  toSetPieces,
} from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
};

export default function SetProductTemplate({ product, region }: Props) {
  const eyebrow = getProductEyebrow(product);
  const parsedItems = parseKitItems(product.description);
  const pieceCount =
    getSetCount(product, parsedItems) || getPieceCount(parsedItems);

  return (
    <>
      <PdpHero product={product} region={region} eyebrow={eyebrow} />

      <section className="border-y border-border bg-surface-subtle/40 py-6">
        <Container>
          <div className="flex flex-wrap items-center gap-2">
            <ProductTypeBadge type="set" count={pieceCount || undefined} />
            {pieceCount > 0 && (
              <Badge variant="secondary">{pieceCount} piese în set</Badge>
            )}
          </div>

          <div className="mt-4 max-w-3xl space-y-3">
            <Breadcrumbs items={buildBreadcrumbs(product)} />
            <p className="text-sm leading-relaxed text-muted-foreground small:text-base">
              Set organizat ca un singur SKU, cu accent pe piesele incluse și
              utilizarea rapidă pe teren. Informația este derivată din titlul și
              descrierea importată, astfel încât să putem face rollout gradual
              pe întreg catalogul.
            </p>
          </div>
        </Container>
      </section>

      {parsedItems.length > 0 && (
        <SetBreakdown
          title="Ce găsești în set"
          pieceCount={pieceCount}
          pieces={toSetPieces(parsedItems)}
        />
      )}

      <Container className="pb-24 pt-12 small:pb-32 small:pt-16">
        <div className="grid gap-10 small:grid-cols-[minmax(0,1.05fr)_minmax(0,0.9fr)] small:gap-14">
          <div className="space-y-10">
            <div className="rounded-2xl border border-border bg-card p-6 small:p-8">
              <ProductTabs product={product} />
            </div>
          </div>

          <div className="space-y-8 small:sticky small:top-28 small:self-start">
            <ProductOnboardingCta />
          </div>
        </div>
      </Container>

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}

function buildBreadcrumbs(product: HttpTypes.StoreProduct) {
  const category = product.categories?.[0];

  return [
    { label: "Acasă", href: "/" },
    { label: "Magazin", href: "/store" },
    ...(category
      ? [{ label: category.name, href: `/categories/${category.handle}` }]
      : []),
    { label: product.title ?? "Produs" },
  ];
}
