import * as React from "react";

import { cn } from "@lib/utils";
import { Container } from "@/components/atoms/container";
import { BannerCard } from "@/components/molecules/banner-card";
import type { PromoCardData } from "@/lib/homepage/types";

export interface PromoMosaicProps {
  promos: PromoCardData[];
}

type Layout = {
  gridClass: string;
  dominantClass: string;
  supportingClass: string;
};

function getLayout(count: number): Layout | null {
  if (count < 1) return null;
  if (count === 1) {
    return {
      gridClass: "grid-cols-1",
      dominantClass: "min-h-[420px] medium:min-h-[560px]",
      supportingClass: "",
    };
  }
  if (count === 2) {
    return {
      gridClass: "grid-cols-1 medium:grid-cols-2",
      dominantClass: "min-h-[360px] medium:min-h-[520px]",
      supportingClass: "min-h-[300px] medium:min-h-[520px]",
    };
  }
  if (count === 3) {
    return {
      gridClass: "grid-cols-1 medium:grid-cols-3 medium:auto-rows-[260px]",
      dominantClass:
        "min-h-[400px] medium:col-span-2 medium:row-span-2 medium:min-h-0",
      supportingClass: "min-h-[260px] medium:min-h-0",
    };
  }
  return {
    gridClass: "grid-cols-1 medium:grid-cols-3 medium:auto-rows-[200px]",
    dominantClass:
      "min-h-[400px] medium:col-span-2 medium:row-span-3 medium:min-h-0",
    supportingClass: "min-h-[200px] medium:min-h-0",
  };
}

export function PromoMosaic({ promos }: PromoMosaicProps) {
  const visible = promos.slice(0, 4);
  const layout = getLayout(visible.length);
  if (!layout) return null;

  const [dominant, ...supporting] = visible;

  return (
    <section className="py-8 small:py-12">
      <Container>
        <div className={cn("grid gap-4 medium:gap-5", layout.gridClass)}>
          <BannerCard
            {...dominant}
            className={layout.dominantClass}
            headingLevel="h1"
          />
          {supporting.map((promo, i) => (
            <BannerCard
              key={`${promo.title}-${i}`}
              {...promo}
              className={layout.supportingClass}
              headingLevel="h2"
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
