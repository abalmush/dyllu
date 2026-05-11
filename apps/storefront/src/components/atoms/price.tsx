import * as React from "react";

import { cn } from "@lib/utils";

export interface PriceProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: string;
  originalAmount?: string;
  saleLabel?: string;
  size?: "sm" | "md" | "lg" | "xl";
  align?: "start" | "end";
}

const sizeMap = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

export const Price = React.forwardRef<HTMLDivElement, PriceProps>(
  (
    {
      amount,
      originalAmount,
      saleLabel,
      size = "md",
      align = "start",
      className,
      ...props
    },
    ref
  ) => {
    const isSale = Boolean(originalAmount);
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-baseline gap-2",
          align === "end" && "justify-end",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "font-semibold tracking-tight",
            sizeMap[size],
            isSale && "text-destructive"
          )}
        >
          {amount}
        </span>
        {originalAmount && (
          <span className="text-xs text-muted-foreground line-through">
            {originalAmount}
          </span>
        )}
        {saleLabel && (
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
            {saleLabel}
          </span>
        )}
      </div>
    );
  }
);
Price.displayName = "Price";
