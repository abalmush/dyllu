import * as React from "react";

import { Container } from "@/components/atoms/container";
import { BannerCard } from "@/components/molecules/banner-card";

export function PromoBannerStrip() {
  return (
    <section className="py-10 small:py-16">
      <Container>
        <div className="grid gap-4 small:grid-cols-3">
          <BannerCard
            eyebrow="Pachet pro"
            title="−15% la setul complet de bricolaj"
            description="Trusă cu 168 de scule, ideală pentru atelierul de acasă."
            ctaLabel="Cumpără pachetul"
            href="/categories/scule-manuale"
            variant="primary"
            className="small:col-span-2"
          />
          <BannerCard
            eyebrow="Nou în stoc"
            title="Burghie SDS+ Pro Series"
            description="Performanță extremă pe beton armat."
            ctaLabel="Vezi noutățile"
            href="/categories/burghie-beton"
            variant="dark"
          />
          <BannerCard
            eyebrow="Sezon de vară"
            title="Inventar grădină gata de lucru"
            description="Foarfeci, săpăligi, accesorii — totul în stoc."
            ctaLabel="Pregătește grădina"
            href="/categories/gradinarit"
            variant="dark"
          />
          <BannerCard
            eyebrow="Echipează echipa"
            title="EIP certificat la preț de volum"
            description="Discounturi pentru companii și ateliere."
            ctaLabel="Solicită ofertă"
            href="/contact"
            variant="primary"
            className="small:col-span-2"
          />
        </div>
      </Container>
    </section>
  );
}
