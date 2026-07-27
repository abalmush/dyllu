import type { HomepageBlock, PromoCardData } from "@/lib/homepage/types";

const HOMEPAGE_PROMOS: PromoCardData[] = [
  {
    eyebrow: "Platforma DYLLU cu acumulator",
    title: "Scule fără cablu, gata de lucru",
    description:
      "Descoperă toate sculele cu acumulator pentru atelier, șantier, grădină sau casă.",
    ctaLabel: "Vezi sculele cu acumulator",
    href: "/collections/scule-cu-acumulator",
    variant: "image",
    imageUrl: "/images/home/hero-combo-kit.webp",
  },
  {
    eyebrow: "Atelier de lemn",
    title: "Taie, ajustează, finisează",
    ctaLabel: "Vezi sculele",
    href: "/categories/scule-pentru-lemn",
    variant: "image",
    imageUrl: "/images/home/story-woodworking.webp",
  },
  {
    eyebrow: "Prelucrarea metalului",
    title: "Taie, șlefuiește, sudează",
    ctaLabel: "Vezi sculele pentru metal",
    href: "/categories/scule-pentru-metal",
    variant: "image",
    imageUrl: "/images/home/story-auto-service.webp",
  },
];

export const homeBlocks: HomepageBlock[] = [
  { id: "hero", type: "promo-mosaic", promos: HOMEPAGE_PROMOS },
  { id: "families", type: "tool-families" },
  {
    id: "bestsellers",
    type: "product-rail",
    source: {
      kind: "collection",
      collectionHandle: "scule-cu-acumulator",
      limit: 6,
      selection: "diverse-random",
    },
    eyebrow: "Scule cu acumulator",
    title: "Descoperă gama DYLLU",
    viewAllHref: "/collections/scule-cu-acumulator",
    viewAllLabel: "Vezi toate sculele",
  },
  { id: "trust", type: "trust-band" },
  { id: "stories", type: "shop-stories" },
  { id: "newsletter", type: "newsletter-band" },
];
