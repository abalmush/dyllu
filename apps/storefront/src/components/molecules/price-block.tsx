import * as React from "react";

import { cn } from "@lib/utils";

export type PriceShape = {
  calculated_price: string;
  original_price?: string;
  price_type?: string;
  percentage_diff?: string | number;
};

export interface PriceBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  price: PriceShape | null | undefined;
  prefix?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
};

export const PriceBlock = React.forwardRef<HTMLDivElement, PriceBlockProps>(
  ({ price, prefix, size = "md", className, ...props }, ref) => {
    if (!price) {
      return <div className="ds-shimmer h-9 w-28 rounded-md" aria-hidden />;
    }
    const isSale = price.price_type === "sale";
    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap items-baseline gap-x-2", className)}
        {...props}
      >
        {prefix && (
          <span className="text-sm font-medium text-muted-foreground">
            {prefix}
          </span>
        )}
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            sizeMap[size],
            isSale && "text-destructive"
          )}
          data-testid="product-price"
        >
          {price.calculated_price}
        </span>
        {isSale && price.original_price && (
          <span className="text-sm text-muted-foreground line-through">
            {price.original_price}
          </span>
        )}
        {isSale && price.percentage_diff && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
            -{price.percentage_diff}%
          </span>
        )}
      </div>
    );
  }
);
PriceBlock.displayName = "PriceBlock";
