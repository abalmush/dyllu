const BATTERY_PLATFORM = /^dyllu-\d+(?:\.\d+)?v$/;
const BATTERY_POWER_SOURCES = new Set([
  "cordless_battery",
  "integrated_rechargeable_battery",
  "replaceable_battery",
]);
const EXCLUDED_ACCESSORY_KINDS = new Set(["battery", "charger"]);

export type BatteryCollectionProduct = {
  metadata?: Record<string, unknown> | null;
  variants?: Array<{ metadata?: Record<string, unknown> | null }>;
};

export function isBatteryTool(product: BatteryCollectionProduct): boolean {
  const productMetadata = product.metadata ?? {};
  const accessoryKind = productMetadata.accessory_kind;
  if (
    typeof accessoryKind === "string" &&
    EXCLUDED_ACCESSORY_KINDS.has(accessoryKind)
  ) {
    return false;
  }

  const platform = productMetadata.platform;
  if (typeof platform === "string" && BATTERY_PLATFORM.test(platform)) {
    return true;
  }

  return (product.variants ?? []).some((variant) => {
    const powerSource = variant.metadata?.power_source;
    return (
      typeof powerSource === "string" && BATTERY_POWER_SOURCES.has(powerSource)
    );
  });
}
