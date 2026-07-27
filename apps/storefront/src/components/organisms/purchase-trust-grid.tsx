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
  layout = "grid",
}: {
  className?: string;
  layout?: "grid" | "band";
}) {
  return (
    <div
      className={cn(
        layout === "band"
          ? "no-scrollbar small:gap-0 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0"
          : "small:grid-cols-1 large:grid-cols-2 grid gap-3 md:grid-cols-2",
        className
      )}
    >
      {TRUST_ITEMS.map((item) => (
        <div
          key={item.title}
          className={cn(
            "flex min-w-0 items-center gap-3",
            layout === "band"
              ? "border-border/70 bg-card small:rounded-none small:border-y-0 small:border-l-0 small:border-r small:bg-transparent small:px-5 small:py-2 small:first:pl-0 small:last:border-r-0 small:last:pr-0 min-w-[260px] snap-start rounded-md border px-4 py-4 md:min-w-0 md:px-5"
              : "clip-corner-cut-sm bg-surface-subtle/70 p-3"
          )}
        >
          <span
            className={cn(
              "grid shrink-0 place-items-center rounded-full",
              layout === "band"
                ? "bg-primary text-primary-foreground shadow-brand-glow-sm ring-primary small:size-16 size-12 ring-1 md:size-14"
                : "bg-primary/10 text-primary/80 size-10"
            )}
          >
            <item.icon
              aria-hidden="true"
              className={cn(
                layout === "band"
                  ? "small:size-10 size-7 stroke-[2.25] md:size-8"
                  : "size-5"
              )}
            />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-foreground text-sm leading-none font-semibold">
              {item.title}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {item.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
