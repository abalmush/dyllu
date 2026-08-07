"use client";

import { HttpTypes } from "@medusajs/types";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { BatteryFull, Check, Zap } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { cn } from "@lib/utils";
import { getPricesForVariant } from "@lib/util/get-product-price";

type Props = {
  product: HttpTypes.StoreProduct;
  option: HttpTypes.StoreProductOption;
  current: string | undefined;
  updateOption: (id: string, value: string) => void;
  disabled: boolean;
  "data-testid"?: string;
};

const WITH_BATTERY_RE = /acumulator|încărc|charger|battery/i;
const WITHOUT_RE = /f[ăa]r[ăa]/i;

const isWithBattery = (value: string) =>
  WITH_BATTERY_RE.test(value) && !WITHOUT_RE.test(value);

export default function ConfigurationSelect({
  product,
  option,
  current,
  updateOption,
  disabled,
  "data-testid": dataTestId,
}: Props) {
  const format = useFormatter();
  const t = useTranslations("ProductActions.configuration");
  const values = Array.from(
    new Set(
      [
        ...(option.values?.map((value) => value.value) ?? []),
        ...(product.variants?.flatMap((variant) =>
          variant.options
            ?.filter((value) => value.option_id === option.id)
            .map((value) => value.value)
        ) ?? []),
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0
      )
    )
  );

  const variantForValue = (value: string) =>
    product.variants?.find((v) =>
      v.options?.some((o) => o.option_id === option.id && o.value === value)
    );

  const priceNumberFor = (value: string) => {
    const variant = variantForValue(value);
    return getPricesForVariant(variant)?.calculated_price_number ?? null;
  };

  const withoutPrice = values
    .filter((v) => !isWithBattery(v))
    .map(priceNumberFor)
    .find((p): p is number => p != null);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
        {option.title}
      </span>
      <RadioGroupPrimitive.Root
        className="flex flex-col gap-2.5"
        data-testid={dataTestId}
        aria-label={option.title ?? t("ariaFallback")}
        value={current ?? ""}
        onValueChange={(value) => updateOption(option.id, value)}
        disabled={disabled}
      >
        {values.map((v) => {
          const selected = v === current;
          const withBattery = isWithBattery(v);
          const price = getPricesForVariant(variantForValue(v));
          const delta =
            withBattery && withoutPrice != null && price
              ? price.calculated_price_number - withoutPrice
              : null;

          return (
            <RadioGroupPrimitive.Item
              key={v}
              value={v}
              disabled={disabled}
              data-testid="configuration-option"
              className={cn(
                "clip-corner-cut-sm group flex items-start gap-4 border p-4 text-left transition-[background-color,border-color,box-shadow] duration-200",
                "disabled:pointer-events-none disabled:opacity-40",
                selected
                  ? "border-primary bg-primary/6 ring-primary shadow-xs ring-1"
                  : "border-border bg-card hover:border-foreground/40 hover:bg-muted"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card group-hover:border-foreground/40 text-transparent"
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  {withBattery ? (
                    <BatteryFull className="text-primary size-4 shrink-0" />
                  ) : (
                    <Zap className="text-muted-foreground size-4 shrink-0" />
                  )}
                  <span className="text-foreground text-sm font-semibold tracking-tight">
                    {v}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs leading-relaxed">
                  {withBattery
                    ? t("withBatteryDescription")
                    : t("withoutBatteryDescription")}
                </span>
              </span>

              <span className="flex shrink-0 flex-col items-end gap-1">
                {price && (
                  <span className="text-foreground text-sm font-bold tracking-tight">
                    {price.calculated_price}
                  </span>
                )}
                {delta != null && delta > 0 && (
                  <span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
                    +{format.number(delta)} MDL
                  </span>
                )}
              </span>
            </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}
