import * as React from "react";
import {
  ArrowUp,
  Check,
  CircleDollarSign,
  Sparkles,
  Square,
  Truck,
} from "lucide-react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

const PRODUCTS = [
  { label: "Fierăstrău circular 20V", owned: true },
  { label: "Acumulator 5.0Ah ×2", owned: true },
  { label: "Încărcător rapid", owned: true },
  { label: "Pânze de rezervă", owned: true },
  { label: "Cleme de strângere", owned: false },
  { label: "Mască de praf", owned: false },
];

const CONNECTIONS = [
  { from: "Fierăstrău", to: "Acumulator", status: "ok" },
  { from: "Acumulator", to: "Încărcător", status: "ok" },
  { from: "Fierăstrău", to: "Pânză 190mm", status: "ok" },
  { from: "Fierăstrău", to: "Ghidaj", status: "warn" },
];

const INSIGHTS = [
  { icon: Square, text: "Lipsesc clemele — recomandate pentru tăieri drepte." },
  { icon: CircleDollarSign, text: "Economisești 48 MDL cu setul de pânze." },
  { icon: Truck, text: "Comandă până joi 14:00 pentru livrare vineri." },
];

const TABS = [
  "Livrare",
  "Garanție",
  "Finanțare",
  "Cronologie",
  "Finalizare comandă",
];

export function ProjectWorkspace() {
  return (
    <section className="bg-surface-subtle small:px-8 medium:px-12 px-4 py-12">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-primary text-xs font-semibold tracking-[0.2em] uppercase">
              Spațiu de proiect
            </span>
            <h2 className="font-display text-foreground small:text-3xl mt-1 text-2xl font-extrabold tracking-tight">
              Proiectul tău: Construiește o terasă în curte
            </h2>
          </div>
          <span className="clip-corner-cut-sm bg-success/15 text-success px-4 py-2 text-sm font-bold">
            Pregătire 82%
          </span>
        </div>

        <div className="medium:grid-cols-[260px_1fr_300px] grid gap-4">
          <Panel title="Produse">
            <ul className="space-y-2.5">
              {PRODUCTS.map((product) => (
                <li
                  key={product.label}
                  className="flex items-center gap-2.5 text-sm"
                >
                  {product.owned ? (
                    <Check className="text-success size-4 shrink-0" />
                  ) : (
                    <Square className="text-warning size-4 shrink-0" />
                  )}
                  <span
                    className={
                      product.owned
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }
                  >
                    {product.label}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Spațiu vizual · compatibilitate">
            <div className="flex h-full flex-col justify-center gap-4">
              {CONNECTIONS.map((connection) => (
                <div
                  key={`${connection.from}-${connection.to}`}
                  className="flex items-center gap-4 text-sm"
                >
                  <span className="clip-corner-cut-xs bg-background text-foreground ring-border flex-1 px-4 py-2 text-right font-medium ring-1">
                    {connection.from}
                  </span>
                  <span
                    className={cn(
                      "h-0.5 w-8 shrink-0",
                      connection.status === "ok" ? "bg-success" : "bg-warning"
                    )}
                  />
                  <span className="clip-corner-cut-xs bg-background text-foreground ring-border flex-1 px-4 py-2 font-medium ring-1">
                    {connection.to}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Asistent AI">
            <ul className="space-y-4">
              {INSIGHTS.map((insight) => (
                <li key={insight.text} className="flex items-start gap-2.5">
                  <span className="bg-primary/10 text-primary grid size-7 shrink-0 place-items-center rounded-full">
                    <insight.icon className="size-4" />
                  </span>
                  <span className="text-foreground text-sm">
                    {insight.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-border bg-background mt-4 flex items-center gap-2 rounded-full border px-4 py-2">
              <Sparkles className="text-primary size-4" />
              <span className="text-muted-foreground flex-1 text-xs">
                Întreabă orice…
              </span>
              <span className="bg-foreground text-background grid size-6 place-items-center rounded-full">
                <ArrowUp className="size-3.5" />
              </span>
            </div>
          </Panel>
        </div>

        <div className="clip-corner-cut-md bg-card ring-border mt-4 flex flex-wrap items-center gap-2 p-4 ring-1">
          {TABS.map((tab, i) => (
            <React.Fragment key={tab}>
              {i === TABS.length - 1 ? (
                <Button
                  type="button"
                  className="clip-corner-cut-sm ml-auto rounded-none"
                >
                  {tab}
                </Button>
              ) : (
                <span className="text-muted-foreground px-4 py-1.5 text-sm font-medium">
                  {tab}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="clip-corner-cut-lg bg-card ring-border flex flex-col p-6 ring-1">
      <h3 className="text-muted-foreground mb-4 text-xs font-semibold tracking-[0.16em] uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}
