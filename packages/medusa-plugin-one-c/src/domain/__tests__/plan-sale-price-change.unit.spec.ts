import { planSalePriceChange } from "../plan-sale-price-change";

describe("planSalePriceChange", () => {
  it("does nothing when there is no 1C sale and no existing row", () => {
    expect(
      planSalePriceChange({
        proposedSalePriceMdl: null,
        currentSalePriceListEntry: null,
      })
    ).toEqual({ action: "none" });
  });

  it("removes the row when 1C no longer reports a sale", () => {
    expect(
      planSalePriceChange({
        proposedSalePriceMdl: null,
        currentSalePriceListEntry: { id: "price_1", amount: 649 },
      })
    ).toEqual({ action: "remove", priceId: "price_1" });
  });

  it("creates a row when 1C reports a sale and none exists yet", () => {
    expect(
      planSalePriceChange({
        proposedSalePriceMdl: 649,
        currentSalePriceListEntry: null,
      })
    ).toEqual({ action: "create", amount: 649 });
  });

  it("does nothing when the sale amount is unchanged", () => {
    expect(
      planSalePriceChange({
        proposedSalePriceMdl: 649,
        currentSalePriceListEntry: { id: "price_1", amount: 649 },
      })
    ).toEqual({ action: "none" });
  });

  it("updates the row when the sale amount changed", () => {
    expect(
      planSalePriceChange({
        proposedSalePriceMdl: 599,
        currentSalePriceListEntry: { id: "price_1", amount: 649 },
      })
    ).toEqual({ action: "update", priceId: "price_1", amount: 599 });
  });
});
