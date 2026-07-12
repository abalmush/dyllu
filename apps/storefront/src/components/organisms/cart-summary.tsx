"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Tag } from "lucide-react";

import { Button } from "@/components/atoms/button";

export type SummaryLine = { label: string; value: string; muted?: boolean };

type Props = {
  lines: SummaryLine[];
  total: string;
  note?: string;
  cta?: { label: string; href: string };
};

export function CartSummary({
  lines,
  total,
  note,
  cta = { label: "Finalizează comanda", href: "/checkout" },
}: Props) {
  const promoId = React.useId();
  const [promo, setPromo] = React.useState("");

  return (
    <div className="clip-corner-cut-lg clip-shadow-md flex flex-col gap-5 bg-card p-6 ring-1 ring-border">
      <h2 className="font-display text-lg font-bold text-foreground">
        Sumar comandă
      </h2>

      <div className="flex gap-2">
        <label htmlFor={promoId} className="sr-only">
          Cod promoțional
        </label>
        <span className="clip-corner-cut-xs flex flex-1 items-center gap-2 border border-border bg-background px-3">
          <Tag aria-hidden="true" className="size-5 text-muted-foreground" />
          <input
            id={promoId}
            name="promo_code"
            autoComplete="off"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Exemplu: DYLLU10…"
            className="w-full bg-transparent py-3 text-base text-foreground focus-visible:outline-none"
          />
        </span>
        <Button
          type="button"
          variant="outline"
          className="clip-corner-cut-sm rounded-none"
        >
          Aplică
        </Button>
      </div>

      <dl className="space-y-2.5 border-t border-border pt-5">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd
              className={
                line.muted ? "text-success" : "font-medium text-foreground"
              }
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-baseline justify-between border-t border-border pt-5">
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Total
        </span>
        <span className="font-display text-2xl font-bold text-foreground">
          {total}
        </span>
      </div>

      <Button
        asChild
        size="xl"
        className="clip-corner-cut-sm w-full rounded-none"
      >
        <Link href={cta.href}>{cta.label}</Link>
      </Button>

      {note && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="size-4 text-success" />
          {note}
        </p>
      )}
    </div>
  );
}
