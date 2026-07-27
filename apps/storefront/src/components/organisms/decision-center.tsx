"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  Plus,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";
import { CutBorder } from "@/components/atoms/cut-border";

export type DecisionProblem = {
  text: string;
  severity: "warning" | "critical";
};

export function DecisionCenterCart({
  project,
  checks,
  total,
  problems,
}: {
  project: string;
  checks: string[];
  total: string;
  problems: DecisionProblem[];
}) {
  return (
    <div className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:p-8 mx-auto max-w-[720px] p-6 ring-1">
      <div className="text-primary flex items-center gap-2">
        <Sparkles className="size-4" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase">
          Centru de decizie
        </span>
      </div>
      <h3 className="font-display text-foreground small:text-2xl mt-2 text-xl font-bold">
        {project}
      </h3>

      <ul className="small:grid-cols-2 mt-6 grid gap-2">
        {checks.map((check) => (
          <li key={check} className="flex items-center gap-2 text-sm">
            <span className="bg-success text-background grid size-5 shrink-0 place-items-center rounded-full">
              <Check className="size-3.5" />
            </span>
            <span className="text-foreground">{check}</span>
          </li>
        ))}
      </ul>

      <div className="border-border mt-6 flex items-baseline justify-between border-t pt-4">
        <span className="text-muted-foreground text-sm font-semibold tracking-[0.14em] uppercase">
          Total
        </span>
        <span className="font-display text-foreground text-2xl font-bold">
          {total}
        </span>
      </div>

      <div className="mt-6">
        <span className="text-warning-foreground text-xs font-semibold tracking-[0.18em] uppercase">
          Potențiale probleme
        </span>
        <ul className="mt-4 space-y-2">
          {problems.map((problem) => (
            <li
              key={problem.text}
              className={cn(
                "clip-corner-cut-sm flex items-start gap-2.5 border-l-2 p-4 text-sm",
                problem.severity === "critical"
                  ? "border-destructive bg-destructive/5 text-foreground"
                  : "border-warning bg-warning/10 text-foreground"
              )}
            >
              {problem.severity === "critical" ? (
                <TriangleAlert className="text-destructive mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertTriangle className="text-warning mt-0.5 size-4 shrink-0" />
              )}
              {problem.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ProjectReadiness({
  percent,
  missing,
  successLabel,
}: {
  percent: number;
  missing: string[];
  successLabel: string;
}) {
  return (
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[560px] p-6 ring-1">
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground text-sm font-semibold tracking-[0.18em] uppercase">
          Pregătire proiect
        </span>
        <span className="font-display text-foreground text-3xl font-extrabold">
          {percent}%
        </span>
      </div>

      <div className="bg-muted mt-4 h-3 overflow-hidden rounded-full">
        <div
          className="from-primary to-success h-full rounded-full bg-linear-to-r transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-6">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          Lipsește
        </span>
        <ul className="mt-4 space-y-2">
          {missing.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between gap-4 text-sm"
            >
              <span className="text-foreground flex items-center gap-2">
                <span className="bg-warning size-1.5 rounded-full" />
                {item}
              </span>
              <button
                type="button"
                className="clip-corner-cut-xs bg-foreground text-background hover:bg-foreground/90 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold transition-colors"
              >
                <Plus className="size-3" />
                Adaugă
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-border mt-6 flex items-center justify-between border-t pt-4">
        <span className="text-muted-foreground text-sm">Șanse de reușită</span>
        <span className="clip-corner-cut-xs bg-success/15 text-success px-4 py-1 text-sm font-bold">
          {successLabel}
        </span>
      </div>
    </div>
  );
}

export function RiskAlert({
  message,
  detail,
  fixLabel,
}: {
  message: string;
  detail?: string;
  fixLabel: string;
}) {
  return (
    <CutBorder
      clip="lg"
      width={2}
      borderClassName="bg-destructive"
      fillClassName="bg-destructive-subtle"
      className="mx-auto max-w-[720px]"
      innerClassName="flex flex-col gap-4 p-6 small:flex-row small:items-center"
    >
      <span className="bg-destructive/10 text-destructive grid size-12 shrink-0 place-items-center rounded-full">
        <TriangleAlert className="size-6" />
      </span>
      <div className="flex-1">
        <p className="font-display text-foreground text-lg font-bold">
          {message}
        </p>
        {detail && (
          <p className="text-muted-foreground mt-1 text-sm">{detail}</p>
        )}
      </div>
      <Button
        type="button"
        className="clip-corner-cut-sm shrink-0 rounded-none"
      >
        <Plus className="size-4" />
        {fixLabel}
      </Button>
    </CutBorder>
  );
}
