import type { HomepageBlock, PromoCardData } from "@/lib/homepage/types";

type TranslateHomepage = (key: string) => string;

const getHomepagePromos = (t: TranslateHomepage): PromoCardData[] => [
  {
    eyebrow: t("promos.acumulator.eyebrow"),
    title: t("promos.acumulator.title"),
    description: t("promos.acumulator.description"),
    ctaLabel: t("promos.acumulator.ctaLabel"),
    href: "/collections/scule-cu-acumulator",
    variant: "image",
    imageUrl: "/images/home/hero-combo-kit.webp",
  },
  {
    eyebrow: t("promos.wood.eyebrow"),
    title: t("promos.wood.title"),
    ctaLabel: t("promos.wood.ctaLabel"),
    href: "/categories/scule-pentru-lemn",
    variant: "image",
    imageUrl: "/images/home/story-woodworking.webp",
  },
  {
    eyebrow: t("promos.metal.eyebrow"),
    title: t("promos.metal.title"),
    ctaLabel: t("promos.metal.ctaLabel"),
    href: "/categories/scule-pentru-metal",
    variant: "image",
    imageUrl: "/images/home/story-auto-service.webp",
  },
];

export function getHomeBlocks(t: TranslateHomepage): HomepageBlock[] {
  return [
    { id: "hero", type: "promo-mosaic", promos: getHomepagePromos(t) },
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
      eyebrow: t("bestsellers.eyebrow"),
      title: t("bestsellers.title"),
      viewAllHref: "/collections/scule-cu-acumulator",
      viewAllLabel: t("bestsellers.viewAllLabel"),
    },
    { id: "trust", type: "trust-band" },
    { id: "stories", type: "shop-stories" },
    { id: "newsletter", type: "newsletter-band" },
  ];
}
