const DEFAULT_SHIPPING_OPTION_CODE = "standard";

type ShippingOption = {
  id: string;
  insufficient_inventory?: boolean;
  type?: { code?: string | null } | null;
};

export function findDefaultShippingOptionId(
  options: ShippingOption[]
): string | null {
  return (
    options.find(
      (option) =>
        option.type?.code === DEFAULT_SHIPPING_OPTION_CODE &&
        !option.insufficient_inventory
    )?.id ?? null
  );
}
