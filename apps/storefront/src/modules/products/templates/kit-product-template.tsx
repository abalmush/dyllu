import { Suspense } from "react";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/atoms/badge";
import { LinkedProducts } from "@/components/organisms/linked-products";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import { getCompatibleAccessories } from "@lib/data/compatible-accessories";
import RelatedProducts from "@modules/products/components/related-products";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";
import SharedProductLayout from "./shared-product-layout";

import {
  getEffectivePlatform,
  getPieceCount,
  getPrimaryArticleCode,
  getVariantDescription,
  getVariantImage,
  parseKitItems,
  prettifyPlatform,
  toLinkedProduct,
  toSetPieces,
} from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  images: HttpTypes.StoreProductImage[];
  selectedVariant?: HttpTypes.StoreProductVariant;
};

export default async function KitProductTemplate({
  product,
  region,
  images,
  selectedVariant,
}: Props) {
  const platform = getEffectivePlatform(product);
  const parsedItems = parseKitItems(
    getVariantDescription(product, selectedVariant)
  );
  const pieceCount = getPieceCount(parsedItems);
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

  const setPieces = toSetPieces(parsedItems, imageByCode);
  const summary = platform.startsWith("dyllu-")
    ? `Primești toate sculele și accesoriile afișate, compatibile cu sistemul de acumulatori ${prettifyPlatform(platform)}.`
    : "Primești toate sculele și accesoriile afișate.";

  return (
    <>
      <SharedProductLayout
        product={product}
        region={region}
        images={images}
        selectedVariant={selectedVariant}
        includedPieces={setPieces}
        purchaseSupplement={
          <div className="clip-corner-cut-lg clip-shadow-lg bg-card ring-border small:p-8 flex flex-col gap-4 p-6 ring-1">
            <div className="flex flex-wrap items-center gap-2">
              <ProductTypeBadge type="kit" />
              {pieceCount > 0 && (
                <Badge variant="secondary">{pieceCount} piese incluse</Badge>
              )}
              {platform.startsWith("dyllu-") && (
                <Badge variant="outline">{prettifyPlatform(platform)}</Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {summary}
            </p>
          </div>
        }
      />

      {linkedProducts.length > 0 && (
        <LinkedProducts
          mainName={product.title ?? "Acest set"}
          mainImage={getVariantImage(product)}
          mainPrice={
            selectedVariant?.calculated_price?.calculated_amount ??
            product.variants?.[0]?.calculated_price?.calculated_amount ??
            undefined
          }
          products={linkedProducts}
          layout="compatible"
          compatibilityNote={`Poți completa setul cu acumulatori și încărcătoare din același sistem ${prettifyPlatform(platform)}.`}
        />
      )}

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
