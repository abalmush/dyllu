"use client";

import { HttpTypes } from "@medusajs/types";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";

import { cn } from "@lib/utils";

type Props = {
  option: HttpTypes.StoreProductOption;
  current: string | undefined;
  updateOption: (title: string, value: string) => void;
  title: string;
  disabled: boolean;
  "data-testid"?: string;
};

export default function OptionSelect({
  option,
  current,
  updateOption,
  title,
  disabled,
  "data-testid": dataTestId,
}: Props) {
  const values = option.values?.map((v) => v.value) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>
        {current && (
          <span className="text-sm font-semibold tracking-tight text-foreground">
            {current}
          </span>
        )}
      </div>
      <RadioGroupPrimitive.Root
        className="flex flex-wrap gap-2"
        data-testid={dataTestId}
        aria-label={title}
        value={current ?? ""}
        onValueChange={(value) => updateOption(option.id, value)}
        disabled={disabled}
      >
        {values.map((v) => {
          const selected = v === current;
          return (
            <RadioGroupPrimitive.Item
              key={v}
              value={v}
              disabled={disabled}
              data-testid="option-button"
              className={cn(
                "min-w-[72px] rounded-full border px-4 py-2.5 text-sm font-medium tracking-tight transition-[background-color,border-color,color,box-shadow] duration-200",
                "disabled:pointer-events-none disabled:opacity-40",
                selected
                  ? "border-foreground bg-foreground text-background shadow-sm"
                  : "border-border bg-card text-foreground hover:border-foreground/40 hover:bg-muted"
              )}
            >
              {v}
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
