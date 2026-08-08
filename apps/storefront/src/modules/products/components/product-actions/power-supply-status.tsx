import { Battery, Plug, Zap } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { Badge } from "@/components/molecules/badge";
import { PowerSourceBadge } from "@/components/organisms/power-source-badge";
import {
  getPowerSourceKind,
  getProductPowerSupply,
} from "@modules/products/lib/product-presentation";

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

function platformLabel(platform: string | undefined): string | undefined {
  if (platform === "dyllu-20v") return "Platformă DYLLU P20S 20 V";
  if (platform === "dyllu-12v") return "Platformă DYLLU S12 12 V";
  return undefined;
}

function NonBatteryPowerSource({ product, variant }: Props) {
  const kind = getPowerSourceKind(product, variant);
  if (!kind) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 px-2"
      aria-label="Alimentare"
    >
      <PowerSourceBadge kind={kind} />
    </div>
  );
}

export function PowerSupplyStatus({ product, variant }: Props) {
  const supply = getProductPowerSupply(product, variant);
  if (supply?.powerSource !== "cordless_battery") {
    return <NonBatteryPowerSource product={product} variant={variant} />;
  }

  const batteryDetails = [
    supply.batteryIncluded === true &&
    supply.batteryCount &&
    supply.batteryCount > 1
      ? `${supply.batteryCount} acumulatori incluși`
      : supply.batteryIncluded === true
        ? "Acumulator inclus"
        : supply.batteryIncluded === false
          ? "Fără acumulator"
          : "Acumulator: informație de confirmat",
    supply.batteryIncluded === true
      ? capacityLabel(supply.batteryCapacity)
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  const chargerLabel =
    supply.chargerIncluded === true
      ? "Încărcător inclus"
      : supply.chargerIncluded === false
        ? "Fără încărcător"
        : "Încărcător: informație de confirmat";
  const label = platformLabel(supply.platform);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2 px-2"
      aria-label="Conținut alimentare"
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
