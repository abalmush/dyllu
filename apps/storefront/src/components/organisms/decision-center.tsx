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
    <div className="clip-corner-cut-lg clip-shadow-md mx-auto max-w-[720px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
          Centru de decizie
        </span>
      </div>
      <h3 className="mt-2 font-display text-xl font-bold text-foreground small:text-2xl">
        {project}
      </h3>

      <ul className="mt-5 grid gap-2 small:grid-cols-2">
        {checks.map((check) => (
          <li key={check} className="flex items-center gap-2 text-sm">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success text-background">
              <Check className="size-3.5" />
            </span>
            <span className="text-foreground">{check}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Total
        </span>
        <span className="font-display text-2xl font-bold text-foreground">
          {total}
        </span>
      </div>

      <div className="mt-6">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-warning-foreground">
          Potențiale probleme
        </span>
        <ul className="mt-3 space-y-2">
          {problems.map((problem) => (
            <li
              key={problem.text}
              className={cn(
                "clip-corner-cut-sm flex items-start gap-2.5 border-l-2 p-3 text-sm",
                problem.severity === "critical"
                  ? "border-destructive bg-destructive/5 text-foreground"
                  : "border-warning bg-warning/10 text-foreground"
              )}
            >
              {problem.severity === "critical" ? (
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
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
    <div className="clip-corner-cut-lg mx-auto max-w-[560px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Pregătire proiect
        </span>
        <span className="font-display text-3xl font-extrabold text-foreground">
          {percent}%
        </span>
      </div>

      <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-success transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-6">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Lipsește
        </span>
        <ul className="mt-3 space-y-2">
          {missing.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="flex items-center gap-2 text-foreground">
                <span className="size-1.5 rounded-full bg-warning" />
                {item}
              </span>
              <button
                type="button"
                className="clip-corner-cut-xs inline-flex items-center gap-1 bg-foreground px-2.5 py-1 text-xs font-semibold text-background transition-colors hover:bg-foreground/90"
              >
                <Plus className="size-3" />
                Adaugă
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm text-muted-foreground">Șanse de reușită</span>
        <span className="clip-corner-cut-xs bg-success/15 px-3 py-1 text-sm font-bold text-success">
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
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" />
      </span>
      <div className="flex-1">
        <p className="font-display text-lg font-bold text-foreground">
          {message}
        </p>
        {detail && (
          <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
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
