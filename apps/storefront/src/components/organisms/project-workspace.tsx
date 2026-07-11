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
  { icon: CircleDollarSign, text: "Economisești 48 MDL cu pachetul de pânze." },
  { icon: Truck, text: "Comandă până joi 14:00 pentru livrare vineri." },
];

const TABS = ["Livrare", "Garanție", "Finanțare", "Cronologie", "Checkout"];

export function ProjectWorkspace() {
  return (
    <section className="bg-surface-subtle px-4 py-12 small:px-8 medium:px-12">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Spațiu de proiect
            </span>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground small:text-3xl">
              Proiectul tău: Construiește un deck în curte
            </h2>
          </div>
          <span className="clip-corner-cut-sm bg-success/15 px-4 py-2 text-sm font-bold text-success">
            Pregătire 82%
          </span>
        </div>

        <div className="grid gap-4 medium:grid-cols-[260px_1fr_300px]">
          <Panel title="Produse">
            <ul className="space-y-2.5">
              {PRODUCTS.map((product) => (
                <li
                  key={product.label}
                  className="flex items-center gap-2.5 text-sm"
                >
                  {product.owned ? (
                    <Check className="size-4 shrink-0 text-success" />
                  ) : (
                    <Square className="size-4 shrink-0 text-warning" />
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
            <div className="flex h-full flex-col justify-center gap-3">
              {CONNECTIONS.map((connection) => (
                <div
                  key={`${connection.from}-${connection.to}`}
                  className="flex items-center gap-3 text-sm"
                >
                  <span className="clip-corner-cut-xs flex-1 bg-background px-3 py-2 text-right font-medium text-foreground ring-1 ring-border">
                    {connection.from}
                  </span>
                  <span
                    className={cn(
                      "h-0.5 w-8 shrink-0",
                      connection.status === "ok" ? "bg-success" : "bg-warning"
                    )}
                  />
                  <span className="clip-corner-cut-xs flex-1 bg-background px-3 py-2 font-medium text-foreground ring-1 ring-border">
                    {connection.to}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Asistent AI">
            <ul className="space-y-3">
              {INSIGHTS.map((insight) => (
                <li key={insight.text} className="flex items-start gap-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <insight.icon className="size-4" />
                  </span>
                  <span className="text-sm text-foreground">
                    {insight.text}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2">
              <Sparkles className="size-4 text-primary" />
              <span className="flex-1 text-xs text-muted-foreground">
                Întreabă orice…
              </span>
              <span className="grid size-6 place-items-center rounded-full bg-foreground text-background">
                <ArrowUp className="size-3.5" />
              </span>
            </div>
          </Panel>
        </div>

        <div className="clip-corner-cut-md mt-4 flex flex-wrap items-center gap-2 bg-card p-3 ring-1 ring-border">
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
                <span className="px-3 py-1.5 text-sm font-medium text-muted-foreground">
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
    <div className="clip-corner-cut-lg flex flex-col bg-card p-5 ring-1 ring-border">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}
