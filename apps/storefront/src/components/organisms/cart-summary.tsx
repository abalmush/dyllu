"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
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
    <div className="clip-corner-cut-lg clip-shadow-md bg-card ring-border flex flex-col gap-6 p-6 ring-1">
      <h2 className="font-display text-foreground text-lg font-bold">
        Sumar comandă
      </h2>

      <div className="flex gap-2">
        <label htmlFor={promoId} className="sr-only">
          Cod promoțional
        </label>
        <span className="clip-corner-cut-xs border-border bg-background flex flex-1 items-center gap-2 border px-4">
          <Tag aria-hidden="true" className="text-muted-foreground size-5" />
          <input
            id={promoId}
            name="promo_code"
            autoComplete="off"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
            placeholder="Exemplu: DYLLU10…"
            className="text-foreground w-full bg-transparent py-4 text-base focus-visible:outline-hidden"
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

      <dl className="border-border space-y-2.5 border-t pt-6">
        {lines.map((line) => (
          <div key={line.label} className="flex justify-between text-sm">
            <dt className="text-muted-foreground">{line.label}</dt>
            <dd
              className={
                line.muted ? "text-success" : "text-foreground font-medium"
              }
            >
              {line.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="border-border flex items-baseline justify-between border-t pt-6">
        <span className="text-muted-foreground text-sm font-semibold tracking-[0.14em] uppercase">
          Total
        </span>
        <span className="font-display text-foreground text-2xl font-bold">
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
        <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-center text-xs">
          <ShieldCheck aria-hidden="true" className="text-success size-4" />
          {note}
        </p>
      )}
    </div>
  );
}
