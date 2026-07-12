import * as React from "react";
import Image from "next/image";
import Link from "next/link";
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
      className,
    },
    ref
  ) => (
    <Link
      ref={ref}
      href={href}
      data-testid="product-wrapper"
      className={cn(
        "clip-corner-cut-md group relative flex flex-col overflow-hidden border border-border bg-card transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)]",
        className
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden bg-surface-subtle",
          isFeatured ? "aspect-[4/5]" : "aspect-square"
        )}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={imageAlt || title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 22vw"
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-muted-foreground">
            <span className="text-xs">No image</span>
          </div>
        )}
        {badge && (
          <Badge
            variant="soft"
            className="absolute left-3 top-3 bg-primary text-primary-foreground"
          >
            {badge}
          </Badge>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-background/95 text-foreground opacity-0 shadow-md transition-[opacity,transform] duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {category && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {category}
          </span>
        )}
        <h3
          className="line-clamp-2 text-base font-semibold leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-800"
          data-testid="product-title"
        >
          {title}
        </h3>
        {price && <PriceBlock price={price} size="md" />}
      </div>
    </Link>
  )
);
ProductCard.displayName = "ProductCard";
