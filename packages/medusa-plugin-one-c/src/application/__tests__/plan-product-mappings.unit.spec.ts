import { planExactProductMappings } from "../plan-product-mappings";

describe("planExactProductMappings", () => {
  const item = {
    id: "onecitem_1",
    externalId: "51542",
    name: "Set pensule DYLLU DTPB1952",
    suggestedMedusaSku: "DTPB1952",
    hidden: false,
    deleted: false,
  };

  it("plans one exact and unique mapping", () => {
    expect(
      planExactProductMappings(
        [item],
        [{ id: "variant_1", sku: "DTPB1952" }],
        []
      )
    ).toEqual({
      mappings: [
        {
          syncItemId: "onecitem_1",
          externalId: "51542",
          name: item.name,
          medusaVariantId: "variant_1",
          medusaSku: "DTPB1952",
        },
      ],
      skippedCount: 0,
    });
  });

  it("skips duplicate suggestions and mapping conflicts", () => {
    const duplicate = { ...item, id: "onecitem_2", externalId: "51543" };
    expect(
      planExactProductMappings(
        [item, duplicate],
        [{ id: "variant_1", sku: "DTPB1952" }],
        []
      )
    ).toEqual({ mappings: [], skippedCount: 2 });

    expect(
      planExactProductMappings(
        [item],
        [{ id: "variant_1", sku: "DTPB1952" }],
        [{ externalId: "other", medusaVariantId: "variant_1" }]
      )
    ).toEqual({ mappings: [], skippedCount: 1 });
  });
});
