import * as React from "react";

import { listProducts } from "@lib/data/products";
import { getRegion } from "@lib/data/regions";
import { getProductPrice } from "@lib/util/get-product-price";
import { cn } from "@lib/utils";
import { HttpTypes } from "@medusajs/types";

import { Container } from "@/components/atoms/container";
import { Eyebrow } from "@/components/molecules/eyebrow";
import { ProductCard } from "@/components/molecules/product-card";
import { AnatomyShowcase } from "@/components/organisms/anatomy-showcase";
import { BrandStrip } from "@/components/organisms/brand-strip";
import { CategoryCinematic } from "@/components/organisms/category-cinematic";
import { CategoryMarquee } from "@/components/organisms/category-marquee";
import { CategoryMosaic } from "@/components/organisms/category-mosaic";
import { CategoryMosaicReveal } from "@/components/organisms/category-mosaic-reveal";
import { CornerCutV2Showcase } from "@/components/organisms/corner-cut-v2-showcase";
import { CustomerProjects } from "@/components/organisms/customer-projects";
import {
  CustomerTestimonials,
  type TestimonialData,
} from "@/components/organisms/customer-testimonials";
import { GuidesGrid } from "@/components/organisms/guides-grid";
import { NewsletterBand } from "@/components/organisms/newsletter-band";
import { PdpHero } from "@/components/organisms/pdp-hero";
import { PdpHeroVariant } from "@/components/organisms/pdp-hero-variants";
import { ProductRailSection } from "@/components/organisms/product-rail-section";
import { ProductSpotlight } from "@/components/organisms/product-spotlight";
import { PromoBannerStrip } from "@/components/organisms/promo-banner-strip";
import { PromoHero } from "@/components/organisms/promo-hero";
import { PromoMosaic } from "@/components/organisms/promo-mosaic";
import {
  PromoTileBand,
  type PromoTileData,
} from "@/components/organisms/promo-tile-band";
import {
  SystemsGrid,
  type SystemTileData,
} from "@/components/organisms/systems-grid";
import { ToolFamiliesStrip } from "@/components/organisms/tool-families-strip";
import { TrustBand } from "@/components/organisms/trust-band";
import { ANATOMY_ITEMS } from "@/lib/data/anatomy-items";
import type { PromoCardData } from "@/lib/homepage/types";

const SAMPLE_PROMO: PromoCardData = {
  eyebrow: "Săptămâna sculelor electrice",
  title: "Până la −30% la scule electrice profesionale",
  description:
    "Bormașini, polizoare, multi-tool. Garanție 2 ani, livrare în toată Moldova.",
  ctaLabel: "Vezi ofertele",
  href: "/store",
  variant: "image",
  imageUrl:
    "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
};

const SAMPLE_PROMO_2: PromoCardData = {
  eyebrow: "Sezon de primăvară",
  title: "Pregătește grădina",
  description: "Inventar de grădină gata de lucru, în stoc.",
  ctaLabel: "Vezi accesoriile",
  href: "/categories/gradinarit",
  variant: "primary",
};

const SAMPLE_PROMO_3: PromoCardData = {
  eyebrow: "Pachet contractor",
  title: "EIP la preț de volum",
  description: "Discounturi pentru companii și ateliere.",
  ctaLabel: "Solicită ofertă",
  href: "/contact",
  variant: "dark",
};

const SAMPLE_PROMO_4: PromoCardData = {
  eyebrow: "Nou în stoc",
  title: "Burghie SDS+ Pro Series",
  description: "Performanță extremă pe beton armat.",
  ctaLabel: "Vezi noutățile",
  href: "/categories/burghie-pe-beton-sds-",
  variant: "muted",
};

