import { normalizePromoFeed } from "../normalize-promo-feed";

describe("normalizePromoFeed", () => {
  it("reads the sale price and promotion dates", () => {
    const result = normalizePromoFeed({
      Items: [
        {
          id: 50683,
          discountPrice: "25,50",
          Action: { StartDate: "2026-08-01", EndDate: "2026-08-31" },
        },
      ],
    });
    expect(result.get("50683")).toEqual({
      externalId: "50683",
      salePriceMdl: 25.5,
      startsAt: "2026-08-01",
      endsAt: "2026-08-31",
    });
  });

  it("accepts promotions without date limits", () => {
    const result = normalizePromoFeed({
      Items: [
        {
          id: 51542,
          discountPrice: 50,
          Action: { StartDate: null, EndDate: null },
        },
      ],
    });

    expect(result.get("51542")).toEqual({
      externalId: "51542",
      salePriceMdl: 50,
      startsAt: null,
      endsAt: null,
    });
  });
});
