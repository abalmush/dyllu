import * as React from "react";

import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { getProductPrice } from "@lib/util/get-product-price";

import { Container } from "@/components/atoms/container";
import { ProductCard } from "@/components/molecules/product-card";
import { AnatomyShowcase } from "@/components/organisms/anatomy-showcase";
import { CustomerProjects } from "@/components/organisms/customer-projects";
import { GuidesGrid } from "@/components/organisms/guides-grid";
import { NewsletterBand } from "@/components/organisms/newsletter-band";
import { ProductRailSection } from "@/components/organisms/product-rail-section";
import { PromoMosaic } from "@/components/organisms/promo-mosaic";
import { ToolFamiliesStrip } from "@/components/organisms/tool-families-strip";
import { TrustBand } from "@/components/organisms/trust-band";
import { ANATOMY_ITEMS } from "@/lib/data/anatomy-items";
import type { HomepageBlock, ProductRailSource } from "@/lib/homepage/types";

export function HomepageRenderer({ blocks }: { blocks: HomepageBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <BlockSlot key={block.id} block={block} />
      ))}
    </>
  );
}

function BlockSlot({ block }: { block: HomepageBlock }) {
  switch (block.type) {
    case "promo-mosaic":
      return <PromoMosaic promos={block.promos} />;
    case "tool-families":
      return <ToolFamiliesStrip />;
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
    case "customer-projects":
      return <CustomerProjects />;
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

  const limit = source.kind === "bestsellers" ? (source.limit ?? 8) : 8;
  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      limit,
      fields: "*variants.calculated_price",
      ...(source.kind === "collection"
        ? { collection_id: source.collectionId }
        : {}),
    },
  });

  if (!products?.length) {
    return (
      <Container className="py-16">
        <div className="clip-corner-cut-md bg-surface-subtle/60 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Adaugă produse din panoul de administrare ca să populezi acest rând.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <ProductRailSection
      eyebrow={eyebrow}
      title={title}
      viewAllHref={viewAllHref}
      viewAllLabel={viewAllLabel}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 medium:grid-cols-4 medium:gap-6">
        {products.slice(0, limit).map((product) => {
          const { cheapestPrice } = getProductPrice({ product });
          return (
            <ProductCard
              key={product.id}
              href={`/products/${product.handle}`}
              title={product.title}
              thumbnail={product.thumbnail}
              imageAlt={product.title}
              price={cheapestPrice ?? null}
              isFeatured
            />
          );
        })}
      </div>
    </ProductRailSection>
  );
}
