"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@lib/utils";

export interface QuantityStepperProps {
  value: number;
  onChange?: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled,
  className,
  size = "md",
}: QuantityStepperProps) {
  const dec = () => onChange?.(Math.max(min, value - 1));
  const inc = () => onChange?.(Math.min(max, value + 1));
  const sizeCls = size === "sm" ? "h-8 [&_button]:size-8" : "h-10 [&_button]:size-10";
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background",
        sizeCls,
        disabled && "opacity-50",
        className
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={dec}
        disabled={disabled || value <= min}
        className="grid place-items-center rounded-l-full text-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Minus className="size-3.5" />
      </button>
      <span className="min-w-[36px] text-center text-sm font-semibold">
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={inc}
        disabled={disabled || value >= max}
        className="grid place-items-center rounded-r-full text-foreground transition-colors hover:bg-muted disabled:opacity-40"
      >
        <Plus className="size-3.5" />
      </button>
    </div>
  );
}
