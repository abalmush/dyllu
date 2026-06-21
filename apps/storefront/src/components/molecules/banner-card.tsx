import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";

export interface BannerCardProps {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaLabel: string;
  href: string;
  variant?: "primary" | "dark" | "muted" | "image";
  imageUrl?: string;
  className?: string;
  align?: "left" | "center";
}

const variantMap = {
  primary: "bg-primary text-primary-foreground",
  dark: "bg-secondary text-secondary-foreground",
  muted: "bg-surface text-foreground",
  image: "bg-secondary text-secondary-foreground",
};

const ctaMap = {
  primary: "bg-foreground text-background hover:bg-foreground/90",
  dark: "bg-primary text-primary-foreground hover:bg-primary/90",
  muted: "bg-foreground text-background hover:bg-foreground/90",
  image: "bg-primary text-primary-foreground hover:bg-primary/90",
};

export function BannerCard({
  eyebrow,
  title,
  description,
  ctaLabel,
  href,
  variant = "primary",
  imageUrl,
  className,
  align = "left",
}: BannerCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "clip-corner-cut-lg group relative flex min-h-[260px] overflow-hidden border border-transparent transition-all duration-300 hover:-translate-y-0.5 small:min-h-[280px]",
        variantMap[variant],
        className
      )}
    >
      {imageUrl && (
        <span
          aria-hidden
          className="absolute inset-0 bg-cover bg-center opacity-70 transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      {imageUrl && (
        <span
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/40 to-foreground/10"
        />
      )}
      <div
        className={cn(
          "relative z-[1] flex w-full flex-col justify-between gap-6 p-8 sm:p-10",
          align === "center" && "items-center text-center"
        )}
      >
        <div className="flex max-w-md flex-col gap-3">
          {eyebrow && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
              {eyebrow}
            </span>
          )}
          <h3 className="font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            {title}
          </h3>
          {description && (
            <p className="text-sm/relaxed opacity-80">{description}</p>
          )}
        </div>
        <span
          className={cn(
            "clip-corner-cut-sm inline-flex items-center gap-2 self-start px-5 py-2.5 text-sm font-semibold transition-colors",
            ctaMap[variant]
          )}
        >
          {ctaLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
