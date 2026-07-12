import { Suspense } from "react";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/atoms/badge";
import { Container } from "@/components/atoms/container";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { LinkedProducts } from "@/components/organisms/linked-products";
import { PdpHeroCombo } from "@/components/organisms/pdp-hero-combo";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import { SetBreakdown } from "@/components/organisms/set-breakdown";
import { getCompatibleAccessories } from "@lib/data/compatible-accessories";
import RelatedProducts from "@modules/products/components/related-products";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductTabs from "@modules/products/components/product-tabs";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";

import {
  buildProductBreadcrumbs,
  getEffectivePlatform,
  getPieceCount,
  getProductEyebrow,
  getPrimaryArticleCode,
  getSetCount,
  getVariantImage,
  parseKitItems,
  prettifyPlatform,
  toComboItems,
  toLinkedProduct,
  toSetPieces,
} from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
};

export default async function ComboProductTemplate({ product }: Props) {
  const platform = getEffectivePlatform(product);
  const parsedItems = parseKitItems(product.description);
  const includedCodes = new Set(
    parsedItems
      .map((item) => item.code)
      .filter(
        (code): code is string => typeof code === "string" && code.length > 0
      )
  );
  const eyebrow = getProductEyebrow(product);
  const pieceCount =
    getSetCount(product, parsedItems) || getPieceCount(parsedItems);
  const linkedProducts = [];
  const imageByCode = new Map<string, string>();

  if (platform.startsWith("dyllu-")) {
    const { batteries, chargers } = await getCompatibleAccessories(platform);

    for (const accessory of [...batteries, ...chargers]) {
      const code = getPrimaryArticleCode(accessory);
      if (code) {
        imageByCode.set(code, getVariantImage(accessory));
      }
    }

    const compatibility = `Compatibil cu platforma ${prettifyPlatform(platform)}.`;
    for (const battery of batteries) {
      const code = getPrimaryArticleCode(battery);
      if (code && includedCodes.has(code)) continue;
      const linked = toLinkedProduct(battery, "consumable", compatibility);
      if (linked) linkedProducts.push(linked);
    }

    for (const charger of chargers) {
      const code = getPrimaryArticleCode(charger);
      if (code && includedCodes.has(code)) continue;
      const linked = toLinkedProduct(charger, "accessory", compatibility);
      if (linked) linkedProducts.push(linked);
    }
  }

  const comboItems = toComboItems(parsedItems, imageByCode);
  const setPieces = toSetPieces(parsedItems, imageByCode);
  const breadcrumbs = buildProductBreadcrumbs(product);
  const summary = platform.startsWith("dyllu-")
    ? `Produs principal livrat cu accesoriile incluse în pachet, pregătit pentru lucru și compatibil cu platforma ${prettifyPlatform(platform)}.`
    : "Produs principal livrat cu accesoriile incluse în pachet, gata pentru folosire imediată.";

  return (
    <>
      <PdpHeroCombo
        product={product}
        items={comboItems}
        eyebrow={eyebrow}
        layout="row"
        includedContent={
          setPieces.length > 0 ? (
            <SetBreakdown
              pieceCount={pieceCount}
              pieces={setPieces}
              tone="dark"
            />
          ) : undefined
        }
        topContent={<Breadcrumbs items={breadcrumbs} />}
        afterTitleContent={
          <div className="flex flex-wrap items-center gap-2">
            <ProductTypeBadge type="combo" />
            {pieceCount > 0 && (
              <Badge variant="secondary">{pieceCount} accesorii incluse</Badge>
            )}
            {platform.startsWith("dyllu-") && (
              <Badge variant="outline">{prettifyPlatform(platform)}</Badge>
            )}
          </div>
        }
        descriptionContent={
          <p className="text-sm leading-relaxed text-muted-foreground">
            {summary}
          </p>
        }
      />

      <Container className="pb-24 pt-12 small:pb-32 small:pt-16">
        <div className="mx-auto max-w-5xl space-y-8">
          <ProductOnboardingCta />
          <div className="clip-corner-cut-lg clip-shadow-lg bg-card p-6 ring-1 ring-border small:p-8">
            <ProductTabs product={product} />
          </div>
        </div>
      </Container>

      {linkedProducts.length > 0 && (
        <LinkedProducts
          mainName={product.title ?? "Acest produs"}
          mainImage={getVariantImage(product)}
          mainPrice={
            product.variants?.[0]?.calculated_price?.calculated_amount ??
            undefined
          }
          products={linkedProducts}
          layout="compatible"
          compatibilityNote={`Poți adăuga baterii sau încărcătoare de rezervă compatibile cu ${prettifyPlatform(platform)}.`}
        />
      )}

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
