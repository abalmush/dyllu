import type { HomepageBlock, PromoCardData } from "@/lib/homepage/types";

const SPRING_PROMOS: PromoCardData[] = [
  {
    eyebrow: "Săptămâna sculelor electrice",
    title: "Până la −30% la scule electrice profesionale",
    description:
      "Bormașini, polizoare, multi-tool. Garanție 2 ani, livrare în toată Moldova.",
    ctaLabel: "Vezi ofertele",
    href: "/store",
    variant: "image",
    imageUrl:
      "/images/dyllu-dyllu-cordless-2-pieces-combo-kit-dtck20273-power-tool-combo-kit-1209174688.webp",
  },
  {
    eyebrow: "Sezon de primăvară",
    title: "Pregătește grădina",
    description: "Inventar de grădină gata de lucru, în stoc.",
    ctaLabel: "Vezi accesoriile",
    href: "/categories/gradinarit",
    variant: "primary",
  },
  {
    eyebrow: "Pachet contractor",
    title: "EIP la preț de volum",
    description: "Discounturi pentru companii și ateliere.",
    ctaLabel: "Solicită ofertă",
    href: "/contact",
    variant: "dark",
  },
];

export const homeBlocks: HomepageBlock[] = [
  { id: "hero", type: "promo-mosaic", promos: SPRING_PROMOS },
  { id: "families", type: "tool-families" },
  {
    id: "bestsellers",
    type: "product-rail",
    source: { kind: "bestsellers", limit: 8 },
    eyebrow: "Cele mai vândute",
    title: "Alese de profesioniști",
    viewAllHref: "/store",
    viewAllLabel: "Vezi toate produsele",
  },
  { id: "trust", type: "trust-band" },
  { id: "guides", type: "guides-grid" },
  { id: "customers", type: "customer-projects" },
  { id: "newsletter", type: "newsletter-band" },
];
