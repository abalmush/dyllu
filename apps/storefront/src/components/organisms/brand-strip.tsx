import * as React from "react";

import { Container } from "@/components/atoms/container";

const BRANDS = [
  "Bosch",
  "Makita",
  "DeWalt",
  "Stanley",
  "Total",
  "Milwaukee",
  "Karcher",
  "Hilti",
  "Stihl",
  "Ryobi",
];

export function BrandStrip() {
  return (
    <section className="border-y border-border bg-background py-6">
      <Container>
        <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Mărci de încredere alese de profesioniști
        </p>
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 pr-12 text-2xl font-bold tracking-tight text-foreground/70">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <span
                key={`${b}-${i}`}
                className="whitespace-nowrap font-display tracking-tight"
              >
                {b}
              </span>
            ))}
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-background to-transparent"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-background to-transparent"
          />
        </div>
      </Container>
    </section>
  );
}
