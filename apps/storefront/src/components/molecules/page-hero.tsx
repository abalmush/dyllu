import * as React from "react";
import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@lib/utils";

export type PageHeroSurface = "default" | "dark" | "lime";

type SurfaceTokens = {
  container: string;
  glow?: string;
  eyebrow: string;
  title: string;
  lede: string;
  cta: string;
  statTile: string;
  statLabel: string;
  statValue: string;
};

const SURFACE: Record<PageHeroSurface, SurfaceTokens> = {
  default: {
    container: "bg-brand-wash ring-1 ring-foreground/5 text-foreground",
    eyebrow: "bg-brand-500 text-foreground",
    title: "text-foreground",
    lede: "text-foreground/70",
    cta: "text-foreground hover:text-foreground/70",
    statTile: "bg-background ring-1 ring-foreground/5",
    statLabel: "text-foreground/60",
    statValue: "text-foreground",
  },
  dark: {
    container: "bg-foreground text-background",
    glow: "bg-brand-radial",
    eyebrow: "bg-brand-500 text-foreground",
    title: "text-background",
    lede: "text-background/70",
    cta: "text-brand-500 hover:text-brand-300",
    statTile: "bg-background/5 ring-1 ring-background/10",
    statLabel: "text-background/60",
    statValue: "text-background",
  },
  lime: {
    container: "bg-brand-gradient text-foreground shadow-brand-glow",
    eyebrow: "bg-foreground text-brand-500",
    title: "text-foreground",
    lede: "text-foreground/75",
    cta: "text-foreground hover:text-foreground/70",
    statTile: "bg-background/70 ring-1 ring-foreground/5",
    statLabel: "text-foreground/60",
    statValue: "text-foreground",
  },
};

export type PageHeroStatItem = {
  label: string;
  value: React.ReactNode;
  "data-testid"?: string;
};

type PageHeroProps = {
  surface?: PageHeroSurface;
  eyebrow?: {
    label: string;
    icon?: LucideIcon;
  };
  title: React.ReactNode;
  lede?: React.ReactNode;
  cta?: {
    href: string;
    label: string;
  };
  stats?: PageHeroStatItem[];
  className?: string;
  children?: React.ReactNode;
};

export function PageHero({
  surface = "default",
  eyebrow,
  title,
  lede,
  cta,
  stats,
  className,
  children,
}: PageHeroProps) {
  const tokens = SURFACE[surface];
  const EyebrowIcon = eyebrow?.icon;

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl p-8 md:p-12",
        tokens.container,
        className
      )}
    >
      {tokens.glow && (
        <div
          aria-hidden
          className={cn("pointer-events-none absolute inset-0", tokens.glow)}
        />
      )}
      <div className="relative">
        {eyebrow && (
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider",
              tokens.eyebrow
            )}
          >
            {EyebrowIcon && <EyebrowIcon className="size-3.5" />}
            {eyebrow.label}
          </div>
        )}

        <h1
          className={cn(
            "mt-5 font-display text-4xl font-bold leading-tight tracking-tight md:text-5xl",
            tokens.title
          )}
        >
          {title}
        </h1>

        {lede && (
          <p className={cn("mt-3 max-w-xl text-base", tokens.lede)}>{lede}</p>
        )}

        {stats && stats.length > 0 && (
          <dl className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={cn("rounded-xl p-4", tokens.statTile)}
                data-testid={stat["data-testid"]}
              >
                <dt
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    tokens.statLabel
                  )}
                >
                  {stat.label}
                </dt>
                <dd
                  className={cn(
                    "mt-1 font-display text-2xl font-bold tracking-tight",
                    tokens.statValue
                  )}
                >
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children && <div className="mt-6">{children}</div>}

        {cta && (
          <Link
            href={cta.href}
            className={cn(
              "group mt-8 inline-flex items-center gap-2 text-sm font-semibold",
              tokens.cta
            )}
          >
            {cta.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        )}
      </div>
    </section>
  );
}
