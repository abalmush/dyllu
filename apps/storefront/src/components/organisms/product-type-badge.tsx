import * as React from "react";
import {
  BatteryCharging,
  Boxes,
  Layers,
  Package,
  type LucideIcon,
} from "lucide-react";

import { Badge, type BadgeProps } from "@/components/atoms/badge";

export type ProductType = "single" | "set" | "kit" | "combo" | "needs-battery";

const TYPE_CONFIG: Record<
  ProductType,
  { label: string; icon: LucideIcon; variant: BadgeProps["variant"] }
> = {
  single: { label: "Produs individual", icon: Package, variant: "outline" },
  set: { label: "Set", icon: Layers, variant: "secondary" },
  kit: { label: "Kit complet", icon: Boxes, variant: "soft" },
  combo: { label: "Combo cu acumulatori", icon: Boxes, variant: "soft" },
  "needs-battery": {
    label: "Necesită acumulator",
    icon: BatteryCharging,
    variant: "warning",
  },
};

export function ProductTypeBadge({
  type,
  count,
  className,
}: {
  type: ProductType;
  count?: number;
  className?: string;
}) {
  const { label, icon: Icon, variant } = TYPE_CONFIG[type];
  const text =
    type === "set" && count != null ? `${label} · ${count} piese` : label;

  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1.5 size-3.5" />
      {text}
    </Badge>
  );
}
