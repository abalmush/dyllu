"use client";

import Link from "next/link";
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

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) return "address";
  if (cart?.shipping_methods?.length === 0) return "delivery";
  return "payment";
}

export default function Summary({ cart }: Props) {
  const step = getCheckoutStep(cart);

  return (
    <aside className="rounded-2xl border border-border bg-card p-6 shadow-sm small:p-7">
      <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
        Sumar comandă
      </h2>
      <div className="mt-5">
        <DiscountCode cart={cart} />
      </div>
      <Separator className="my-5" />
      <CartTotals totals={cart} />
      <Button
        asChild
        size="xl"
        className="mt-6 w-full rounded-full"
        data-testid="checkout-button"
      >
        <Link href={`/checkout?step=${step}`}>
          Finalizează comanda
          <ArrowRight className="size-4" />
        </Link>
      </Button>
      <ul className="mt-5 flex flex-col gap-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-2">
          <Lock className="size-3.5 text-success" />
          Plată securizată MAIB · 3-D Secure
        </li>
        <li className="flex items-center gap-2">
          <Package className="size-3.5 text-primary" />
          Livrare în toată Moldova · 24–48h în Chișinău
        </li>
      </ul>
    </aside>
  );
}
