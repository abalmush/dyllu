import * as React from "react";
import {
  BadgeCheck,
  Headset,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/atoms/container";

type TrustItem = { icon: LucideIcon; title: string; detail: string };

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: Truck,
    title: "Livrare rapidă",
    detail: "Gratuită peste 1.000 MDL în Chișinău · 24–48h",
  },
  {
    icon: ShieldCheck,
    title: "Plată confirmată la procesare",
    detail: "Echipa DYLLU validează metoda potrivită pentru comandă",
  },
  {
    icon: BadgeCheck,
    title: "Garanție 24 luni",
    detail: "Produse originale DYLLU cu factură",
  },
  {
    icon: RotateCcw,
    title: "Retur în 14 zile",
    detail: "Fără întrebări, dacă produsul e nefolosit",
  },
  {
    icon: Headset,
    title: "Suport tehnic",
    detail: "Consultanță pentru alegere, livrare și service",
  },
];

export function DeliveryTrust() {
  return (
    <section className="bg-background py-12 small:py-16">
      <Container>
        <div className="grid gap-4 small:grid-cols-2 medium:grid-cols-3">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="clip-corner-cut-md flex items-start gap-3 bg-card p-4 ring-1 ring-border"
            >
              <span className="clip-corner-cut-xs grid size-10 shrink-0 place-items-center bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
