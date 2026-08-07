import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@lib/utils";
import { Badge } from "@/components/atoms/badge";
import {
  PriceBlock,
  type PriceShape,
} from "@/components/molecules/price-block";

export interface ProductCardProps {
  href: string;
  title: string;
  thumbnail?: string | null;
  imageAlt?: string;
  price?: PriceShape | null;
  badge?: string;
  category?: string;
  isFeatured?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProductCard = React.forwardRef<
  HTMLAnchorElement,
  ProductCardProps
>(
  (
    {
      href,
      title,
      thumbnail,
      imageAlt,
      price,
      badge,
      category,
      isFeatured,
      compact = false,
      className,
    },
    ref
  ) => {
    if (!thumbnail) return null;

    return (
      <Link
        ref={ref}
        href={href}
        data-testid="product-wrapper"
        className={cn(
          "clip-corner-cut-md group border-border bg-card hover:border-foreground/20 relative flex flex-col overflow-hidden border transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]",
          className
        )}
      >
        <div
          className={cn(
            "bg-surface-subtle relative w-full overflow-hidden",
            compact || !isFeatured ? "aspect-square" : "aspect-4/5"
          )}
        >
          <Image
            src={thumbnail}
            alt={imageAlt || title}
            fill
            sizes={
              compact
                ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 16vw"
                : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            }
            className={cn(
              "object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]",
              compact ? "object-contain p-3" : "object-cover"
            )}
          />
          {badge && (
            <Badge
              variant="soft"
              className="bg-primary text-primary-foreground absolute top-3 left-3"
            >
              {badge}
            </Badge>
          )}
          <span
            aria-hidden="true"
            className={cn(
              "bg-background/95 text-foreground pointer-events-none absolute top-3 right-3 grid place-items-center rounded-full opacity-0 shadow-md transition-[opacity,transform] duration-300 group-hover:opacity-100 group-focus-visible:opacity-100",
              compact ? "size-9" : "size-11"
            )}
          >
            <ArrowUpRight className={compact ? "size-4" : "size-5"} />
          </span>
        </div>
        <div
          className={cn(
            "flex flex-1 flex-col",
            compact ? "gap-1.5 p-3" : "gap-2 p-4"
          )}
        >
          {category && (
            <span className="text-2xs text-muted-foreground font-semibold tracking-[0.18em] uppercase">
              {category}
            </span>
          )}
          <h3
            className={cn(
              "text-foreground group-hover:text-brand-800 line-clamp-2 leading-snug font-semibold tracking-tight transition-colors",
              compact ? "text-sm" : "text-base"
            )}
            data-testid="product-title"
          >
            {title}
          </h3>
          {price && <PriceBlock price={price} size={compact ? "sm" : "md"} />}
        </div>
      </Link>
    );
  }
);
ProductCard.displayName = "ProductCard";
