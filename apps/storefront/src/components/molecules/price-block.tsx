import * as React from "react";

import { cn } from "@lib/utils";

export type PriceShape = {
  calculated_price: string;
  calculated_price_number?: number;
  currency_code?: string;
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
  sm: "text-base",
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
          <span className="text-muted-foreground text-sm font-medium">
            {prefix}
          </span>
        )}
        <span
          className={cn(
            "text-foreground font-semibold tracking-tight whitespace-nowrap",
            sizeMap[size],
            isSale && "text-destructive"
          )}
          data-testid="product-price"
        >
          {price.calculated_price}
        </span>
        {isSale && price.original_price && (
          <span className="text-muted-foreground text-sm line-through whitespace-nowrap">
            {price.original_price}
          </span>
        )}
        {isSale && price.percentage_diff && (
          <span className="border-destructive/20 bg-destructive/10 text-destructive rounded-full border px-2 py-1 text-sm font-semibold tracking-wide">
            -{price.percentage_diff}%
          </span>
        )}
      </div>
    );
  }
);
PriceBlock.displayName = "PriceBlock";