const SAMPLE_SYSTEM_TILES: SystemTileData[] = [
  {
    background: {
      type: "image",
      src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
      alt: "Bormașină DYLLU 20V cu acumulator Li-Ion",
    },
    headline: (
      <>
        <span className="block text-6xl text-primary medium:text-7xl">20V</span>
        <span className="mt-1 block text-xl medium:text-2xl">Max System</span>
      </>
    ),
    subtitle: "12+ produse compatibile",
    ctaLabel: "Vezi platforma 20V",
    href: "/store",
  },
  {
    background: {
      type: "image",
      src: "/images/grinder-sparks.jpeg",
      alt: "Polizor DYLLU în acțiune cu scântei",
    },
    headline: (
      <>
        <span className="block text-5xl medium:text-6xl">Pro</span>
        <span className="mt-1 block text-xl medium:text-2xl">Series</span>
      </>
    ),
    subtitle: "Performanță reinventată",
    ctaLabel: "Vezi Pro Series",
    href: "/store",
  },
  {
    background: {
      type: "image",
      src: "/images/dyllu-grinder-thermal.png",
      alt: "Motor brushless DYLLU vizualizat termic",
    },
    headline: (
      <span className="text-2xl medium:text-3xl">
        <span className="text-primary">Brushless</span> Motor
      </span>
    ),
    subtitle: "Mai multă putere, mai puțin zgomot",
    ctaLabel: "Detalii tehnice",
    href: "/store",
  },
  {
    background: {
      type: "image",
      src: "/images/dyllu-safety-gear.png",
      alt: "Echipament individual de protecție DYLLU",
    },
    headline: (
      <>
        <span className="block text-3xl text-primary medium:text-4xl">EIP</span>
        <span className="mt-1 block text-sm medium:text-base">Certificat</span>
      </>
    ),
    ctaLabel: "Vezi EIP",
    href: "/categories/echipamente-de-protectie",
  },
  {
    background: {
      type: "image",
      src: "/images/dyllu-consumables.png",
      alt: "Consumabile DYLLU — burghie, discuri, accesorii",
    },
    headline: (
      <>
        <span className="block text-3xl text-primary medium:text-4xl">
          Consumabile
        </span>
        <span className="mt-1 block text-sm medium:text-base">
          Burghie, discuri
        </span>
      </>
    ),
    ctaLabel: "Vezi consumabilele",
    href: "/categories/consumabile",
  },
];

const SAMPLE_SYSTEM_TILES_WITH_VIDEO: SystemTileData[] = [
  {
    background: {
      type: "video",
      src: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      poster:
        "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
      alt: "DYLLU 20V Max — set scule cu acumulator",
    },
    headline: (
      <>
        <span className="block text-6xl text-primary medium:text-7xl">20V</span>
        <span className="mt-1 block text-xl medium:text-2xl">Max System</span>
      </>
    ),
    subtitle: "Background video — loop autoplay",
    ctaLabel: "Vezi platforma 20V",
    href: "/store",
  },
  ...SAMPLE_SYSTEM_TILES.slice(1),
];

const SAMPLE_TESTIMONIALS: TestimonialData[] = [
  {
    image: {
      src: "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
      alt: "Set DYLLU 20V combo kit folosit într-un atelier acasă",
    },
    heading: "Atelier complet!:",
    productName: "DYLLU 20V Max Combo Kit — bormașină + polizor 4.0Ah",
    quote:
      "Setul are tot ce-mi trebuie pentru proiectele de acasă. Acumulatorii țin toată ziua, iar carcasa rezistă la căderi de pe banc fără nicio problemă.",
    author: "Andrei P., Chișinău",
  },
  {
    image: {
      src: "/images/dyllu-vacuum-p20s.png",
      alt: "Aspirator portabil DYLLU P20S 20V",
    },
    heading: "Aspirare fără efort:",
    productName: "DYLLU P20S Aspirator portabil 20V Max",
    quote:
      "Foarte lejer și puternic. Bateria ține destul cât să curăț toată mașina sau o cameră întreagă fără să mă obosesc.",
    author: "Maria C., Bălți",
  },
  {
    image: {
      src: "/images/grinder-sparks.jpeg",
      alt: "Polizor DYLLU în acțiune, taie metal cu scântei",
    },
    heading: "Rezultate profi:",
    productName: "DYLLU 20V Multi-tool brushless",
    quote:
      "Putere brushless excelentă, taie metal și lemn cu ușurință. L-am folosit zile întregi pe șantier fără probleme.",
    author: "Mihai T., Orhei",
  },
];

