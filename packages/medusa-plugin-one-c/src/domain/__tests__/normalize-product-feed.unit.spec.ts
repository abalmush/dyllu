import { normalizeProductFeed } from "../normalize-product-feed";

describe("normalizeProductFeed", () => {
  it("normalizes a valid 1C product and its regular MDL price", () => {
    const result = normalizeProductFeed({
      Items: [
        {
          id: "SKU-100",
          name_ro: "Ciocan",
          description_ro: "Ciocan profesional",
          balance: "7",
          BrandId: "brand-1",
          Prices: [
            { typeId: "03", value: 80 },
            { typeId: "05", value: 100 },
          ],
          hidden: false,
          deleted: false,
        },
      ],
    });

    expect(result).toEqual({
      items: [
        {
          externalId: "SKU-100",
          sku: "SKU-100",
          name: "Ciocan",
          description: "Ciocan profesional",
          regularPriceMdl: 100,
          balance: 7,
          brandExternalId: "brand-1",
          categoryExternalIds: [],
          hidden: false,
          deleted: false,
          source: expect.any(Object),
        },
      ],
      issues: [],
    });
  });

  it("normalizes comma decimals from 1C", () => {
    const result = normalizeProductFeed({
      Items: [
        {
          id: "SKU-101",
          name_ro: "Produs",
          balance: "7,5",
          Prices: [{ typeId: "05", value: "100,50" }],
        },
      ],
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({ regularPriceMdl: 100.5, balance: 7.5 })
    );
  });

  it("keeps the source row for an invalid product", () => {
    const result = normalizeProductFeed({
      Items: [{ name_ro: "Invalid", BrandId: "brand-dyllu" }],
    });

    expect(result.issues).toEqual([
      expect.objectContaining({
        index: 0,
        code: "invalid_product",
        source: { name_ro: "Invalid", BrandId: "brand-dyllu" },
      }),
    ]);
  });
});
