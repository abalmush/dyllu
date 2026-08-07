import * as React from "react";
import { Check, Minus, Star } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@lib/utils";

export async function ConfidenceMeter({
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
  const t = await getTranslations("ProductConfidence");

  return (
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[520px] p-6 ring-1">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-foreground text-lg font-bold">
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
          <span className="font-display text-success text-3xl font-extrabold">
            {confidence}%
          </span>
          <p className="text-success text-xs font-semibold tracking-[0.14em] uppercase">
            {verdict}
          </p>
        </div>
      </div>

      <div className="border-border mt-6 border-t pt-4">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          {t("whyWeRecommend")}
        </span>
        <ul className="mt-4 space-y-2">
          {reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-sm">
              <Check className="text-success mt-0.5 size-4 shrink-0" />
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

export async function CompareInline({
  currentName,
  alternativeName,
  rows,
}: {
  currentName: string;
  alternativeName: string;
  rows: CompareRow[];
}) {
  const t = await getTranslations("ProductConfidence");

  return (
    <div className="clip-corner-cut-lg bg-card ring-border mx-auto max-w-[640px] overflow-hidden ring-1">
      <div className="border-border bg-surface-subtle text-muted-foreground grid grid-cols-[1.2fr_1fr_1fr] gap-2 border-b p-4 text-xs font-semibold tracking-[0.12em] uppercase">
        <span>{t("comparisonLabel")}</span>
        <span className="text-foreground">{currentName}</span>
        <span>{alternativeName}</span>
      </div>
      <div className="divide-border divide-y">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 px-4 py-4 text-sm"
          >
            <span className="text-muted-foreground">{row.label}</span>
            <span
              className={cn(
                "font-medium",
                row.better === "current"
                  ? "text-success font-bold"
                  : "text-foreground"
              )}
            >
              {row.current}
            </span>
            <span
              className={cn(
                row.better === "alternative"
                  ? "text-success font-bold"
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

export async function CompatibilityGraph({
  root,
  nodes,
}: {
  root: string;
  nodes: CompatNode[];
}) {
  const t = await getTranslations("ProductConfidence");

  return (
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[720px] p-6 ring-1">
      <div className="flex flex-col items-center">
        <span className="clip-corner-cut-sm bg-foreground text-background px-4 py-2 text-sm font-bold">
          {root}
        </span>
        <span aria-hidden className="bg-border h-6 w-px" />
        <span aria-hidden className="bg-border h-px w-2/3" />

        <div className="small:grid-cols-4 mt-6 grid w-full grid-cols-2 gap-4">
          {nodes.map((node) => {
            const style = STATUS_STYLE[node.status];
            return (
              <div
                key={node.id}
                className={cn(
                  "clip-corner-cut-sm bg-background flex flex-col items-center gap-2 p-4 text-center ring-1",
                  style.ring
                )}
              >
                <span className={cn("size-2.5 rounded-full", style.dot)} />
                <span className="text-foreground text-sm font-medium">
                  {node.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-border text-muted-foreground mt-6 flex flex-wrap justify-center gap-4 border-t pt-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="bg-success size-2.5 rounded-full" />{" "}
          {t("legendCompatible")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-warning size-2.5 rounded-full" />{" "}
          {t("legendWorksButNotIdeal")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="bg-destructive size-2.5 rounded-full" />{" "}
          {t("legendIncompatible")}
        </span>
      </div>
    </div>
  );
}
