"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight, Lock, Package } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { Button } from "@/components/atoms/button";
import { Separator } from "@/components/atoms/separator";
import CartTotals from "@modules/common/components/cart-totals";
import DiscountCode from "@modules/checkout/components/discount-code";

type Props = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[];
  };
};

export default function Summary({ cart }: Props) {
  return (
    <aside className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:p-8 flex flex-col gap-6 p-6 ring-1">
      <div className="space-y-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          Finalizare rapidă
        </span>
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight">
          Sumar comandă
        </h2>
      </div>
      <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-4 ring-1">
        <DiscountCode cart={cart} />
      </div>
      <Separator className="hidden" />
      <div className="clip-corner-cut-md bg-background/80 ring-border/70 p-4 ring-1">
        <CartTotals totals={cart} />
      </div>
      <Button
        asChild
        size="xl"
        className="clip-corner-cut-sm mt-1 w-full rounded-none"
        data-testid="checkout-button"
      >
        <Link href="/checkout">
          Finalizează comanda
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <ul className="clip-corner-cut-md bg-surface-subtle/60 text-muted-foreground ring-border/70 flex flex-col gap-4 p-4 text-xs ring-1">
        <li className="flex items-center gap-2">
          <Lock className="text-success size-3.5" />
          Comanda este confirmată de echipa DYLLU înainte de procesare
        </li>
        <li className="flex items-center gap-2">
          <Package className="text-primary size-3.5" />
          Livrare în toată Moldova · 24–48h în Chișinău
        </li>
      </ul>
    </aside>
  );
}
