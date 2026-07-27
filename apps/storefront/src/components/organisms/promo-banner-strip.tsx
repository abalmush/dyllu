import * as React from "react";

import { Container } from "@/components/atoms/container";
import { BannerCard } from "@/components/molecules/banner-card";

export function PromoBannerStrip() {
  return (
    <section className="small:py-16 py-12">
      <Container>
        <div className="small:grid-cols-3 grid gap-4">
          <BannerCard
            eyebrow="Set pentru atelier"
            title="−15% la setul complet de bricolaj"
            description="Trusă cu 168 de scule, ideală pentru atelierul de acasă."
            ctaLabel="Vezi setul"
            href="/categories/scule-de-mana"
            variant="primary"
            className="small:col-span-2"
          />
          <BannerCard
            eyebrow="Nou în stoc"
            title="Burghie SDS+ Pro Series"
            description="Performanță extremă pe beton armat."
            ctaLabel="Vezi noutățile"
            href="/categories/accesorii-si-consumabile"
            variant="dark"
          />
          <BannerCard
            eyebrow="Sezon de vară"
            title="Inventar grădină gata de lucru"
            description="Foarfeci, săpăligi, accesorii — totul în stoc."
            ctaLabel="Pregătește grădina"
            href="/categories/gradina-si-agricultura"
            variant="dark"
          />
          <BannerCard
            eyebrow="Echipează echipa"
            title="EIP certificat la preț de volum"
            description="Prețuri speciale pentru companii și ateliere."
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
