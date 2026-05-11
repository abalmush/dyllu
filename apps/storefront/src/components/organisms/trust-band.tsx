import * as React from "react";
import {
  CreditCard,
  Headphones,
  Repeat2,
  Truck,
} from "lucide-react";

import { Container } from "@/components/atoms/container";
import { FeatureStat } from "@/components/molecules/feature-stat";

const FEATURES = [
  {
    icon: <Truck className="size-5" />,
    title: "Livrare gratuită",
    description: "În Chișinău pentru comenzi peste 1.000 MDL.",
  },
  {
    icon: <Repeat2 className="size-5" />,
    title: "Returnare 30 de zile",
    description: "Schimbă produsul fără bătăi de cap.",
  },
  {
    icon: <CreditCard className="size-5" />,
    title: "Plată securizată",
    description: "Procesare prin MAIB, 3-D Secure activat.",
  },
  {
    icon: <Headphones className="size-5" />,
    title: "Suport profesional",
    description: "Consultanți tehnici L–V, 9:00–18:00.",
  },
];

export function TrustBand() {
  return (
    <section className="border-y border-border bg-surface-subtle/60 py-10">
      <Container>
        <div className="grid gap-3 small:grid-cols-2 medium:grid-cols-4">
          {FEATURES.map((f) => (
            <FeatureStat key={f.title} {...f} />
          ))}
        </div>
      </Container>
    </section>
  );
}
