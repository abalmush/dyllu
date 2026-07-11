import * as React from "react";
import { Check, Minus, Star } from "lucide-react";

import { cn } from "@lib/utils";

export function ConfidenceMeter({
  name,
  rating,
  confidence,
  verdict,
  reasons,
}: {
  name: string;
  rating: number;
  confidence: number;
  verdict: string;
  reasons: string[];
}) {
  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[520px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            {name}
          </h3>
          <span className="mt-1 inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={cn(
                  "size-4",
                  i < Math.round(rating)
                    ? "fill-warning text-warning"
                    : "fill-muted text-muted"
                )}
              />
            ))}
          </span>
        </div>
        <div className="text-right">
          <span className="font-display text-3xl font-extrabold text-success">
            {confidence}%
          </span>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-success">
            {verdict}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          De ce o recomandăm
        </span>
        <ul className="mt-3 space-y-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-success" />
              <span className="text-foreground">{reason}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export type CompareRow = {
  label: string;
  current: string;
  alternative: string;
  better?: "current" | "alternative" | "same";
};

export function CompareInline({
  currentName,
  alternativeName,
  rows,
}: {
  currentName: string;
  alternativeName: string;
  rows: CompareRow[];
}) {
  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[640px] overflow-hidden bg-card ring-1 ring-border">
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b border-border bg-surface-subtle p-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        <span>Comparație</span>
        <span className="text-foreground">{currentName}</span>
        <span>{alternativeName}</span>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-4 py-3 text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "font-medium",
                row.better === "current"
                  ? "font-bold text-success"
                  : "text-foreground"
              )}
            >
              {row.current}
            </span>
            <span
              className={cn(
                row.better === "alternative"
                  ? "font-bold text-success"
                  : "text-foreground"
              )}
            >
              {row.alternative}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type CompatStatus = "ok" | "warn" | "bad";
export type CompatNode = { id: string; label: string; status: CompatStatus };

const STATUS_STYLE: Record<CompatStatus, { dot: string; ring: string }> = {
  ok: { dot: "bg-success", ring: "ring-success/40" },
  warn: { dot: "bg-warning", ring: "ring-warning/50" },
  bad: { dot: "bg-destructive", ring: "ring-destructive/50" },
};

export function CompatibilityGraph({
  root,
  nodes,
}: {
  root: string;
  nodes: CompatNode[];
}) {
  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[720px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex flex-col items-center">
        <span className="clip-corner-cut-sm bg-foreground px-4 py-2 text-sm font-bold text-background">
          {root}
        </span>
        <span aria-hidden className="h-6 w-px bg-border" />
        <span aria-hidden className="h-px w-2/3 bg-border" />

        <div className="mt-6 grid w-full grid-cols-2 gap-3 small:grid-cols-4">
          {nodes.map((node) => {
            const style = STATUS_STYLE[node.status];
            return (
              <div
                key={node.id}
                className={cn(
                  "clip-corner-cut-sm flex flex-col items-center gap-2 bg-background p-3 text-center ring-1",
                  style.ring
                )}
              >
                <span className={cn("size-2.5 rounded-full", style.dot)} />
                <span className="text-sm font-medium text-foreground">
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-success" /> Compatibil
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-warning" /> Funcționează,
          dar nu ideal
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-destructive" /> Incompatibil
        </span>
      </div>
    </div>
  );
}
