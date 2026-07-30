import { createProductDescriptionHash } from "../product-description-hash";

const input = {
  productId: "prod_drill",
  productUpdatedAt: new Date("2026-07-29T09:00:00.000Z"),
  beforeValue: "Descriere veche",
  proposedValue: "Descriere nouă",
};

describe("createProductDescriptionHash", () => {
  it("is stable for the exact product version and content", () => {
    expect(createProductDescriptionHash(input)).toBe(
      createProductDescriptionHash(input)
    );
  });

  it("changes when proposed content is modified", () => {
    expect(
      createProductDescriptionHash({
        ...input,
        proposedValue: "Descriere modificată",
      })
    ).not.toBe(createProductDescriptionHash(input));
  });
});
