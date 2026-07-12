import {
  BadgeCheck,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@lib/utils";

type TrustItem = {
  icon: LucideIcon;
  title: string;
  detail: string;
};

const TRUST_ITEMS: TrustItem[] = [
  {
    icon: Truck,
    title: "Livrare rapidă",
    detail: "Gratuită peste 1.000 MDL în Chișinău",
  },
  {
    icon: ShieldCheck,
    title: "Plată confirmată",
    detail: "Metoda se validează la procesarea comenzii",
  },
  {
    icon: BadgeCheck,
    title: "Garanție DYLLU",
    detail: "24 luni pentru produsele eligibile",
  },
  {
    icon: RotateCcw,
    title: "Retur simplu",
    detail: "14 zile pentru produsele nefolosite",
  },
];

export function PurchaseTrustGrid({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 small:grid-cols-2", className)}>
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.title}
          className="clip-corner-cut-sm flex items-start gap-3 bg-surface-subtle/70 p-3.5"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <item.icon className="size-4" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold leading-none text-foreground">
              {item.title}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {item.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
