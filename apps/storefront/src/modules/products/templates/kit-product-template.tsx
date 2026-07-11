import { Suspense } from "react";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/atoms/badge";
import { Container } from "@/components/atoms/container";
import { LinkedProducts } from "@/components/organisms/linked-products";
import { PdpHeroCombo } from "@/components/organisms/pdp-hero-combo";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import { SetBreakdown } from "@/components/organisms/set-breakdown";
import { Breadcrumbs } from "@/components/molecules/breadcrumbs";
import { getCompatibleAccessories } from "@lib/data/compatible-accessories";
import RelatedProducts from "@modules/products/components/related-products";
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta";
import ProductTabs from "@modules/products/components/product-tabs";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";

import {
  getEffectivePlatform,
  getPieceCount,
  getProductEyebrow,
  getPrimaryArticleCode,
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

export default async function KitProductTemplate({ product }: Props) {
  const metadata = (product.metadata ?? {}) as Record<string, unknown>;
  const platform = getEffectivePlatform(product);
  const parsedItems = parseKitItems(product.description);
  const pieceCount = getPieceCount(parsedItems);
  const eyebrow = getProductEyebrow(product);
  const includedCodes = new Set(
    parsedItems
      .map((item) => item.code)
      .filter(
        (code): code is string => typeof code === "string" && code.length > 0
      )
  );

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
  const setPieces = toSetPieces(parsedItems);
  const breadcrumbs = buildBreadcrumbs(product);

  return (
    <>
      <PdpHeroCombo
        product={product}
        items={comboItems}
        eyebrow={eyebrow}
        layout="grid"
      />

      <section className="border-y border-border bg-surface-subtle/40 py-6">
        <Container>
          <div className="flex flex-wrap items-center gap-2">
            <ProductTypeBadge type="kit" />
            {pieceCount > 0 && (
              <Badge variant="secondary">{pieceCount} piese incluse</Badge>
            )}
            {platform.startsWith("dyllu-") && (
              <Badge variant="outline">{prettifyPlatform(platform)}</Badge>
            )}
          </div>

          <div className="mt-4 max-w-3xl space-y-3">
            <Breadcrumbs items={breadcrumbs} />
            <p className="text-sm leading-relaxed text-muted-foreground small:text-base">
              Kit complet livrat ca un singur SKU, cu sculele și accesoriile
              incluse în pachet. Structura vine din descrierea importată și e
              pregătită pentru produsele conectate pe aceeași platformă.
            </p>
          </div>
        </Container>
      </section>

      {setPieces.length > 0 && (
        <SetBreakdown
          title="Ce primești în kit"
          pieceCount={pieceCount}
          pieces={setPieces}
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

      {linkedProducts.length > 0 && (
        <LinkedProducts
          mainName={product.title ?? "Acest kit"}
          mainImage={getVariantImage(product)}
          mainPrice={
            product.variants?.[0]?.calculated_price?.calculated_amount ??
            undefined
          }
          products={linkedProducts}
          layout="compatible"
          compatibilityNote={`Poți extinde acest kit cu baterii și încărcătoare compatibile pe aceeași platformă ${prettifyPlatform(platform)}.`}
        />
      )}

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
