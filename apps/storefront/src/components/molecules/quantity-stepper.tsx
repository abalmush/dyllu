"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("QuantityStepper");
  const dec = () => onChange?.(Math.max(min, value - 1));
  const inc = () => onChange?.(Math.min(max, value + 1));
  const sizeCls =
    size === "sm" ? "h-11 [&_button]:size-11" : "h-12 [&_button]:size-12";
  return (
    <div
      className={cn(
        "border-border bg-background inline-flex items-center rounded-md border",
        sizeCls,
        disabled && "opacity-50",
        className
      )}
    >
      <button
        type="button"
        aria-label={t("decrease")}
        onClick={dec}
        disabled={disabled || value <= min}
        className="text-foreground hover:bg-muted grid place-items-center transition-colors disabled:opacity-40"
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <span
        aria-live="polite"
        className="min-w-10 text-center text-base font-semibold tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={t("increase")}
        onClick={inc}
        disabled={disabled || value >= max}
        className="text-foreground hover:bg-muted grid place-items-center transition-colors disabled:opacity-40"
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