const SAMPLE_TILES: PromoTileData[] = [
  {
    eyebrow: "DYLLU 20V Pro",
    title: "Rezolvă orice proiect",
    ctaLabel: "Vezi pachetele",
    href: "/store",
    titlePosition: "top-left",
    image: {
      src: "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
      alt: "Set DYLLU 20V — bormașină și polizor cu acumulator",
    },
  },
  {
    title: "Putere fără fir",
    ctaLabel: "Vezi sculele",
    href: "/store",
    titlePosition: "bottom-center",
    image: {
      src: "/images/dyllu-dyllu-20v-cordless-multi-tool-dtmup5020-drill-1215285508.webp",
      alt: "Bormașină DYLLU 20V cu acumulator Li-Ion",
    },
  },
  {
    title: "Protecție la lucru",
    ctaLabel: "Vezi EIP",
    href: "/categories/echipamente-de-protectie",
    titlePosition: "bottom-center",
    image: {
      src: "/images/dyllu-safety-gear.png",
      alt: "Echipament individual de protecție DYLLU",
    },
  },
];

type CatalogItem = {
  anchor: string;
  name: string;
  role: string;
  used: string;
};

const CATALOG: { group: string; items: CatalogItem[] }[] = [
  {
    group: "Hero & promoții",
    items: [
      {
        anchor: "promo-hero",
        name: "PromoHero",
        role: "Hero cu un singur produs / o singură ofertă, focus narativ",
        used: "Deprecat de pe / — păstrat ca referință",
      },
      {
        anchor: "promo-mosaic-1",
        name: "PromoMosaic (1 promo)",
        role: "Mozaic configurabil — un singur card domninant",
        used: "Folosit pe / când există o singură campanie activă",
      },
      {
        anchor: "promo-mosaic-2",
        name: "PromoMosaic (2 promos)",
        role: "Mozaic configurabil — două carduri egale",
        used: "Folosit pe / când există două campanii active",
      },
      {
        anchor: "promo-mosaic-3",
        name: "PromoMosaic (3 promos)",
        role: "Mozaic configurabil — 1 dominant + 2 secundare",
        used: "Folosit pe / azi",
      },
      {
        anchor: "promo-mosaic-4",
        name: "PromoMosaic (4 promos)",
        role: "Mozaic configurabil — 1 dominant + 3 secundare",
        used: "Folosit pe / când există 4 campanii simultane",
      },
      {
        anchor: "promo-tile-band-image",
        name: "PromoTileBand (hover image)",
        role: "Mozaic editorial 2:1:1, fundalul se mărește la hover",
        used: "Variantă cinematică pentru campanii cu imagine puternică",
      },
      {
        anchor: "promo-tile-band-tile",
        name: "PromoTileBand (hover tile)",
        role: "Același mozaic, dar tot tile-ul se mărește la hover",
        used: "Pentru un efect mai dramatic, cu suprapunere",
      },
      {
        anchor: "systems-grid",
        name: "SystemsGrid (image)",
        role: "Mozaic asimetric 2+1+2 pentru sisteme/platforme (cu stat-style headline)",
        used: "Disponibil pentru pagini landing — platforme produs",
      },
      {
        anchor: "systems-grid-video",
        name: "SystemsGrid (video background)",
        role: "Aceeași grilă, primul tile cu video autoplay/loop/muted",
        used: "Pentru campanii cu conținut video",
      },
      {
        anchor: "promo-banner-strip",
        name: "PromoBannerStrip",
        role: "4 carduri promoționale orizontale",
        used: "Disponibil pentru pagini de categorie / landing",
      },
    ],
  },
  {
    group: "PDP",
    items: [
      {
        anchor: "pdp-hero",
        name: "PdpHero (v1 — actual)",
        role: "Hero PDP — carousel imagini swipable + card cu titlu, variantă, preț, CTA. Side rails roșii.",
        used: "Folosit la începutul fiecărei pagini PDP",
      },
      {
        anchor: "pdp-hero-spotlight",
        name: "PdpHero · Spotlight",
        role: "Variant — fundal blurat din imaginea produsului, imagine centrală cu carusel, card întunecat dedesubt",
        used: "Variantă pentru pagini de produs — vibe cinematic",
      },
      {
        anchor: "pdp-hero-marquee",
        name: "PdpHero · Marquee",
        role: "Variant — fundal gradient roșu, track orizontal autoscroll cu mai multe imagini, card alb",
        used: "Variantă dinamică — necesită 2+ imagini pentru efect maxim",
      },
      {
        anchor: "pdp-hero-staggered",
        name: "PdpHero · Staggered",
        role: "Variant — fundal texturat, 1 imagine hero pe stânga + 3 cartonașe la unghiuri (+3°/-4°/+2°) pe dreapta",
        used: "Variantă editorială — main + 3 details cluster",
      },
    ],
  },
  {
    group: "Categorii",
    items: [
      {
        anchor: "tool-families-strip",
        name: "ToolFamiliesStrip",
        role: "6 iconuri pentru tipuri de scule — scan rapid",
        used: "Folosit pe / azi",
      },
      {
        anchor: "category-cinematic",
        name: "CategoryCinematic",
        role: "Showcase pinned cu auto-rotate la scroll",
        used: "Deprecat — scroll hijacking pentru tools commerce",
      },
      {
        anchor: "category-mosaic",
        name: "CategoryMosaic",
        role: "Grilă statică de carduri vizuale",
        used: "Alternativă fără scroll hijack",
      },
      {
        anchor: "category-marquee",
        name: "CategoryMarquee",
        role: "Scroll orizontal cu momentum",
        used: "Alternativă editorială",
      },
      {
        anchor: "category-mosaic-reveal",
        name: "CategoryMosaicReveal",
        role: "Cardurile apar progresiv la scroll",
        used: "Variantă atmosferică a mozaicului",
      },
    ],
  },
  {
    group: "Produse",
    items: [
      {
        anchor: "product-rail",
        name: "ProductRailSection",
        role: "Wrapper cu eyebrow + title + view-all + slot grid",
        used: "Folosit pe / pentru bestseller-uri, colecții",
      },
      {
        anchor: "product-spotlight",
        name: "ProductSpotlight",
        role: "Un singur produs full-bleed, hero secundar",
        used: "Pentru landing pe campanii product launch",
      },
    ],
  },
  {
    group: "Trust & brand",
    items: [
      {
        anchor: "trust-band",
        name: "TrustBand",
        role: "4 piloni de încredere logistică (livrare, retur, plată, suport)",
        used: "Folosit pe / azi",
      },
      {
        anchor: "anatomy-showcase",
        name: "AnatomyShowcase",
        role: "Storytelling tehnic — componente sub carcasă",
        used: "Folosit pe PDP-uri",
      },
      {
        anchor: "brand-strip",
        name: "BrandStrip",
        role: "Logo-uri brand-uri externe (marquee)",
        used: "Deprecat — DYLLU e single-brand",
      },
    ],
  },
  {
    group: "Conținut & comunitate",
    items: [
      {
        anchor: "guides-grid",
        name: "GuidesGrid",
        role: "3 carduri editoriale — ghiduri și articole",
        used: "Folosit pe / azi",
      },
      {
        anchor: "customer-projects",
        name: "CustomerProjects",
        role: "Mozaic UGC cu placeholder picsum, captions per oraș",
        used: "Folosit pe / azi",
      },
      {
        anchor: "customer-testimonials",
        name: "CustomerTestimonials",
        role: "3 carduri cu foto + titlu + quote + autor",
        used: "Disponibil pentru / sau PDP — social proof structurat",
      },
    ],
  },
  {
    group: "Lead capture",
    items: [
      {
        anchor: "newsletter-band",
        name: "NewsletterBand",
        role: "Capturare email cu eyebrow și GDPR",
        used: "Folosit pe / azi",
      },
    ],
  },
  {
    group: "Atoms & molecules",
    items: [
      {
        anchor: "eyebrow-variants",
        name: "Eyebrow (variants)",
        role: "Labelele mici de deasupra titlurilor — 6 variante de contrast",
        used: 'ProductRailSection folosește variant="dark" azi',
      },
    ],
  },
  {
    group: "Design system",
    items: [
      {
        anchor: "corner-cut-v2",
        name: "Corner-cut V2",
        role: "Bracket / Module / Chassis silhouettes + matte/plastic surface + layered depth + mechanical hover/press",
        used: "Experimental — review before rollout",
      },
    ],
  },
];

