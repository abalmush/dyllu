import {
  indexBatteryVariantFamilies,
  planBatteryVariantImports,
  type BatteryVariantFamily,
} from "../battery-variant-families";

const families: BatteryVariantFamily[] = [
  {
    family_id: "TOOL1",
    members: [
      { sku: "TOOL1", configuration: "Fără acumulator" },
      { sku: "TOOL1K", configuration: "Cu acumulator + încărcător" },
    ],
  },
];

describe("battery variant family planning", () => {
  it("appends a missing member to the existing family product", () => {
    expect(
      planBatteryVariantImports({
        families,
        incomingSkus: ["TOOL1K"],
        existingProductIdBySku: new Map([["TOOL1", "prod_1"]]),
      })
    ).toEqual({
      append: [{ familyId: "TOOL1", productId: "prod_1", skus: ["TOOL1K"] }],
      create: [],
    });
  });

  it("groups members when no family product exists", () => {
    expect(
      planBatteryVariantImports({
        families,
        incomingSkus: ["TOOL1", "TOOL1K"],
        existingProductIdBySku: new Map(),
      })
    ).toEqual({
      append: [],
      create: [{ familyId: "TOOL1", skus: ["TOOL1", "TOOL1K"] }],
    });
  });

  it("fails closed when an existing family is split", () => {
    expect(() =>
      planBatteryVariantImports({
        families,
        incomingSkus: ["TOOL1K"],
        existingProductIdBySku: new Map([
          ["TOOL1", "prod_1"],
          ["TOOL1K", "prod_2"],
        ]),
      })
    ).toThrow("split across existing products");
  });

  it("rejects duplicate SKU membership", () => {
    expect(() =>
      indexBatteryVariantFamilies([...families, ...families])
    ).toThrow("belongs to multiple families");
  });
});
