"use client";

import * as React from "react";
import { Sparkles, TrendingUp } from "lucide-react";

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
  const fmt = new Intl.NumberFormat("ro-MD");

  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[560px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex items-center gap-2 text-brand-800">
        <Sparkles aria-hidden="true" className="size-5" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
          Optimizare buget
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-display text-4xl font-extrabold text-foreground">
            {fmt.format(budget)} {currency}
          </p>
          <p className="text-sm text-muted-foreground">Buget curent</p>
        </div>
        <div className="text-right">
          <p className="flex items-center gap-1 font-display text-2xl font-bold text-success">
            <TrendingUp aria-hidden="true" className="size-5" />
            {performance}%
          </p>
          <p className="text-sm text-muted-foreground">Performanță</p>
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
        className="mt-6 w-full accent-primary"
      />
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>Economisește</span>
        <span>Performanță maximă</span>
      </div>

      <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
        AI înlocuiește automat componentele (acumulator, încărcător, husă)
        păstrând compatibilitatea cu platforma ta.
      </p>
    </div>
  );
}
