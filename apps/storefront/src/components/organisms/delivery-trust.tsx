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
    <section className="bg-background small:py-16 py-12">
      <Container>
        <div className="small:grid-cols-2 medium:grid-cols-3 grid gap-4">
          {TRUST_ITEMS.map((item) => (
            <div
              key={item.title}
              className="clip-corner-cut-md bg-card ring-border flex items-start gap-4 p-4 ring-1"
            >
              <span className="clip-corner-cut-xs bg-primary/10 text-primary grid size-10 shrink-0 place-items-center">
                <item.icon className="size-5" />
              </span>
              <div>
                <p className="text-foreground text-sm font-semibold">
                  {item.title}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
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
