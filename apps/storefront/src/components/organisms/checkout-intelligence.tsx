"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
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
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[560px] p-6 ring-1">
      <div className="text-primary mb-6 flex items-center gap-2">
        <CloudSun className="size-4" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase">
          Povestea comenzii tale
        </span>
      </div>
      <ol className="before:bg-border relative space-y-6 before:absolute before:top-2 before:left-[15px] before:h-[calc(100%-1rem)] before:w-px">
        {steps.map((step) => (
          <li key={step.day} className="relative flex gap-4">
            <span
              className={cn(
                "ring-card relative z-1 grid size-8 shrink-0 place-items-center rounded-full ring-4",
                step.highlight
                  ? "bg-success text-background"
                  : "bg-muted text-foreground"
              )}
            >
              <step.icon className="size-4" />
            </span>
            <div className="pt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-foreground text-sm font-bold">
                  {step.day}
                </span>
                {step.time && (
                  <span className="text-muted-foreground text-xs">
                    {step.time}
                  </span>
                )}
              </div>
              <p
                className={cn(
                  "text-sm",
                  step.highlight
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </p>
              {step.detail && (
                <p className="text-muted-foreground mt-0.5 text-xs">
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
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[560px] p-6 ring-1">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-foreground text-lg font-bold">
          Din ce se compune prețul
        </h3>
        <span className="font-display text-foreground text-xl font-bold">
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

      <ul className="mt-6 space-y-2.5">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-foreground flex items-center gap-2">
              <span className={cn("size-3 rounded-sm", segment.color)} />
              {segment.label}
            </span>
            <span className="text-muted-foreground font-medium">
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
    <div className="clip-corner-cut-lg bg-card ring-border small:p-8 mx-auto max-w-[480px] p-6 ring-1">
      <div className="flex items-center gap-4">
        <span className="bg-success/15 font-display text-success grid size-16 shrink-0 place-items-center rounded-full text-xl font-extrabold">
          {score}%
        </span>
        <div>
          <h3 className="font-display text-foreground text-lg font-bold">
            Comandă verificată
          </h3>
          <p className="text-muted-foreground text-sm">
            Totul este pregătit pentru plasare
          </p>
        </div>
      </div>

      <ul className="small:grid-cols-2 mt-6 grid gap-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <Check className="text-success size-4 shrink-0" />
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
    <div className="clip-corner-cut-lg bg-foreground text-background small:p-12 relative mx-auto max-w-[640px] overflow-hidden p-8 text-center">
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
        <span className="text-background/70 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase">
          <Sparkles className="size-4" />
          Ești gata
        </span>
        <h3 className="font-display small:text-3xl mt-4 text-2xl font-extrabold">
          Tot ce ai nevoie este inclus
        </h3>
        <div className="mt-6 flex items-center justify-center gap-8">
          <div>
            <p className="font-display text-4xl font-extrabold">
              {successPercent}%
            </p>
            <p className="text-background/60 text-xs tracking-[0.16em] uppercase">
              Șanse de reușită
            </p>
          </div>
          <div className="bg-background/20 h-10 w-px" />
          <div>
            <p className="font-display text-lg font-bold">{completion}</p>
            <p className="text-background/60 text-xs tracking-[0.16em] uppercase">
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
