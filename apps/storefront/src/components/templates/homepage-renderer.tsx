import * as React from "react";
import type { HttpTypes } from "@medusajs/types";

import { listProducts, listProductsWithSort } from "@lib/data/products";
import { getCollectionByHandle } from "@lib/data/collections";
import { listCollectionProductCandidates } from "@lib/data/homepage-products";
import { getRegion } from "@lib/data/regions";
import { type CategoryNode } from "@lib/data/categories";
import { getProductPrice } from "@lib/util/get-product-price";
import { getProductImageUrl } from "@lib/util/product-visibility";

import { ProductCard } from "@/components/molecules/product-card";
import { AnatomyShowcase } from "@/components/organisms/anatomy-showcase";
import { GuidesGrid } from "@/components/organisms/guides-grid";
import { NewsletterBand } from "@/components/organisms/newsletter-band";
import { ProductRailSection } from "@/components/organisms/product-rail-section";
import { PromoMosaic } from "@/components/organisms/promo-mosaic";
import { ToolFamiliesStrip } from "@/components/organisms/tool-families-strip";
import { TrustBand } from "@/components/organisms/trust-band";
import { ShopStories } from "@/components/organisms/shop-stories";
import { ANATOMY_ITEMS } from "@/lib/data/anatomy-items";
import { selectDiverseProductIds } from "@/lib/homepage/product-selection";
import type { HomepageBlock, ProductRailSource } from "@/lib/homepage/types";

const flattenCategories = (categories: CategoryNode[]): CategoryNode[] =>
  categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children),
  ]);

export function HomepageRenderer({
  blocks,
  categories,
}: {
  blocks: HomepageBlock[];
  categories: CategoryNode[];
}) {
  return (
    <>
      {blocks.map((block) => (
        <BlockSlot key={block.id} block={block} categories={categories} />
      ))}
    </>
  );
}

function BlockSlot({
  block,
  categories,
}: {
  block: HomepageBlock;
  categories: CategoryNode[];
}) {
  switch (block.type) {
    case "promo-mosaic": {
      const categoryHandles = new Set(
        flattenCategories(categories).map((category) => category.handle)
      );
      const promos = block.promos.filter(
        (promo) =>
          !promo.categoryHandle || categoryHandles.has(promo.categoryHandle)
      );
      return <PromoMosaic promos={promos} />;
    }
    case "tool-families":
      return <ToolFamiliesStrip categories={categories} />;
    case "product-rail":
      return (
        <ProductRailBlock
          source={block.source}
          eyebrow={block.eyebrow}
          title={block.title}
          viewAllHref={block.viewAllHref}
          viewAllLabel={block.viewAllLabel}
        />
      );
    case "trust-band":
      return <TrustBand />;
    case "anatomy-showcase":
      return (
        <AnatomyShowcase
          eyebrow="Anatomia DYLLU"
          title="Ce găsești sub carcasă"
          intro="Fiecare produs trece prin testele noastre. Iată componentele care contează — și de ce."
          items={ANATOMY_ITEMS}
        />
      );
    case "guides-grid":
      return <GuidesGrid />;
    case "shop-stories":
      return <ShopStories categories={categories} />;
    case "newsletter-band":
      return <NewsletterBand />;
  }
}

async function ProductRailBlock({
  source,
  eyebrow,
  title,
  viewAllHref,
  viewAllLabel,
}: {
  source: ProductRailSource;
  eyebrow?: string;
  title: string;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  const region = await getRegion();
  if (!region) return null;

  const limit = source.limit ?? 8;
  const collection =
    source.kind === "collection"
      ? await getCollectionByHandle(source.collectionHandle).catch(
          () => undefined
        )
      : undefined;
  if (source.kind === "collection" && !collection) return null;

  const displayedProducts =
    source.kind === "collection" &&
    source.selection === "diverse-random" &&
    collection
      ? await getDiverseCollectionProducts(collection.id, region.id, limit)
      : await getBoundedRailProducts(source, collection?.id, limit);

  if (!displayedProducts.length) return null;

  return (
    <ProductRailSection
      eyebrow={eyebrow}
      title={title}
      viewAllHref={viewAllHref}
      viewAllLabel={viewAllLabel}
    >
      <div className="small:grid-cols-3 medium:grid-cols-4 medium:gap-4 large:grid-cols-6 grid grid-cols-2 gap-3">
        {displayedProducts.map((product) => {
          const { cheapestPrice } = getProductPrice({ product });
          return (
            <ProductCard
              key={product.id}
              href={`/products/${product.handle}`}
              title={product.title}
              thumbnail={getProductImageUrl(product)}
              imageAlt={product.title}
              price={cheapestPrice ?? null}
              compact
            />
          );
        })}
      </div>
    </ProductRailSection>
  );
}

// Diverse merchandising needs visibility into a whole (curated) collection to
// group by product type, but the expensive part - listing candidates - is
// cross-request cached; only the final small selection's price/stock is
// fetched fresh. The seed changes daily so the pick isn't frozen forever
// while staying identical across concurrent requests within the same day.
async function getDiverseCollectionProducts(
  collectionId: string,
  regionId: string,
  limit: number
): Promise<HttpTypes.StoreProduct[]> {
  const candidates = await listCollectionProductCandidates(
    collectionId,
    regionId
  );
  if (!candidates.length) return [];

  const seed = `${collectionId}:${new Date().toISOString().slice(0, 10)}`;
  const selectedIds = selectDiverseProductIds(candidates, limit, seed);
  if (!selectedIds.length) return [];

  const { response } = await listProducts({
    regionId,
    queryParams: {
      id: selectedIds,
      limit: selectedIds.length,
      fields: "*variants.calculated_price",
    },
  });

  const productsById = new Map(
    response.products.map((product) => [product.id, product])
  );
  return selectedIds.flatMap((id) => {
    const product = productsById.get(id);
    return product ? [product] : [];
  });
}

async function getBoundedRailProducts(
  source: ProductRailSource,
  collectionId: string | undefined,
  limit: number
): Promise<HttpTypes.StoreProduct[]> {
  const {
    response: { products },
  } = await listProductsWithSort({
    fetchAll: false,
    page: 1,
    queryParams: {
      limit,
      fields: "*variants.calculated_price",
      ...(source.kind === "collection" ? { collection_id: collectionId } : {}),
    },
  });
  return products.slice(0, limit);
}
