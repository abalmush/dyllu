"use client";

import * as React from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { useFormatter } from "next-intl";

export function BudgetSlider({
  minBudget,
  maxBudget,
  currency = "MDL",
}: {
  minBudget: number;
  maxBudget: number;
  currency?: string;
}) {
  const [value, setValue] = React.useState(50);

  const budget = Math.round(
    minBudget + ((maxBudget - minBudget) * value) / 100
  );
  const performance = Math.round(80 + (value / 100) * 40);
  const format = useFormatter();

  return (
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[560px] p-6 ring-1">
      <div className="text-brand-800 flex items-center gap-2">
        <Sparkles aria-hidden="true" className="size-5" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase">
          Optimizare buget
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-display text-foreground text-4xl font-extrabold">
            {format.number(budget)} {currency}
          </p>
          <p className="text-muted-foreground text-sm">Buget curent</p>
        </div>
        <div className="text-right">
          <p className="font-display text-success flex items-center gap-1 text-2xl font-bold">
            <TrendingUp aria-hidden="true" className="size-5" />
            {performance}%
          </p>
          <p className="text-muted-foreground text-sm">Performanță</p>
        </div>
      </div>

      <input
        type="range"
        name="budget"
        min={0}
        max={100}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Ajustează bugetul"
        className="accent-primary mt-6 w-full"
      />
      <div className="text-muted-foreground mt-1 flex justify-between text-xs">
        <span>Economisește</span>
        <span>Performanță maximă</span>
      </div>

      <p className="border-border text-muted-foreground mt-6 border-t pt-4 text-sm">
        AI înlocuiește automat componentele (acumulator, încărcător, husă)
        păstrând compatibilitatea cu platforma ta.
      </p>
    </div>
  );
}
