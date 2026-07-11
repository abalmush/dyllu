"use client";

import Link from "next/link";
import { ArrowRight, Lock, Package } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { Button } from "@/components/atoms/button";
import { Separator } from "@/components/atoms/separator";
import { getNextCheckoutStep } from "@modules/checkout/lib/presentation";
import CartTotals from "@modules/common/components/cart-totals";
import DiscountCode from "@modules/checkout/components/discount-code";

type Props = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[];
  };
};

export default function Summary({ cart }: Props) {
  const step = getNextCheckoutStep(cart);

  return (
    <aside className="clip-corner-cut-lg clip-shadow-md flex flex-col gap-5 bg-card p-6 ring-1 ring-border small:p-7">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Finalizare rapidă
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Sumar comandă
        </h2>
      </div>
      <div className="clip-corner-cut-md bg-surface-subtle/60 p-4 ring-1 ring-border/70">
        <DiscountCode cart={cart} />
      </div>
      <Separator className="hidden" />
      <div className="clip-corner-cut-md bg-background/80 p-4 ring-1 ring-border/70">
        <CartTotals totals={cart} />
      </div>
      <Button
        asChild
        size="xl"
        className="clip-corner-cut-sm mt-1 w-full rounded-none"
        data-testid="checkout-button"
      >
        <Link href={`/checkout?step=${step}`}>
          Finalizează comanda
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <ul className="clip-corner-cut-md flex flex-col gap-3 bg-surface-subtle/60 p-4 text-xs text-muted-foreground ring-1 ring-border/70">
        <li className="flex items-center gap-2">
          <Lock className="size-3.5 text-success" />
          Comanda este confirmată de echipa DYLLU înainte de procesare
        </li>
        <li className="flex items-center gap-2">
          <Package className="size-3.5 text-primary" />
          Livrare în toată Moldova · 24–48h în Chișinău
        </li>
      </ul>
    </aside>
  );
}
