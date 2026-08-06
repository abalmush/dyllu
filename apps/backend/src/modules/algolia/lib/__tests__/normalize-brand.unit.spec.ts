import { normalizeCatalogBrand } from "../normalize-brand";

describe("normalizeCatalogBrand", () => {
  it("replaces ingco with DYLLU case-insensitively", () => {
    expect(normalizeCatalogBrand("Ingco Impact Drill")).toBe(
      "DYLLU Impact Drill"
    );
    expect(normalizeCatalogBrand("INGCO 20V Set")).toBe("DYLLU 20V Set");
  });

  it("leaves unrelated text untouched", () => {
    expect(normalizeCatalogBrand("Burghiu SDS+")).toBe("Burghiu SDS+");
  });
});
