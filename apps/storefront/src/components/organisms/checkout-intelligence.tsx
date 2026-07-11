"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  CloudSun,
  Hammer,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

export type TimelineStep = {
  day: string;
  time?: string;
  title: string;
  detail?: string;
  icon: LucideIcon;
  highlight?: boolean;
};

const DEFAULT_TIMELINE: TimelineStep[] = [
  { day: "Azi", title: "Comandă plasată", icon: Check },
  { day: "Mâine", title: "Expediată din depozit", icon: PackageCheck },
  { day: "Vineri", time: "08:40", title: "Livrată la ușă", icon: Truck },
  {
    day: "Sâmbătă",
    title: "Poți începe proiectul",
    detail: "Însorit · 22°C · timp estimat de montaj 4h",
    icon: Hammer,
    highlight: true,
  },
];

export function DeliveryTimeline({
  steps = DEFAULT_TIMELINE,
}: {
  steps?: TimelineStep[];
}) {
  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[560px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <CloudSun className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em]">
          Povestea comenzii tale
        </span>
      </div>
      <ol className="relative space-y-6 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
        {steps.map((step) => (
          <li key={step.day} className="relative flex gap-4">
            <span
              className={cn(
                "relative z-[1] grid size-8 shrink-0 place-items-center rounded-full ring-4 ring-card",
                step.highlight
                  ? "bg-success text-background"
                  : "bg-muted text-foreground"
              )}
            >
              <step.icon className="size-4" />
            </span>
            <div className="pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-foreground">
                  {step.day}
                </span>
                {step.time && (
                  <span className="text-xs text-muted-foreground">
                    {step.time}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-sm",
                  step.highlight
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              {step.detail && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {step.detail}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type CostSegment = {
  label: string;
  amount: string;
  percent: number;
  color: string;
};

export function CostBreakdown({
  segments,
  total,
}: {
  segments: CostSegment[];
  total: string;
}) {
  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[560px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-lg font-bold text-foreground">
          Din ce se compune prețul
        </h3>
        <span className="font-display text-xl font-bold text-foreground">
          {total}
        </span>
      </div>

      <div className="mt-4 flex h-4 overflow-hidden rounded-full">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={segment.color}
            style={{ width: `${segment.percent}%` }}
            title={`${segment.label} · ${segment.amount}`}
          />
        ))}
      </div>

      <ul className="mt-5 space-y-2.5">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2 text-foreground">
              <span className={cn("size-3 rounded-sm", segment.color)} />
              {segment.label}
            </span>
            <span className="font-medium text-muted-foreground">
              {segment.amount}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CheckoutHealthScore({
  score,
  items,
}: {
  score: number;
  items: string[];
}) {
  return (
    <div className="clip-corner-cut-lg mx-auto max-w-[480px] bg-card p-6 ring-1 ring-border small:p-8">
      <div className="flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-full bg-success/15 font-display text-xl font-extrabold text-success">
          {score}%
        </span>
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Comandă verificată
          </h3>
          <p className="text-sm text-muted-foreground">
            Totul este pregătit pentru plasare
          </p>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 small:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <Check className="size-4 shrink-0 text-success" />
            <span className="text-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmotionCta({
  successPercent,
  completion,
}: {
  successPercent: number;
  completion: string;
}) {
  return (
    <div className="clip-corner-cut-lg relative mx-auto max-w-[640px] overflow-hidden bg-foreground p-8 text-center text-background small:p-12">
      <div
        aria-hidden
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-background/70">
          <Sparkles className="size-4" />
          Ești gata
        </span>
        <h3 className="mt-3 font-display text-2xl font-extrabold small:text-3xl">
          Tot ce ai nevoie este inclus
        </h3>
        <div className="mt-6 flex items-center justify-center gap-8">
          <div>
            <p className="font-display text-4xl font-extrabold">
              {successPercent}%
            </p>
            <p className="text-xs uppercase tracking-[0.16em] text-background/60">
              Șanse de reușită
            </p>
          </div>
          <div className="h-10 w-px bg-background/20" />
          <div>
            <p className="font-display text-lg font-bold">{completion}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-background/60">
              Finalizare estimată
            </p>
          </div>
        </div>
        <Button
          asChild
          size="xl"
          variant="secondary"
          className="clip-corner-cut-sm mt-8 rounded-none"
        >
          <Link href="#">
            <ShieldCheck className="size-4" />
            Hai să construim
          </Link>
        </Button>
      </div>
    </div>
  );
}
