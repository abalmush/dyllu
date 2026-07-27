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
    <section className="border-border bg-background border-y py-6">
      <Container>
        <p className="text-2xs text-muted-foreground mb-4 text-center font-semibold tracking-[0.18em] uppercase">
          Mărci de încredere alese de profesioniști
        </p>
        <div className="relative overflow-hidden">
          <div className="animate-marquee text-foreground/70 flex w-max gap-12 pr-12 text-2xl font-bold tracking-tight">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <span
                key={`${b}-${i}`}
                className="font-display tracking-tight whitespace-nowrap"
              >
                {b}
              </span>
            ))}
          </div>
          <span
            aria-hidden
            className="from-background pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r to-transparent"
          />
          <span
            aria-hidden
            className="from-background pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l to-transparent"
          />
        </div>
      </Container>
    </section>
  );
}
