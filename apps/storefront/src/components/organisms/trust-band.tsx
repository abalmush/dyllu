import * as React from "react";
import { CreditCard, Headphones, Repeat2, Truck } from "lucide-react";

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
    title: "Retur în 14 zile",
    description: "Pentru produse neutilizate, complete și ambalate original.",
  },
  {
    icon: <CreditCard className="size-5" />,
    title: "Confirmare comandă",
    description: "Detaliile de plată se stabilesc la procesare.",
  },
  {
    icon: <Headphones className="size-5" />,
    title: "Suport profesional",
    description: "Consultanți tehnici L–V, 9:00–18:00.",
  },
];

export function TrustBand() {
  return (
    <section className="border-border bg-surface-subtle/60 border-y py-12">
      <Container>
        <div className="small:grid-cols-2 medium:grid-cols-4 grid gap-4">
          {FEATURES.map((f) => (
            <FeatureStat key={f.title} {...f} />
          ))}
        </div>
      </Container>
    </section>
  );
}
