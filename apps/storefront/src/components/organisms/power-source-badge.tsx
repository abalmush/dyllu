import * as React from "react";
import { Battery, Fuel, Plug, Wind, type LucideIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/atoms/badge";

export type PowerSourceKind = "cordless" | "corded" | "petrol" | "pneumatic";

const POWER_SOURCE_CONFIG: Record<
  PowerSourceKind,
  { label: string; icon: LucideIcon; variant: BadgeProps["variant"] }
> = {
  cordless: { label: "Fără fir", icon: Battery, variant: "soft" },
  corded: { label: "Cu fir", icon: Plug, variant: "secondary" },
  petrol: { label: "Benzină", icon: Fuel, variant: "outline" },
  pneumatic: { label: "Pneumatic", icon: Wind, variant: "outline" },
};

export function PowerSourceBadge({
  kind,
  className,
}: {
  kind: PowerSourceKind;
  className?: string;
}) {
  const { label, icon: Icon, variant } = POWER_SOURCE_CONFIG[kind];

  return (
    <Badge
      variant={variant}
      className={className}
      data-testid="power-source-badge"
      data-power-source={kind}
    >
      <Icon className="mr-1.5 size-3.5" aria-hidden="true" />
      {label}
    </Badge>
  );
}
