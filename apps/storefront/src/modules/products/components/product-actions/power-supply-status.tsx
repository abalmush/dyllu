import { Battery, Plug, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/molecules/badge";
import { getProductPowerSupply } from "@modules/products/lib/product-presentation";

type Props = {
  product: HttpTypes.StoreProduct;
  variant?: HttpTypes.StoreProductVariant;
};

function capacityLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value
    .replace(/\.0(?=\s*Ah)/i, "")
    .replace(/(\d)\.(\d)/, "$1,$2")
    .replace(/(?<=\d)Ah\b/i, " Ah");
}

function platformLabel(
  platform: string | undefined,
  t: ReturnType<typeof useTranslations>
): string | undefined {
  if (platform === "dyllu-20v") return t("platformP20S");
  if (platform === "dyllu-12v") return t("platformS12");
  return undefined;
}

export function PowerSupplyStatus({ product, variant }: Props) {
  const t = useTranslations("ProductActions.powerSupplyStatus");
  const supply = getProductPowerSupply(product, variant);
  if (supply?.powerSource !== "cordless_battery") return null;

  const batteryDetails = [
    supply.batteryIncluded === true &&
    supply.batteryCount &&
    supply.batteryCount > 1
      ? t("batteriesIncludedCount", { count: supply.batteryCount })
      : supply.batteryIncluded === true
        ? t("batteryIncluded")
        : supply.batteryIncluded === false
          ? t("batteryNotIncluded")
          : t("batteryUnknown"),
    supply.batteryIncluded === true
      ? capacityLabel(supply.batteryCapacity)
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const chargerLabel =
    supply.chargerIncluded === true
      ? t("chargerIncluded")
      : supply.chargerIncluded === false
        ? t("chargerNotIncluded")
        : t("chargerUnknown");
  const label = platformLabel(supply.platform, t);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 px-2"
      aria-label={t("ariaLabel")}
      data-testid="power-supply-badges"
    >
      <Badge variant={supply.batteryIncluded ? "lime" : "warning"} size="sm">
        <Battery className="size-3.5" aria-hidden="true" />
        {batteryDetails}
      </Badge>
      <Badge variant={supply.chargerIncluded ? "lime" : "warning"} size="sm">
        <Plug className="size-3.5" aria-hidden="true" />
        {chargerLabel}
      </Badge>
      {label ? (
        <Badge variant="dark" size="sm">
          <Zap className="size-3.5" aria-hidden="true" />
          {label}
        </Badge>
      ) : null}
    </div>
  );
}
