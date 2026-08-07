"use client";

import { ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { PdpHeroShell } from "@/components/organisms/pdp-hero-shell";
import { PurchaseTrustGrid } from "@/components/organisms/purchase-trust-grid";
import {
  SetBreakdown,
  type SetPiece,
} from "@/components/organisms/set-breakdown";
import type { CompatibleAccessories } from "@lib/data/compatible-accessories";
import type { IncludedAccessoryImage } from "@lib/data/included-accessories";
import { cn } from "@lib/utils";
import ImageGallery from "@modules/products/components/image-gallery";
import ProductActions from "@modules/products/components/product-actions";
import { PowerSupplyStatus } from "@modules/products/components/product-actions/power-supply-status";
import ProductPageHeader from "@modules/products/components/product-page-header";
import ProductTabs from "@modules/products/components/product-tabs";
import {
  getIncludedAccessoryRelationships,
  getVariantImages,
} from "@modules/products/lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  initialVariantId?: string;
  includedAccessoryImages?: IncludedAccessoryImage[];
  compatiblePowerAccessories?: CompatibleAccessories;
  mediaSupplement?: ReactNode;
  purchaseSupplement?: ReactNode;
  onboarding?: ReactNode;
  includedPieces?: SetPiece[];
};

export default function VariantProductStage({
  product,
  region,
  initialVariantId,
  includedAccessoryImages = [],
  compatiblePowerAccessories = { batteries: [], chargers: [] },
  mediaSupplement,
  purchaseSupplement,
  onboarding,
  includedPieces = [],
}: Props) {
  const t = useTranslations("VariantProductStage");
  const [selectedVariantId, setSelectedVariantId] = useState(
    initialVariantId ?? product.variants?.[0]?.id
  );
  const selectedVariant = useMemo(
    () =>
      product.variants?.find((variant) => variant.id === selectedVariantId) ??
      product.variants?.[0],
    [product.variants, selectedVariantId]
  );
  const images = getVariantImages(product, selectedVariant);
  const includedAccessoryRelationships = useMemo(
    () => getIncludedAccessoryRelationships(product, selectedVariant),
    [product, selectedVariant]
  );
  const imageBySku = useMemo(
    () =>
      new Map(
        includedAccessoryImages.map((accessory) => [
          accessory.sku.trim().toLowerCase(),
          accessory,
        ])
      ),
    [includedAccessoryImages]
  );
  const includedAccessoryPieces: SetPiece[] = useMemo(
    () =>
      includedAccessoryRelationships.map((relationship) => {
        const accessory = imageBySku.get(
          (relationship.sku ?? "").trim().toLowerCase()
        );

        return {
          id: `accessory-${relationship.sku}-${relationship.quantity}`,
          label:
            accessory?.title ??
            [
              relationship.name ?? t("includedAccessoryFallback"),
              relationship.sku &&
              !relationship.name
                ?.toLowerCase()
                .includes(relationship.sku.toLowerCase())
                ? relationship.sku
                : undefined,
            ]
              .filter(Boolean)
              .join(" "),
          image: accessory?.imageUrl,
          qty: relationship.quantity,
          kind: relationship.kind,
          sku: relationship.sku,
        };
      }),
    [includedAccessoryRelationships, imageBySku, t]
  );
  const combinedIncludedPieces = useMemo(
    () => [...includedPieces, ...includedAccessoryPieces],
    [includedPieces, includedAccessoryPieces]
  );
  const combinedIncludedCount = useMemo(
    () =>
      combinedIncludedPieces.reduce(
        (acc, item) => acc + (typeof item.qty === "number" ? item.qty : 0),
        0
      ),
    [combinedIncludedPieces]
  );
  const hasIncludedSection = combinedIncludedPieces.length > 0;
  const handleVariantChange = (variant: HttpTypes.StoreProductVariant) => {
    setSelectedVariantId(variant.id);

    const url = new URL(window.location.href);
    url.searchParams.set("v_id", variant.id);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`
    );
  };

  return (
    <>
      <Container className="small:py-8 py-6">
        <ProductPageHeader product={product} variant={selectedVariant} />
      </Container>

      <PdpHeroShell label={t("stageLabel")}>
        <div
          className={cn(
            "content-container small:grid-cols-[minmax(0,1.08fr)_minmax(460px,0.92fr)] small:items-start small:gap-x-6 small:gap-y-0 grid gap-4"
          )}
          data-testid="product-container"
          data-tmp-id="pdp-stage"
        >
          <div
            className="small:sticky small:top-24 small:self-start min-w-0"
            data-tmp-id="pdp-image-layer"
          >
            <div className="w-full space-y-4" data-tmp-id="pdp-image-wrapper">
              <ImageGallery key={selectedVariant?.id} images={images} />
              <PowerSupplyStatus product={product} variant={selectedVariant} />
            </div>
          </div>

          <div className="min-w-0 space-y-6" data-tmp-id="pdp-card-layer">
            <ProductActions
              key={selectedVariant?.id}
              product={product}
              region={region}
              initialVariantId={selectedVariant?.id}
              compatiblePowerAccessories={compatiblePowerAccessories}
              onVariantChange={handleVariantChange}
            />
            {mediaSupplement}
            {hasIncludedSection && (
              <SetBreakdown
                pieceCount={combinedIncludedCount}
                pieces={combinedIncludedPieces}
                tone="dark"
              />
            )}
            <div className="clip-corner-cut-lg clip-shadow-lg bg-card ring-border small:p-8 p-6 ring-1">
              <ProductTabs product={product} variant={selectedVariant} />
            </div>
            {purchaseSupplement}
          </div>
        </div>
      </PdpHeroShell>

      <section
        aria-label={t("orderBenefitsLabel")}
        className="border-border bg-background border-y"
      >
        <Container className="small:py-6 py-5">
          <PurchaseTrustGrid layout="band" />
        </Container>
      </section>

      {onboarding}
    </>
  );
}
