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
import {
  PdpHeroCombo,
  type ComboItem,
} from "@/components/organisms/pdp-hero-combo";
import { PdpHeroVariant } from "@/components/organisms/pdp-hero-variants";
import {
  LinkedProducts,
  type LinkedProduct,
} from "@/components/organisms/linked-products";
import { ProductTypeBadge } from "@/components/organisms/product-type-badge";
import {
  SetBreakdown,
  type SetPiece,
} from "@/components/organisms/set-breakdown";
import {
  ProductSpecs,
  type SpecRow,
} from "@/components/organisms/product-specs";
import { DeliveryTrust } from "@/components/organisms/delivery-trust";
import {
  ProductReviews,
  type Review,
} from "@/components/organisms/product-reviews";
import {
  PlpProductCard,
  type PlpProduct,
} from "@/components/organisms/plp-product-card";
import {
  PlpFilters,
  ActiveFilterChips,
  type FilterGroup,
} from "@/components/organisms/plp-filters";
import { PlpToolbar } from "@/components/organisms/plp-toolbar";
import { EmptyState } from "@/components/organisms/empty-state";
import {
  CartLineItem,
  type CartLineItemData,
} from "@/components/organisms/cart-line-item";
import {
  CartSummary,
  type SummaryLine,
} from "@/components/organisms/cart-summary";
import { CheckoutAddressForm } from "@/components/organisms/checkout-address-form";
import {
  CheckoutSteps,
  ShippingMethodPicker,
  PaymentMethodPicker,
  OrderConfirmation,
} from "@/components/organisms/checkout-blocks";
import {
  DecisionCenterCart,
  ProjectReadiness,
  RiskAlert,
} from "@/components/organisms/decision-center";
import {
  DeliveryTimeline,
  CostBreakdown,
  CheckoutHealthScore,
  EmotionCta,
} from "@/components/organisms/checkout-intelligence";
import {
  ConfidenceMeter,
  CompareInline,
  CompatibilityGraph,
} from "@/components/organisms/product-confidence";
import { BudgetSlider } from "@/components/organisms/budget-slider";
import { CheckoutCopilot } from "@/components/organisms/checkout-copilot";
import { ProjectWorkspace } from "@/components/organisms/project-workspace";
import { SearchX, ShoppingBag } from "lucide-react";
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
  href: "/categories/burghie-beton",
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
    href: "/categories/echipament-de-protectie",
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
    href: "/categories/consumabile-si-accesorii",
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
    href: "/categories/echipament-de-protectie",
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
      {
        anchor: "pdp-hero-combo-tiles",
        name: "PdpHero · Combo (tiles)",
        role: "Combo — produs principal mare pe stânga + accesoriile incluse ca plăci etichetate pe dreapta (2 baterii + lanț). Heading „Inclus în combo”.",
        used: "Variantă pentru produse combo — arată clar ce conține setul",
      },
      {
        anchor: "pdp-hero-combo-row",
        name: "PdpHero · Combo (row)",
        role: "Combo — produs principal sus, sub el un rând „Ce include” cu accesoriile ca ecuație (bifă + conector +, badge ×2).",
        used: "Variantă pentru produse combo — bill of materials orizontal",
      },
      {
        anchor: "pdp-hero-combo-grid",
        name: "PdpHero · Combo (grid)",
        role: "Combo — grilă 2×2 cu toate piesele egale, produsul principal marcat. Heading minimal „Set complet”.",
        used: "Variantă pentru produse combo — layout simetric",
      },
      {
        anchor: "pdp-hero-combo-marquee",
        name: "PdpHero · Marquee (combo)",
        role: "Marquee autoscroll populat cu imaginile combo (fierăstrău + acumulatori + lanț de rezervă).",
        used: "Variantă dinamică — necesită 2+ imagini pentru efect maxim",
      },
      {
        anchor: "pdp-hero-combo-addon",
        name: "PdpHero · Combo (accesorii neincluse)",
        role: "Ca „tiles”, dar accesoriile NU sunt incluse — marcate clar „Nu e inclus”, cu preț și buton „Adaugă în coș” pe fiecare. Produsul principal marcat „Inclus”.",
        used: "Variantă pentru produse care necesită accesorii vândute separat",
      },
      {
        anchor: "pdp-linked-compatible",
        name: "LinkedProducts · Compatibile",
        role: "Produse separate (SKU proprii) compatibile cu produsul principal — badge relație (Accesoriu / Piesă de schimb / Recomandat), preț, stoc, „Vezi produsul” + „Adaugă”. Callout de compatibilitate.",
        used: "Pentru produse cu accesorii / piese linkate, vândute separat",
      },
      {
        anchor: "pdp-linked-bundle",
        name: "LinkedProducts · Cumpărate împreună",
        role: "„Cumpărate frecvent împreună” — produsul principal + linkate, cu total set și „Adaugă toate în coș”.",
        used: "Cross-sell bundle pentru produse linkate",
      },
      {
        anchor: "pdp-type-badges",
        name: "ProductTypeBadge",
        role: "Badge de tip produs, refolosit în PDP/PLP/coș: Produs individual · Set N piese · Kit complet · Combo · Necesită acumulator.",
        used: "Semnal la prima vedere pentru tipul produsului",
      },
      {
        anchor: "pdp-set-breakdown",
        name: "SetBreakdown",
        role: "Conținutul unui set — badge „N piese incluse” + grilă de piese (imagini sau chip-uri cu etichete).",
        used: "Pentru produse de tip „set” (138 în catalog)",
      },
      {
        anchor: "pdp-specs",
        name: "ProductSpecs",
        role: "Descriere + tabel de specificații (dl) pe două coloane.",
        used: "Secțiune standard pe orice PDP",
      },
      {
        anchor: "pdp-delivery-trust",
        name: "DeliveryTrust",
        role: "Rând de carduri: livrare, plată MAIB, garanție, retur, suport.",
        used: "Reasigurare — orice PDP",
      },
      {
        anchor: "pdp-reviews",
        name: "ProductReviews",
        role: "Sumar rating (medie + distribuție pe stele) + listă de recenzii.",
        used: "Secțiune de recenzii pe PDP",
      },
    ],
  },
  {
    group: "PLP (listing)",
    items: [
      {
        anchor: "plp-grid",
        name: "PLP · Listing complet",
        role: "Pagină de listare asamblată: filtre laterale + toolbar (sortare + nr. rezultate) + chip-uri filtre active + grilă de carduri.",
        used: "Compoziția paginii de categorie / căutare",
      },
      {
        anchor: "plp-empty",
        name: "EmptyState",
        role: "Stare goală reutilizabilă (icon + titlu + mesaj + CTA) — pentru zero rezultate, coș gol etc.",
        used: "Zero rezultate / coș gol / favorite goale",
      },
    ],
  },
  {
    group: "Coș",
    items: [
      {
        anchor: "cart-full",
        name: "Cart · asamblat",
        role: "Coș complet: linii de produs (cu badge de tip + conținut combo/set) + sumar cu cod promoțional și „Se cumpără des împreună”.",
        used: "Pagina de coș",
      },
      {
        anchor: "cart-empty",
        name: "Cart · gol",
        role: "Stare de coș gol (EmptyState).",
        used: "Când coșul nu are produse",
      },
    ],
  },
  {
    group: "Finalizare comandă",
    items: [
      {
        anchor: "checkout-full",
        name: "Finalizare comandă · asamblat",
        role: "Pași (Adresă→Livrare→Plată→Confirmare) + formular adresă + metodă livrare + metodă plată + sumar comandă cu „Plasează comanda”.",
        used: "Pagina de checkout",
      },
      {
        anchor: "checkout-confirmation",
        name: "Confirmare comandă",
        role: "Ecran de succes: bifă, număr comandă, mesaj și CTA către comandă.",
        used: "După plasarea comenzii",
      },
    ],
  },
  {
    group: "AI / Next-gen",
    items: [
      {
        anchor: "ai-workspace",
        name: "ProjectWorkspace (capstone)",
        role: "Spațiu de proiect cu 4 panouri: produse + compatibilitate vizuală + asistent AI + bară acțiuni. Coș→Finalizare comandă devine planificare de proiect.",
        used: "Viziune: workspace în loc de formular",
      },
      {
        anchor: "ai-decision-cart",
        name: "DecisionCenterCart",
        role: "Coșul ca centru de decizie: ce e ok (compatibil / livrare / total) + probleme potențiale reale (avertizări + critice).",
        used: "Coș inteligent",
      },
      {
        anchor: "ai-readiness",
        name: "ProjectReadiness",
        role: "Scor de pregătire a proiectului (bară %) + ce lipsește cu „Adaugă” + șanse de reușită.",
        used: "„Oamenii cumpără proiecte reușite, nu scule”",
      },
      {
        anchor: "ai-risk",
        name: "RiskAlert",
        role: "Detecție de risc: „Nu vei putea folosi produsul” + un click pentru remediere.",
        used: "Ajutor, nu upsell",
      },
      {
        anchor: "ai-confidence",
        name: "ConfidenceMeter",
        role: "Recomandare cu scor de încredere + motivele explicate (nu doar „Recomandat”).",
        used: "Explică recomandările",
      },
      {
        anchor: "ai-compare",
        name: "CompareInline",
        role: "Comparație în coș, fără navigare — actual vs alternativă, cu evidențierea valorii mai bune.",
        used: "Comparare fără a părăsi pagina",
      },
      {
        anchor: "ai-compat-graph",
        name: "CompatibilityGraph",
        role: "Graf de compatibilitate (verde / galben / roșu) pentru produsul principal și accesorii.",
        used: "Compatibilitate vizuală",
      },
      {
        anchor: "ai-budget",
        name: "BudgetSlider",
        role: "Slider de buget: AI înlocuiește componente păstrând compatibilitatea; buget ↔ performanță.",
        used: "Optimizare de buget",
      },
      {
        anchor: "ai-timeline",
        name: "DeliveryTimeline",
        role: "Finalizare comandă ca poveste: comandă → expediere → livrare → zi de montaj (vreme + timp estimat).",
        used: "Time-machine checkout",
      },
      {
        anchor: "ai-cost",
        name: "CostBreakdown",
        role: "Defalcare vizuală a prețului (bară segmentată + legendă).",
        used: "Prețuri transparente",
      },
      {
        anchor: "ai-health",
        name: "CheckoutHealthScore",
        role: "Scor de „sănătate” a comenzii + checklist verificat — reasigurare.",
        used: "Încredere înainte de plată",
      },
      {
        anchor: "ai-copilot",
        name: "CheckoutCopilot",
        role: "Asistent conversațional: întrebări sugerate + fir de chat + input.",
        used: "Copilot mereu disponibil",
      },
      {
        anchor: "ai-emotion",
        name: "EmotionCta",
        role: "CTA emoțional: „Ești gata” + șanse de reușită + finalizare estimată.",
        used: "Oamenii rețin emoții, nu butoane",
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
            Catalog componente
          </span>
          <h1 className="font-display text-display-md font-extrabold tracking-tight text-foreground small:text-display-lg">
            Previzualizare
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

const COMBO_IMAGE_BASE = "/products/DTCLP5121";

const MOCK_COMBO_PRODUCT: HttpTypes.StoreProduct = (() => {
  const now = new Date().toISOString();
  return {
    id: "mock-combo-product",
    title: "Fierăstrău cu lanț fără fir 20V — combo cu 2 acumulatori",
    handle: "fierastrau-cu-lant-combo-dtclp5121",
    description:
      "Set complet DYLLU 20V: fierăstrău cu lanț brushless de 12″, doi acumulatori Li-Ion de 5.0Ah pentru autonomie extinsă și un lanț de rezervă de 18″. Gata de lucru din cutie.",
    thumbnail: `${COMBO_IMAGE_BASE}/DTCLP5121.png`,
    images: [
      `${COMBO_IMAGE_BASE}/DTCLP5121.png`,
      `${COMBO_IMAGE_BASE}/DTLBP550.png`,
      `${COMBO_IMAGE_BASE}/DTZY1418.png`,
    ].map(
      (url, i) =>
        ({
          id: `combo-img-${i}`,
          url,
          rank: i,
          metadata: null,
          product_id: "mock-combo-product",
          created_at: now,
          updated_at: now,
          deleted_at: null,
        }) as unknown as HttpTypes.StoreProductImage
    ),
    options: [],
    variants: [
      {
        id: "mock-combo-variant",
        title: "Combo",
        sku: "DTCLP5121-COMBO",
        product_id: "mock-combo-product",
        options: [],
        calculated_price: {
          calculated_amount: 6499,
          original_amount: 7499,
          currency_code: "mdl",
        },
        manage_inventory: false,
        allow_backorder: false,
        inventory_quantity: 25,
        images: [],
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ] as unknown as HttpTypes.StoreProductVariant[],
    metadata: null,
    status: "published",
    created_at: now,
    updated_at: now,
    deleted_at: null,
  } as unknown as HttpTypes.StoreProduct;
})();

const COMBO_ITEMS: ComboItem[] = [
  {
    id: "DTLBP550",
    name: "Acumulator 20V 5.0Ah",
    image: `${COMBO_IMAGE_BASE}/DTLBP550.png`,
    quantity: 2,
    note: "Li-Ion · Lithium Share",
    price: 899,
  },
  {
    id: "DTZY1418",
    name: "Lanț de rezervă 18″",
    image: `${COMBO_IMAGE_BASE}/DTZY1418.png`,
    quantity: 1,
    note: "Compatibil ghidaj 18″",
    price: 349,
  },
];

function PreviewPdpHeroCombo({
  layout,
}: {
  layout: "tiles" | "row" | "grid" | "addon";
}) {
  return (
    <PdpHeroCombo
      product={MOCK_COMBO_PRODUCT}
      items={COMBO_ITEMS}
      eyebrow="Set combo"
      layout={layout}
    />
  );
}

const LINKED_PRODUCTS: LinkedProduct[] = [
  {
    id: "DTZY1418",
    handle: "lant-de-rezerva-18-dtzy1418",
    name: "Lanț de rezervă 18″ DTZY1418",
    image: `${COMBO_IMAGE_BASE}/DTZY1418.png`,
    price: 349,
    relation: "spare-part",
    compatibility: "Compatibil cu ghidaj 18″",
    inStock: true,
  },
  {
    id: "DTLBP550",
    handle: "acumulator-20v-5ah-dtlbp550",
    name: "Acumulator 20V 5.0Ah DTLBP550",
    image: `${COMBO_IMAGE_BASE}/DTLBP550.png`,
    price: 899,
    compareAtPrice: 1099,
    relation: "accessory",
    compatibility: "Platforma DYLLU 20V P20S",
    inStock: true,
  },
  {
    id: "SAFETY",
    handle: "set-protectie-forestiera",
    name: "Set protecție forestieră (cască + vizieră)",
    image: "/images/dyllu-safety-gear.png",
    price: 1290,
    relation: "recommended",
    compatibility: "Recomandat pentru lucrări cu fierăstrăul",
    inStock: false,
  },
];

function PreviewLinkedProducts({
  layout,
}: {
  layout: "compatible" | "bundle";
}) {
  return (
    <LinkedProducts
      layout={layout}
      mainName="Fierăstrău cu lanț 20V DTCLP5121"
      mainImage={`${COMBO_IMAGE_BASE}/DTCLP5121.png`}
      mainPrice={6499}
      products={LINKED_PRODUCTS}
      compatibilityNote="Compatibil cu platforma DYLLU 20V P20S — aceleași baterii și accesorii pe toate sculele din serie."
    />
  );
}

function PreviewProductTypeBadges() {
  return (
    <div className="bg-background px-4 py-10 small:px-8 medium:px-12">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-3">
        <ProductTypeBadge type="single" />
        <ProductTypeBadge type="set" count={62} />
        <ProductTypeBadge type="kit" />
        <ProductTypeBadge type="combo" />
        <ProductTypeBadge type="needs-battery" />
      </div>
    </div>
  );
}

const SET_PIECES: SetPiece[] = [
  "PH0",
  "PH1",
  "PH2",
  "PZ1",
  "PZ2",
  "SL4",
  "SL5.5",
  "T10",
  "T15",
  "T20",
  "H4",
  "Adaptor magnetic",
].map((label) => ({ id: label, label }));

const CHAINSAW_SPECS: SpecRow[] = [
  { label: "Tensiune", value: "20V" },
  { label: "Lungime ghidaj", value: '12"' },
  { label: "Viteză lanț", value: "10 m/s" },
  { label: "Tip motor", value: "Brushless (fără perii)" },
  { label: "Acumulatori incluși", value: "2 × 4.0Ah" },
  { label: "Greutate (fără acumulator)", value: "3.2 kg" },
];

const SAMPLE_REVIEWS: Review[] = [
  {
    id: "r1",
    author: "Andrei P.",
    rating: 5,
    date: "12 iunie 2026",
    body: "Taie fără efort lemn de până la 25 cm. Bateriile țin surprinzător de mult, iar motorul brushless e silențios.",
  },
  {
    id: "r2",
    author: "Victor C.",
    rating: 4,
    date: "3 iunie 2026",
    body: "Foarte bun pentru grădină. Aș fi vrut o husă inclusă, dar per total raport calitate-preț excelent.",
  },
  {
    id: "r3",
    author: "Mihai R.",
    rating: 5,
    date: "28 mai 2026",
    body: "Am înlocuit un fierăstrău pe benzină cu acesta și nu regret. Pornire instant, zero fum.",
  },
];

const salePrice = (
  calc: string,
  orig: string,
  diff: number
): PlpProduct["price"] => ({
  calculated_price: calc,
  original_price: orig,
  price_type: "sale",
  percentage_diff: diff,
});
const plainPrice = (calc: string): PlpProduct["price"] => ({
  calculated_price: calc,
  price_type: "default",
});

const PLP_PRODUCTS: PlpProduct[] = [
  {
    id: "DTCLP5121",
    href: "/products/fierastrau-cu-lant-combo-dtclp5121",
    title: "Fierăstrău cu lanț fără fir 20V — combo 2 acumulatori",
    thumbnail: `${COMBO_IMAGE_BASE}/DTCLP5121.png`,
    category: "Scule electrice",
    price: salePrice("6.499 MDL", "7.499 MDL", 13),
    productType: "combo",
    inStock: true,
    rating: 4.6,
    reviewCount: 38,
  },
  {
    id: "DTLBP550",
    href: "/products/acumulator-20v-5ah-dtlbp550",
    title: "Acumulator 20V 5.0Ah Li-Ion DTLBP550",
    thumbnail: `${COMBO_IMAGE_BASE}/DTLBP550.png`,
    category: "Acumulatori",
    price: salePrice("899 MDL", "1.099 MDL", 18),
    productType: "single",
    inStock: true,
    rating: 4.8,
    reviewCount: 52,
  },
  {
    id: "SET62",
    href: "/products/set-biti-surubelnita-62",
    title: "Set biți șurubelniță cromați — 62 piese",
    thumbnail: "/images/dyllu-consumables.png",
    category: "Accesorii",
    price: plainPrice("349 MDL"),
    productType: "set",
    setCount: 62,
    inStock: true,
    rating: 4.5,
    reviewCount: 17,
  },
  {
    id: "VAC",
    href: "/products/aspirator-p20s",
    title: "Aspirator umed/uscat 20V P20S",
    thumbnail: "/images/dyllu-vacuum-p20s.png",
    category: "Scule electrice",
    price: plainPrice("1.290 MDL"),
    productType: "needs-battery",
    inStock: true,
    rating: 4.3,
    reviewCount: 9,
  },
  {
    id: "DTZY1418",
    href: "/products/lant-de-rezerva-18-dtzy1418",
    title: "Lanț de rezervă 18″ DTZY1418",
    thumbnail: `${COMBO_IMAGE_BASE}/DTZY1418.png`,
    category: "Piese de schimb",
    price: plainPrice("349 MDL"),
    productType: "single",
    inStock: true,
    rating: 4.7,
    reviewCount: 6,
  },
  {
    id: "SAFETY",
    href: "/products/set-protectie-forestiera",
    title: "Set protecție forestieră (cască + vizieră + antifoane)",
    thumbnail: "/images/dyllu-safety-gear.png",
    category: "Protecție",
    price: plainPrice("1.290 MDL"),
    productType: "kit",
    inStock: false,
    rating: 4.9,
    reviewCount: 21,
  },
];

const PLP_FILTER_GROUPS: FilterGroup[] = [
  {
    id: "category",
    label: "Categorie",
    options: [
      { value: "scule-electrice", label: "Scule electrice", count: 128 },
      { value: "acumulatori", label: "Acumulatori", count: 24 },
      { value: "accesorii", label: "Accesorii", count: 96 },
      { value: "protectie", label: "Protecție", count: 41 },
    ],
  },
  {
    id: "type",
    label: "Tip produs",
    options: [
      { value: "single", label: "Produs individual", count: 634 },
      { value: "set", label: "Set", count: 138 },
      { value: "kit", label: "Kit complet", count: 116 },
    ],
  },
  {
    id: "availability",
    label: "Disponibilitate",
    options: [
      { value: "in-stock", label: "În stoc", count: 812 },
      { value: "on-sale", label: "La reducere", count: 74 },
    ],
  },
];

function PreviewPlp() {
  return (
    <div className="bg-background px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto grid max-w-[1320px] gap-8 medium:grid-cols-[240px_1fr]">
        <PlpFilters
          groups={PLP_FILTER_GROUPS}
          priceRange={{ min: 0, max: 8000 }}
        />
        <div className="flex flex-col gap-6">
          <PlpToolbar resultCount={PLP_PRODUCTS.length} />
          <ActiveFilterChips filters={["Scule electrice", "În stoc", "20V"]} />
          <div className="grid grid-cols-2 gap-4 medium:grid-cols-3">
            {PLP_PRODUCTS.map((product) => (
              <PlpProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPlpEmpty() {
  return (
    <div className="bg-background px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto max-w-[720px]">
        <EmptyState
          icon={SearchX}
          title="Niciun produs găsit"
          message="Încearcă să elimini câteva filtre sau caută alt termen. Îți putem recomanda alternative compatibile."
          cta={{ label: "Vezi toate produsele", href: "/store" }}
        />
      </div>
    </div>
  );
}

const CART_ITEMS: CartLineItemData[] = [
  {
    id: "DTCLP5121",
    title: "Fierăstrău cu lanț fără fir 20V — combo 2 acumulatori",
    href: "/products/fierastrau-cu-lant-combo-dtclp5121",
    thumbnail: `${COMBO_IMAGE_BASE}/DTCLP5121.png`,
    unitPrice: "6.499 MDL",
    originalUnitPrice: "7.499 MDL",
    quantity: 1,
    productType: "combo",
    includes: ["2× Acumulator 5.0Ah", 'Lanț de rezervă 18"'],
  },
  {
    id: "SET62",
    title: "Set biți șurubelniță cromați — 62 piese",
    href: "/products/set-biti-surubelnita-62",
    thumbnail: "/images/dyllu-consumables.png",
    unitPrice: "698 MDL",
    quantity: 2,
    variantLabel: "349 MDL / buc",
    productType: "set",
    setCount: 62,
  },
  {
    id: "DTLBP550",
    title: "Acumulator 20V 5.0Ah Li-Ion DTLBP550",
    href: "/products/acumulator-20v-5ah-dtlbp550",
    thumbnail: `${COMBO_IMAGE_BASE}/DTLBP550.png`,
    unitPrice: "899 MDL",
    originalUnitPrice: "1.099 MDL",
    quantity: 1,
    productType: "single",
  },
];

const CART_SUMMARY_LINES: SummaryLine[] = [
  { label: "Subtotal", value: "8.096 MDL" },
  { label: "Reducere (COMBO13)", value: "−400 MDL", muted: true },
  { label: "Livrare", value: "Gratuită", muted: true },
];

function PreviewCart() {
  return (
    <div className="bg-surface-subtle px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto grid max-w-[1200px] gap-8 medium:grid-cols-[1fr_360px] medium:items-start">
        <div className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border">
          <h2 className="mb-2 font-display text-xl font-bold text-foreground">
            Coșul tău · {CART_ITEMS.length} produse
          </h2>
          {CART_ITEMS.map((item) => (
            <CartLineItem key={item.id} item={item} />
          ))}
        </div>
        <CartSummary
          lines={CART_SUMMARY_LINES}
          total="7.696 MDL"
          note="Plată securizată MAIB · 3-D Secure"
        />
      </div>

      <div className="mx-auto mt-10 max-w-[1200px]">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Se cumpără des împreună
        </h3>
        <div className="grid grid-cols-2 gap-4 small:grid-cols-3">
          {PLP_PRODUCTS.filter((p) =>
            ["DTZY1418", "VAC", "SAFETY"].includes(p.id)
          ).map((product) => (
            <PlpProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewCartEmpty() {
  return (
    <div className="bg-background px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto max-w-[720px]">
        <EmptyState
          icon={ShoppingBag}
          title="Coșul tău este gol"
          message="Nu ai adăugat încă niciun produs. Descoperă sculele și seturile DYLLU."
          cta={{ label: "Începe cumpărăturile", href: "/store" }}
        />
      </div>
    </div>
  );
}

function PreviewCheckout() {
  return (
    <div className="bg-surface-subtle px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto max-w-[1200px]">
        <CheckoutSteps current={2} />
        <div className="mt-8 grid gap-8 medium:grid-cols-[1fr_360px] medium:items-start">
          <div className="space-y-6">
            <CheckoutAddressForm />
            <ShippingMethodPicker />
            <PaymentMethodPicker />
          </div>
          <CartSummary
            lines={CART_SUMMARY_LINES}
            total="7.696 MDL"
            note="Plată securizată MAIB · 3-D Secure"
            cta={{ label: "Plasează comanda", href: "#" }}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewCheckoutConfirmation() {
  return (
    <div className="bg-background px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto max-w-[720px]">
        <OrderConfirmation orderNumber="DYL-100482" />
      </div>
    </div>
  );
}

function AiPad({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background px-4 py-12 small:px-8 medium:px-12">
      {children}
    </div>
  );
}

function PreviewAiDecisionCart() {
  return (
    <AiPad>
      <DecisionCenterCart
        project="Construiești un deck în acest weekend"
        checks={[
          "Tot ce ai nevoie",
          "Componente compatibile",
          "Livrare vineri",
          "Total: 8.696 MDL",
        ]}
        total="8.696 MDL"
        problems={[
          { text: "Nu ai ochelari de protecție.", severity: "warning" },
          {
            text: "Acumulatorul ține ~25 min la sarcină mare.",
            severity: "warning",
          },
          {
            text: "Fierăstrăul nu are pânză compatibilă — nu îl poți folosi.",
            severity: "critical",
          },
        ]}
      />
    </AiPad>
  );
}

function PreviewAiReadiness() {
  return (
    <AiPad>
      <ProjectReadiness
        percent={82}
        missing={["Mască de praf", "Cleme de strângere", "Pânză de rezervă"]}
        successLabel="Ridicate"
      />
    </AiPad>
  );
}

function PreviewAiRisk() {
  return (
    <AiPad>
      <RiskAlert
        message="Nu vei putea folosi fierăstrăul la livrare."
        detail="L-ai adăugat fără o pânză compatibilă în coș."
        fixLabel="Adaugă pânză compatibilă"
      />
    </AiPad>
  );
}

function PreviewAiConfidence() {
  return (
    <AiPad>
      <ConfidenceMeter
        name="Fierăstrău circular 20V DTCS5120"
        rating={5}
        confidence={97}
        verdict="Cea mai bună alegere"
        reasons={[
          "se potrivește cu achizițiile tale anterioare",
          "mai ușor decât alternativele din gamă",
          "cuplu suficient pentru un deck",
          "compatibil cu familia ta de acumulatori 20V",
        ]}
      />
    </AiPad>
  );
}

function PreviewAiCompare() {
  return (
    <AiPad>
      <CompareInline
        currentName="Model actual"
        alternativeName="Alternativă AI"
        rows={[
          {
            label: "Greutate",
            current: "1.8 kg",
            alternative: "1.3 kg",
            better: "alternative",
          },
          {
            label: "Cuplu",
            current: "92 Nm",
            alternative: "74 Nm",
            better: "current",
          },
          {
            label: "Acumulator",
            current: "Același",
            alternative: "Același",
            better: "same",
          },
          {
            label: "Preț",
            current: "—",
            alternative: "−400 MDL",
            better: "alternative",
          },
        ]}
      />
    </AiPad>
  );
}

function PreviewAiCompatGraph() {
  return (
    <AiPad>
      <CompatibilityGraph
        root="Fierăstrău 20V"
        nodes={[
          { id: "bat", label: "Acumulator 20V", status: "ok" },
          { id: "chg", label: "Încărcător rapid", status: "ok" },
          { id: "guide", label: "Ghidaj vechi", status: "warn" },
          { id: "bat18", label: "Acumulator 18V terț", status: "bad" },
        ]}
      />
    </AiPad>
  );
}

function PreviewAiBudget() {
  return (
    <AiPad>
      <BudgetSlider minBudget={6900} maxBudget={9300} />
    </AiPad>
  );
}

function PreviewAiTimeline() {
  return (
    <AiPad>
      <DeliveryTimeline />
    </AiPad>
  );
}

function PreviewAiCost() {
  return (
    <AiPad>
      <CostBreakdown
        total="8.696 MDL"
        segments={[
          {
            label: "Produse",
            amount: "7.696 MDL",
            percent: 82,
            color: "bg-primary",
          },
          {
            label: "Livrare",
            amount: "150 MDL",
            percent: 6,
            color: "bg-success",
          },
          {
            label: "TVA inclus",
            amount: "760 MDL",
            percent: 10,
            color: "bg-warning",
          },
          {
            label: "Taxă reciclare",
            amount: "90 MDL",
            percent: 2,
            color: "bg-muted-foreground",
          },
        ]}
      />
    </AiPad>
  );
}

function PreviewAiHealth() {
  return (
    <AiPad>
      <CheckoutHealthScore
        score={98}
        items={[
          "Adresă verificată",
          "Produse compatibile",
          "Garanție inclusă",
          "Livrare confirmată",
          "Retururi active",
          "Plată securizată",
        ]}
      />
    </AiPad>
  );
}

function PreviewAiCopilot() {
  return (
    <AiPad>
      <CheckoutCopilot />
    </AiPad>
  );
}

function PreviewAiEmotion() {
  return (
    <AiPad>
      <EmotionCta successPercent={96} completion="Sâmbătă după-amiază" />
    </AiPad>
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

      <ComponentLabel {...find("pdp-hero-combo-tiles")} />
      <PreviewPdpHeroCombo layout="tiles" />

      <ComponentLabel {...find("pdp-hero-combo-row")} />
      <PreviewPdpHeroCombo layout="row" />

      <ComponentLabel {...find("pdp-hero-combo-grid")} />
      <PreviewPdpHeroCombo layout="grid" />

      <ComponentLabel {...find("pdp-hero-combo-marquee")} />
      <PdpHeroVariant
        product={MOCK_COMBO_PRODUCT}
        eyebrow="Set combo"
        variant="marquee"
      />

      <ComponentLabel {...find("pdp-hero-combo-addon")} />
      <PreviewPdpHeroCombo layout="addon" />

      <ComponentLabel {...find("pdp-linked-compatible")} />
      <PreviewLinkedProducts layout="compatible" />

      <ComponentLabel {...find("pdp-linked-bundle")} />
      <PreviewLinkedProducts layout="bundle" />

      <ComponentLabel {...find("pdp-type-badges")} />
      <PreviewProductTypeBadges />

      <ComponentLabel {...find("pdp-set-breakdown")} />
      <SetBreakdown
        title="Set biți șurubelniță 62 piese"
        pieceCount={62}
        pieces={SET_PIECES}
      />

      <ComponentLabel {...find("pdp-specs")} />
      <ProductSpecs
        description="Fierăstrău cu lanț fără fir DYLLU 20V, motor brushless și ghidaj de 12″. Ideal pentru tăieri în grădină și lucrări forestiere ușoare. Livrat cu doi acumulatori de 4.0Ah pentru autonomie extinsă."
        specs={CHAINSAW_SPECS}
      />

      <ComponentLabel {...find("pdp-delivery-trust")} />
      <DeliveryTrust />

      <ComponentLabel {...find("pdp-reviews")} />
      <ProductReviews
        average={4.6}
        count={38}
        distribution={[24, 9, 3, 1, 1]}
        reviews={SAMPLE_REVIEWS}
      />

      <GroupHeader title="PLP (listare)" />

      <ComponentLabel {...find("plp-grid")} />
      <PreviewPlp />

      <ComponentLabel {...find("plp-empty")} />
      <PreviewPlpEmpty />

      <GroupHeader title="Coș" />

      <ComponentLabel {...find("cart-full")} />
      <PreviewCart />

      <ComponentLabel {...find("cart-empty")} />
      <PreviewCartEmpty />

      <GroupHeader title="Finalizare comandă" />

      <ComponentLabel {...find("checkout-full")} />
      <PreviewCheckout />

      <ComponentLabel {...find("checkout-confirmation")} />
      <PreviewCheckoutConfirmation />

      <GroupHeader title="AI / Next-gen" />

      <ComponentLabel {...find("ai-workspace")} />
      <ProjectWorkspace />

      <ComponentLabel {...find("ai-decision-cart")} />
      <PreviewAiDecisionCart />

      <ComponentLabel {...find("ai-readiness")} />
      <PreviewAiReadiness />

      <ComponentLabel {...find("ai-risk")} />
      <PreviewAiRisk />

      <ComponentLabel {...find("ai-confidence")} />
      <PreviewAiConfidence />

      <ComponentLabel {...find("ai-compare")} />
      <PreviewAiCompare />

      <ComponentLabel {...find("ai-compat-graph")} />
      <PreviewAiCompatGraph />

      <ComponentLabel {...find("ai-budget")} />
      <PreviewAiBudget />

      <ComponentLabel {...find("ai-timeline")} />
      <PreviewAiTimeline />

      <ComponentLabel {...find("ai-cost")} />
      <PreviewAiCost />

      <ComponentLabel {...find("ai-health")} />
      <PreviewAiHealth />

      <ComponentLabel {...find("ai-copilot")} />
      <PreviewAiCopilot />

      <ComponentLabel {...find("ai-emotion")} />
      <PreviewAiEmotion />

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
