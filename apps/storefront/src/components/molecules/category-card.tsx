import * as React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";

export interface CategoryCardProps {
  href: string;
  name: string;
  productCount?: number;
  description?: string;
  imageUrl?: string;
  accent?: "primary" | "neutral" | "dark";
  emphasized?: boolean;
  className?: string;
}

const accentMap = {
  primary:
    "bg-primary text-primary-foreground [&_[data-arrow]]:bg-primary-foreground [&_[data-arrow]]:text-primary",
  neutral: "bg-card text-foreground",
  dark: "bg-secondary text-secondary-foreground [&_[data-arrow]]:bg-primary [&_[data-arrow]]:text-primary-foreground",
};

export const CategoryCard = React.forwardRef<
  HTMLAnchorElement,
  CategoryCardProps
>(
  (
    {
      href,
      name,
      productCount,
      description,
      imageUrl,
      accent = "neutral",
      emphasized,
      className,
    },
    ref
  ) => (
    <Link
      ref={ref}
      href={href}
      className={cn(
        "clip-corner-cut-md group relative flex h-full min-h-[260px] flex-col overflow-hidden border border-border p-6 transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_30px_70px_-40px_rgba(15,23,42,0.4)]",
        accentMap[accent],
        className
      )}
    >
      {imageUrl && (
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-cover bg-center opacity-90 mix-blend-multiply transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      )}
      {imageUrl && (
        <span
          aria-hidden
          className="absolute inset-0 z-[1] bg-gradient-to-t from-foreground/85 via-foreground/35 to-transparent"
        />
      )}
      <div className="relative z-[2] flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3
            className={cn(
              "font-display font-bold leading-tight tracking-tight",
              emphasized ? "text-2xl sm:text-3xl" : "text-xl",
              imageUrl ? "text-background" : ""
            )}
          >
            {name}
          </h3>
          <span
            data-arrow
            className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform duration-300 group-hover:rotate-[-45deg]"
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </div>
        {description && (
          <p
            className={cn(
              "mt-3 text-base leading-relaxed",
              imageUrl ? "text-background/85" : "text-muted-foreground"
            )}
          >
            {description}
          </p>
        )}
        <div className="mt-auto pt-4">
          {typeof productCount === "number" && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                imageUrl
                  ? "bg-background/15 text-background backdrop-blur"
                  : "bg-foreground/5 text-muted-foreground"
              )}
            >
              {productCount} produse
            </span>
          )}
        </div>
      </div>
    </Link>
  )
);
CategoryCard.displayName = "CategoryCard";
