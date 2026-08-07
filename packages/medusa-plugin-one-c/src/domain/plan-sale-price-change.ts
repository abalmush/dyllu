export type SalePricePlanInput = {
  proposedSalePriceMdl: number | null;
  currentSalePriceListEntry: { id: string; amount: number } | null;
};

export type SalePricePlan =
  | { action: "none" }
  | { action: "create"; amount: number }
  | { action: "update"; priceId: string; amount: number }
  | { action: "remove"; priceId: string };

export function planSalePriceChange(
  input: SalePricePlanInput
): SalePricePlan {
  const { proposedSalePriceMdl, currentSalePriceListEntry } = input;
  if (proposedSalePriceMdl === null) {
    return currentSalePriceListEntry
      ? { action: "remove", priceId: currentSalePriceListEntry.id }
      : { action: "none" };
  }
  if (!currentSalePriceListEntry) {
    return { action: "create", amount: proposedSalePriceMdl };
  }
  if (currentSalePriceListEntry.amount === proposedSalePriceMdl) {
    return { action: "none" };
  }
  return {
    action: "update",
    priceId: currentSalePriceListEntry.id,
    amount: proposedSalePriceMdl,
  };
}
