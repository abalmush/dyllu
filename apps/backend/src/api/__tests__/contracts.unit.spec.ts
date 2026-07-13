import {
  AiApplyBodySchema,
  AiChatBodySchema,
  CompatibleAccessoriesQuerySchema,
} from "../_shared/contracts";

describe("AI request contracts", () => {
  it("normalizes a valid chat request", () => {
    const parsed = AiChatBodySchema.parse({
      product_id: "prod_01ABC",
      message: "  rescrie descrierea  ",
    });

    expect(parsed).toEqual({
      product_id: "prod_01ABC",
      message: "rescrie descrierea",
      history: [],
    });
  });

  it("rejects unknown chat fields and oversized messages", () => {
    expect(
      AiChatBodySchema.safeParse({
        product_id: "prod_01ABC",
        message: "hello",
        admin: true,
      }).success
    ).toBe(false);
    expect(
      AiChatBodySchema.safeParse({
        product_id: "prod_01ABC",
        message: "x".repeat(2_001),
      }).success
    ).toBe(false);
  });

  it("accepts bounded text proposals and rejects unsafe image URLs", () => {
    expect(
      AiApplyBodySchema.safeParse({
        product_id: "prod_01ABC",
        proposal: {
          kind: "title",
          currentValue: "Current",
          proposedValue: "Proposed",
          summary: "Shorten title",
        },
      }).success
    ).toBe(true);

    expect(
      AiApplyBodySchema.safeParse({
        product_id: "prod_01ABC",
        proposal: {
          kind: "image_edit",
          sourceUrl: "https://cdn.example.com/source.png",
          previewUrl: "file:///etc/passwd",
          summary: "Edit image",
        },
      }).success
    ).toBe(false);
  });
});

describe("compatible-accessories query contract", () => {
  it("defaults and normalizes accessory types", () => {
    expect(
      CompatibleAccessoriesQuerySchema.parse({ platform: "dyllu-20v" })
    ).toEqual({
      platform: "dyllu-20v",
      types: ["battery", "charger"],
    });

    expect(
      CompatibleAccessoriesQuerySchema.parse({
        platform: "dyllu-20v",
        types: "charger,battery",
      }).types
    ).toEqual(["charger", "battery"]);
  });

  it("rejects invalid types, platform characters, and unknown fields", () => {
    expect(
      CompatibleAccessoriesQuerySchema.safeParse({
        platform: "dyllu-20v",
        types: "battery,other",
      }).success
    ).toBe(false);
    expect(
      CompatibleAccessoriesQuerySchema.safeParse({ platform: "../20v" }).success
    ).toBe(false);
    expect(
      CompatibleAccessoriesQuerySchema.safeParse({
        platform: "dyllu-20v",
        debug: "true",
      }).success
    ).toBe(false);
  });
});