function PreviewHeader() {
  return (
    <section className="border-b border-border bg-surface-subtle py-16 small:py-24">
      <Container>
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            Component catalog
          </span>
          <h1 className="font-display text-display-md font-extrabold tracking-tight text-foreground small:text-display-lg">
            Preview
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground small:text-lg">
            Toate organismele storefront-ului, grupate pe rol. Folosește-le ca
            referință când compui pagini noi sau când evaluezi alternative.
          </p>
          <nav
            aria-label="Catalog"
            className="mt-4 grid gap-6 small:grid-cols-2 medium:grid-cols-3"
          >
            {CATALOG.map((group) => (
              <div key={group.group} className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                  {group.group}
                </span>
                <ul className="flex flex-col gap-1.5">
                  {group.items.map((item) => (
                    <li key={item.anchor}>
                      <a
                        href={`#${item.anchor}`}
                        className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </Container>
    </section>
  );
}

function GroupHeader({ title }: { title: string }) {
  return (
    <div className="bg-foreground text-background">
      <Container className="py-8 small:py-10">
        <span className="font-display text-display-sm font-extrabold tracking-tight">
          {title}
        </span>
      </Container>
    </div>
  );
}

function ComponentLabel({ anchor, name, role, used }: CatalogItem) {
  return (
    <div
      id={anchor}
      className="scroll-mt-24 border-y border-border bg-muted/40"
    >
      <Container className="flex flex-col gap-1 py-4 medium:flex-row medium:items-baseline medium:gap-6">
        <span className="font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-foreground">
          {name}
        </span>
        <span className="text-xs text-muted-foreground">{role}</span>
        <span className="ml-auto text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          {used}
        </span>
      </Container>
    </div>
  );
}

function find(anchor: string): CatalogItem {
  for (const group of CATALOG) {
    const item = group.items.find((i) => i.anchor === anchor);
    if (item) return item;
  }
  throw new Error(`Unknown catalog anchor: ${anchor}`);
}

async function PreviewBestSellersRail({
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
        <div className="clip-corner-cut-md bg-surface-subtle/60 p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Adaugă produse pentru a vedea ProductRailSection în acțiune.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <ProductRailSection
      eyebrow="Cele mai vândute"
      title="Alese de profesioniști"
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

const PDP_PREVIEW_IMAGE = "/products/DTRW1214/DTRW1214.png";

// Detail/satellite images for the multi-image PDP hero variants. Convention:
// `images/products/<article>/<article>-N.png` for additional shots.
const PDP_PREVIEW_DETAIL_IMAGES = [
  "/products/DTRW1214/DTRW1214-2.png",
  "/products/DTRW1214/DTRW1214-3.png",
  "/products/DTRW1214/DTRW1214-4.png",
];

// Self-contained mock — preview pages should demo the components, not the
// catalog. No DB fetch, no coupling to a real product, no overrides leaking
// into other previews.
const MOCK_PDP_PRODUCT: HttpTypes.StoreProduct = (() => {
  const optionId = "opt-marime";
  const variantSizes = ['1/4"', '3/8"', '1/2"'] as const;
  const variantPrices = [90, 119, 159] as const;
  const now = new Date().toISOString();

  // Main image first (used as the hero/thumbnail), then detail images for
  // the satellites in StaggeredLayout (images[1..3]) and slides in
  // SpotlightLayout.
  const imageUrls = [PDP_PREVIEW_IMAGE, ...PDP_PREVIEW_DETAIL_IMAGES];
  const images: HttpTypes.StoreProductImage[] = imageUrls.map(
    (url, i) =>
      ({
        id: `mock-img-${i}`,
        url,
        rank: i,
        metadata: null,
        product_id: "mock-pdp-product",
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }) as HttpTypes.StoreProductImage
  );

  const options = [
    {
      id: optionId,
      title: "Mărime",
      product_id: "mock-pdp-product",
      metadata: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      values: variantSizes.map((value, i) => ({
        id: `${optionId}-value-${i}`,
        value,
        option_id: optionId,
        metadata: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
    },
  ] as unknown as HttpTypes.StoreProductOption[];

  const variants = variantSizes.map((size, i) => ({
    id: `mock-variant-${i}`,
    title: size,
    sku: `DTRW12${10 + i * 2}`,
    product_id: "mock-pdp-product",
    options: [
      {
        id: `${optionId}-value-${i}-link`,
        value: size,
        option_id: optionId,
      },
    ],
    calculated_price: {
      calculated_amount: variantPrices[i],
      original_amount: variantPrices[i],
      currency_code: "mdl",
    },
    metadata: {
      ingco_variant_image: PDP_PREVIEW_DETAIL_IMAGES[i] ?? PDP_PREVIEW_IMAGE,
    },
    manage_inventory: false,
    allow_backorder: false,
    inventory_quantity: 99,
    images: [],
    created_at: now,
    updated_at: now,
    deleted_at: null,
  })) as unknown as HttpTypes.StoreProductVariant[];

  return {
    id: "mock-pdp-product",
    title: "Antrenor cu clichet (demo)",
    handle: "antrenor-cu-clichet-demo",
    description:
      "Demo de componentă — antrenor cu clichet DYLLU compact și durabil, ideal pentru lucrări în spații înguste. Cap reversibil cu 45 de dinți, finisaj CR-V mat-șlefuit, prindere ergonomică.",
    thumbnail: PDP_PREVIEW_IMAGE,
    images,
    options,
    variants,
    metadata: {
      ingco_source_categories: "Seturi de instrumente",
      platform: "hand",
      tool_kind: "wrench",
    },
    status: "published",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } as unknown as HttpTypes.StoreProduct;
})();

function PreviewPdpHero({ region }: { region: HttpTypes.StoreRegion }) {
  return (
    <PdpHero
      product={MOCK_PDP_PRODUCT}
      region={region}
      eyebrow="Seturi de instrumente"
    />
  );
}

function PreviewPdpHeroVariant({
  variant,
}: {
  region: HttpTypes.StoreRegion;
  variant: "spotlight" | "marquee" | "staggered";
}) {
  return (
    <PdpHeroVariant
      product={MOCK_PDP_PRODUCT}
      eyebrow="Seturi de instrumente"
      variant={variant}
    />
  );
}

export async function PreviewTemplate() {
  const region = await getRegion();

  return (
    <>
      <PreviewHeader />

      <GroupHeader title="Hero & promoții" />

      <ComponentLabel {...find("promo-hero")} />
      <PromoHero
        eyebrow={SAMPLE_PROMO.eyebrow ?? ""}
        headline={
          <>
            Până la <span className="text-primary">−30%</span> la scule
            <br />
            electrice profesionale.
          </>
        }
        description={SAMPLE_PROMO.description}
        badge="Stoc limitat"
        primaryCta={{ label: "Vezi ofertele", href: "/store" }}
        secondaryCta={{
          label: "Compară modele",
          href: "/categories/scule-manuale",
        }}
        image={{
          src: "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
          alt: "Set DYLLU 20V — bormașină și polizor cu acumulator",
        }}
      />

      <ComponentLabel {...find("promo-mosaic-1")} />
      <PromoMosaic promos={[SAMPLE_PROMO]} />

      <ComponentLabel {...find("promo-mosaic-2")} />
      <PromoMosaic promos={[SAMPLE_PROMO, SAMPLE_PROMO_2]} />

      <ComponentLabel {...find("promo-mosaic-3")} />
      <PromoMosaic promos={[SAMPLE_PROMO, SAMPLE_PROMO_2, SAMPLE_PROMO_3]} />

      <ComponentLabel {...find("promo-mosaic-4")} />
      <PromoMosaic
        promos={[SAMPLE_PROMO, SAMPLE_PROMO_2, SAMPLE_PROMO_3, SAMPLE_PROMO_4]}
      />

      <ComponentLabel {...find("promo-tile-band-image")} />
      <PromoTileBand tiles={SAMPLE_TILES} hoverEffect="image" />

      <ComponentLabel {...find("promo-tile-band-tile")} />
      <PromoTileBand tiles={SAMPLE_TILES} hoverEffect="tile" />

      <ComponentLabel {...find("systems-grid")} />
      <SystemsGrid
        title="Explorează sistemele construite pentru nevoile tale"
        tiles={SAMPLE_SYSTEM_TILES}
      />

      <ComponentLabel {...find("systems-grid-video")} />
      <SystemsGrid
        title="Cu video în background (autoplay/loop/muted)"
        tiles={SAMPLE_SYSTEM_TILES_WITH_VIDEO}
      />

      <ComponentLabel {...find("promo-banner-strip")} />
      <PromoBannerStrip />

      <GroupHeader title="PDP" />

      <ComponentLabel {...find("pdp-hero")} />
      {region && <PreviewPdpHero region={region} />}

      <ComponentLabel {...find("pdp-hero-spotlight")} />
      {region && <PreviewPdpHeroVariant region={region} variant="spotlight" />}

      <ComponentLabel {...find("pdp-hero-marquee")} />
      {region && <PreviewPdpHeroVariant region={region} variant="marquee" />}

      <ComponentLabel {...find("pdp-hero-staggered")} />
      {region && <PreviewPdpHeroVariant region={region} variant="staggered" />}

      <GroupHeader title="Categorii" />

      <ComponentLabel {...find("tool-families-strip")} />
      <ToolFamiliesStrip />

      <ComponentLabel {...find("category-cinematic")} />
      <CategoryCinematic />

      <ComponentLabel {...find("category-mosaic")} />
      <CategoryMosaic />

      <ComponentLabel {...find("category-marquee")} />
      <CategoryMarquee />

      <ComponentLabel {...find("category-mosaic-reveal")} />
      <CategoryMosaicReveal />

      <GroupHeader title="Produse" />

      <ComponentLabel {...find("product-rail")} />
      {region && <PreviewBestSellersRail region={region} />}

      <ComponentLabel {...find("product-spotlight")} />
      <ProductSpotlight />

      <GroupHeader title="Trust & brand" />

      <ComponentLabel {...find("trust-band")} />
      <TrustBand />

      <ComponentLabel {...find("anatomy-showcase")} />
      <AnatomyShowcase
        eyebrow="Anatomia DYLLU"
        title="Ce găsești sub carcasă"
        intro="Fiecare produs trece prin testele noastre. Iată componentele care contează — și de ce."
        items={ANATOMY_ITEMS}
      />

      <ComponentLabel {...find("brand-strip")} />
      <BrandStrip />

      <GroupHeader title="Conținut & comunitate" />

      <ComponentLabel {...find("guides-grid")} />
      <GuidesGrid />

      <ComponentLabel {...find("customer-projects")} />
      <CustomerProjects />

      <ComponentLabel {...find("customer-testimonials")} />
      <CustomerTestimonials
        title="Ce spun clienții noștri"
        testimonials={SAMPLE_TESTIMONIALS}
      />

      <GroupHeader title="Lead capture" />

      <ComponentLabel {...find("newsletter-band")} />
      <NewsletterBand />

      <GroupHeader title="Atoms & molecules" />

      <ComponentLabel {...find("eyebrow-variants")} />
      <EyebrowShowcase />

      <GroupHeader title="Design system" />

      <ComponentLabel {...find("corner-cut-v2")} />
      <CornerCutV2Showcase />
    </>
  );
}

function EyebrowShowcase() {
  return (
    <section className="py-12 small:py-16">
      <Container>
        <div className="grid gap-8 small:grid-cols-2">
          <EyebrowSwatch label="dark (default)" bg="light">
            <Eyebrow variant="dark">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="primary" bg="light">
            <Eyebrow variant="primary">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="outlined" bg="light">
            <Eyebrow variant="outlined">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="tab" bg="light">
            <Eyebrow variant="tab">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="corner-cut" bg="light">
            <Eyebrow variant="corner-cut">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="bare (legacy)" bg="light">
            <Eyebrow variant="bare">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="dark — pe fundal închis" bg="dark">
            <Eyebrow variant="dark">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
          <EyebrowSwatch label="primary — pe fundal închis" bg="dark">
            <Eyebrow variant="primary">Cele mai vândute</Eyebrow>
          </EyebrowSwatch>
        </div>
      </Container>
    </section>
  );
}

function EyebrowSwatch({
  label,
  bg,
  children,
}: {
  label: string;
  bg: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "clip-corner-cut-md flex flex-col gap-4 p-6",
        bg === "light" ? "bg-surface-subtle/60" : "bg-foreground"
      )}
    >
      <span
        className={cn(
          "font-mono text-[11px] uppercase tracking-[0.18em]",
          bg === "light" ? "text-muted-foreground" : "text-background/60"
        )}
      >
        {label}
      </span>
      {children}
      <p
        className={cn(
          "mt-2 font-display text-xl font-extrabold tracking-tight",
          bg === "light" ? "text-foreground" : "text-background"
        )}
      >
        Alese de profesioniști
      </p>
    </div>
  );
}
