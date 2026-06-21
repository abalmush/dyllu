import type { BannerCardProps } from "@/components/molecules/banner-card";

export type PromoCardData = Omit<BannerCardProps, "className" | "align">;

export type ProductRailSource =
  | { kind: "bestsellers"; limit?: number }
  | { kind: "collection"; collectionId: string };

export type HomepageBlock =
  | { id: string; type: "promo-mosaic"; promos: PromoCardData[] }
  | { id: string; type: "tool-families" }
  | {
      id: string;
      type: "product-rail";
      source: ProductRailSource;
      eyebrow?: string;
      title: string;
      viewAllHref?: string;
      viewAllLabel?: string;
    }
  | { id: string; type: "trust-band" }
  | { id: string; type: "anatomy-showcase" }
  | { id: string; type: "guides-grid" }
  | { id: string; type: "customer-projects" }
  | { id: string; type: "newsletter-band" };
