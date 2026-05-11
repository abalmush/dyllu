import * as React from "react";

import { listCollections } from "@lib/data/collections";
import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { getProductPrice } from "@lib/util/get-product-price";
import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { ProductCard } from "@/components/molecules/product-card";
import { AnatomyShowcase } from "@/components/organisms/anatomy-showcase";
import { BrandStrip } from "@/components/organisms/brand-strip";
import { CategoryCinematic } from "@/components/organisms/category-cinematic";
import { CategoryMarquee } from "@/components/organisms/category-marquee";
import { CategoryMosaic } from "@/components/organisms/category-mosaic";
import { CategoryMosaicReveal } from "@/components/organisms/category-mosaic-reveal";
import { NewsletterBand } from "@/components/organisms/newsletter-band";
import { ProductRailSection } from "@/components/organisms/product-rail-section";
import { ProductSpotlight } from "@/components/organisms/product-spotlight";
import { PromoBannerStrip } from "@/components/organisms/promo-banner-strip";
import { TrustBand } from "@/components/organisms/trust-band";

const ANATOMY_ITEMS = [
  {
    key: "motor-brushless",
    label: "Motor brushless",
    description:
      "Fără perii — durabilitate cu 50% mai mare, consum redus și cuplu constant sub sarcină.",
    image: {
      src: "/images/dyllu-grinder-thermal.png",
      alt: "Motor brushless DYLLU vizualizat termic",
    },
  },
  {
    key: "carcasa-magneziu",
    label: "Carcasă magneziu",
    description:
      "Aliaj turnat sub presiune — rezistă la șocuri și disipează căldura mai bine decât plasticul.",
    image: {
      src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
      alt: "Carcasă din magneziu turnat — close-up",
    },
  },
  {
    key: "acumulator-li-ion",
    label: "Acumulator Li-Ion 18V",
    description:
      "Celule de înaltă densitate, indicator vizual al sarcinii și sistem activ de management termic.",
    image: {
      src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285509.webp",
      alt: "Acumulator Li-Ion DYLLU",
    },
  },
  {
    key: "anti-vibratie",
    label: "Sistem anti-vibrație",
    description:
      "Mâner cu amortizoare progresive — reduce oboseala mâinii pe ture lungi de lucru.",
    image: {
      src: "/images/grinder-sparks.jpeg",
      alt: "Polizor în lucru cu sistem anti-vibrație",
    },
  },
  {
    key: "lama-hss-co",
    label: "Lamă HSS-Co",
    description:
      "Oțel rapid cu cobalt — taie metale dure păstrând muchia. Recomandat pentru profesioniști.",
    image: {
      src: "/images/dyllu-consumables.png",
      alt: "Lame și burghie HSS-Co DYLLU",
    },
  },
  {
    key: "siguranta",
    label: "Echipament de protecție",
    description:
      "Mănuși cut-resistant și ochelari anti-impact certificate EN ISO — incluse cu pachetele Pro.",
    image: {
      src: "/images/dyllu-safety-gear.png",
      alt: "Echipament de protecție DYLLU",
    },
  },
];

function VariantLabel({
  index,
  title,
  tone,
}: {
  index: number;
  title: string;
  tone: "neutral" | "primary" | "dark";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary text-primary-foreground [&_[data-badge]]:bg-primary-foreground/15"
      : tone === "dark"
        ? "bg-foreground text-background [&_[data-badge]]:bg-background/15"
        : "bg-muted text-foreground [&_[data-badge]]:bg-foreground/10";
  return (
    <div className={`${toneClass} border-y border-border/40`}>
      <Container className="flex items-center gap-3 py-3">
        <span
          data-badge
          className="grid size-7 place-items-center rounded-full font-mono text-[11px] font-bold"
        >
          {index}
        </span>
        <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em]">
          {title}
        </span>
      </Container>
    </div>
  );
}

async function FeaturedProductsRail({
  region,
}: {
  region: HttpTypes.StoreRegion;
}) {
  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      limit: 8,
      fields: "*variants.calculated_price",
    },
  });
  if (!products?.length) {
    return (
      <Container className="py-16">
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Adaugă produse din panoul de administrare ca să populezi pagina
            principală.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <ProductRailSection
      eyebrow="Selecție DYLLU"
      title="Produse populare"
      viewAllHref="/store"
      viewAllLabel="Vezi toate produsele"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 medium:grid-cols-4 medium:gap-6">
        {products.slice(0, 8).map((product) => {
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

async function CollectionRail({
  collection,
  region,
  background,
}: {
  collection: HttpTypes.StoreCollection;
  region: HttpTypes.StoreRegion;
  background?: "default" | "subtle";
}) {
  const {
    response: { products },
  } = await listProducts({
    regionId: region.id,
    queryParams: {
      collection_id: collection.id,
      fields: "*variants.calculated_price",
    },
  });
  if (!products?.length) return null;

  return (
    <ProductRailSection
      eyebrow={collection.metadata?.eyebrow as string | undefined}
      title={collection.title}
      viewAllHref={`/collections/${collection.handle}`}
      viewAllLabel="Vezi colecția"
      background={background}
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 medium:grid-cols-4 medium:gap-6">
        {products.slice(0, 8).map((product) => {
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

export async function HomeTemplate() {
  const region = await getRegion();
  if (!region) return null;
  const { collections } = await listCollections({
    fields: "id, handle, title, metadata",
  });

  return (
    <>
      <CategoryCinematic />
      <ProductSpotlight />
      <TrustBand />
      <VariantLabel index={0} title="Original — CategoryMosaic" tone="neutral" />
      <CategoryMosaic />
      <VariantLabel index={1} title="Variant 2 — Marquee (pin + scroll orizontal)" tone="primary" />
      <CategoryMarquee />
      <VariantLabel index={2} title="Variant 3 — Mosaic Reveal (cardurile apar pe rând la scroll)" tone="neutral" />
      <CategoryMosaicReveal />
      <AnatomyShowcase
        eyebrow="Anatomia DYLLU"
        title="Ce găsești sub carcasă"
        intro="Fiecare produs trece prin testele noastre. Iată componentele care contează — și de ce."
        items={ANATOMY_ITEMS}
      />
      <PromoBannerStrip />
      {collections && collections.length > 0 && (
        <>
          {collections.map((collection, idx) => (
            <CollectionRail
              key={collection.id}
              collection={collection}
              region={region}
              background={idx % 2 === 0 ? "default" : "subtle"}
            />
          ))}
        </>
      )}
      {(!collections || collections.length === 0) && (
        <FeaturedProductsRail region={region} />
      )}
      <BrandStrip />
      <NewsletterBand />
    </>
  );
}
