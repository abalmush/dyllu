"use client";

import * as React from "react";

import { cn } from "@lib/utils";
import { convertToLocale } from "@lib/util/money";

type Props = {
  totals: {
    total?: number | null;
    subtotal?: number | null;
    tax_total?: number | null;
    currency_code: string;
    item_subtotal?: number | null;
    shipping_subtotal?: number | null;
    discount_subtotal?: number | null;
  };
  className?: string;
};

function Row({
  label,
  value,
  testId,
  testValue,
  emphasis,
  highlight,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  testId?: string;
  testValue?: number;
  emphasis?: boolean;
  highlight?: "discount";
}) {
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span
        className={cn(
          emphasis
            ? "font-semibold tracking-tight text-foreground"
            : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          highlight === "discount" ? "text-success" : "text-foreground",
          emphasis && "font-display text-2xl font-bold tracking-tight"
        )}
        data-testid={testId}
        data-value={testValue}
      >
        {value}
      </span>
    </div>
  );
}

export default function CartTotals({ totals, className }: Props) {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
  } = totals;

  const fmt = (n: number) => convertToLocale({ amount: n, currency_code });

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <Row
        label="Subtotal"
        value={fmt(item_subtotal ?? 0)}
        testId="cart-subtotal"
        testValue={item_subtotal ?? 0}
      />
      <Row
        label="Livrare"
        value={
          (shipping_subtotal ?? 0) === 0
            ? "Gratuită"
            : fmt(shipping_subtotal ?? 0)
        }
        testId="cart-shipping"
        testValue={shipping_subtotal ?? 0}
      />
      {!!discount_subtotal && (
        <Row
          label="Reducere"
          value={`− ${fmt(discount_subtotal ?? 0)}`}
          testId="cart-discount"
          testValue={discount_subtotal ?? 0}
          highlight="discount"
        />
      )}
      <Row
        label="TVA"
        value={fmt(tax_total ?? 0)}
        testId="cart-taxes"
        testValue={tax_total ?? 0}
      />
      <div className="my-2 h-px w-full bg-border" />
      <Row
        label={
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Total
          </span>
        }
        value={fmt(total ?? 0)}
        emphasis
        testId="cart-total"
        testValue={total ?? 0}
      />
      <p className="mt-1 text-xs text-muted-foreground">
        Toate prețurile includ TVA. Costul de livrare se calculează la
        finalizare.
      </p>
    </div>
  );
}
