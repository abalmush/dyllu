import * as React from "react";
import {
  BatteryCharging,
  Boxes,
  Layers,
  Package,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge, type BadgeProps } from "@/components/atoms/badge";

export type ProductType = "single" | "set" | "kit" | "combo" | "needs-battery";

const TYPE_CONFIG: Record<
  ProductType,
  { labelKey: string; icon: LucideIcon; variant: BadgeProps["variant"] }
> = {
  single: { labelKey: "single", icon: Package, variant: "outline" },
  set: { labelKey: "set", icon: Layers, variant: "secondary" },
  kit: { labelKey: "kit", icon: Boxes, variant: "soft" },
  combo: { labelKey: "combo", icon: Boxes, variant: "soft" },
  "needs-battery": {
    labelKey: "needsBattery",
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
  const t = useTranslations("ProductTypeBadge");
  const { labelKey, icon: Icon, variant } = TYPE_CONFIG[type];
  const label = t(labelKey);
  const text =
    type === "set" && count != null
      ? t("setWithCount", { label, count })
      : label;

  return (
    <Badge variant={variant} className={className}>
      <Icon className="mr-1.5 size-3.5" />
      {text}
    </Badge>
  );
}
