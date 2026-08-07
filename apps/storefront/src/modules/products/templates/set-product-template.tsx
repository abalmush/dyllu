import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/atoms/badge";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import RelatedProducts from "@modules/products/components/related-products";
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products";
import SharedProductLayout from "./shared-product-layout";

import {
  getPieceCount,
  getSetCount,
  getVariantDescription,
  parseKitItems,
  toSetPieces,
} from "../lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  region: HttpTypes.StoreRegion;
  images: HttpTypes.StoreProductImage[];
  selectedVariant?: HttpTypes.StoreProductVariant;
};

export default async function SetProductTemplate({
  product,
  region,
  images,
  selectedVariant,
}: Props) {
  const t = await getTranslations("SetProductTemplate");
  const parsedItems = parseKitItems(
    getVariantDescription(product, selectedVariant)
  );
  const pieceCount =
    getSetCount(product, parsedItems) || getPieceCount(parsedItems);
  const setPieces = toSetPieces(parsedItems);
  const summary = t("summary");

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
              <ProductTypeBadge type="set" count={pieceCount || undefined} />
              {pieceCount > 0 && (
                <Badge variant="secondary">
                  {t("piecesInSet", { count: pieceCount })}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground small:text-base text-sm leading-relaxed">
              {summary}
            </p>
          </div>
        }
      />

      <Suspense fallback={<SkeletonRelatedProducts />}>
        <RelatedProducts product={product} />
      </Suspense>
    </>
  );
}
