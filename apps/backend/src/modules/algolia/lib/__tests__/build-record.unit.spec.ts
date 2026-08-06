import { buildAlgoliaRecord, type ProductForIndexing } from "../build-record";

const product: ProductForIndexing = {
  id: "prod_1",
  title: "Ingco Impact Drill",
  description: "Powerful Ingco drill",
  handle: "impact-drill",
  thumbnail: "https://cdn.dyllu.md/thumb.jpg",
  status: "published",
  created_at: "2026-01-01T00:00:00Z",
  metadata: { one_c_external_id: "51542", note: "featured" },
  tags: [{ value: "power-tools" }],
  categories: [{ id: "pcat_1", name: "Scule electrice" }],
  variants: [
    {
      sku: "SKU-1",
      title: "Default",
      calculated_price: { calculated_amount: 900, original_amount: 1200 },
    },
    {
      sku: "SKU-2",
      title: "Kit",
      calculated_price: { calculated_amount: 1500, original_amount: 1500 },
    },
  ],
};

describe("buildAlgoliaRecord", () => {
  it("normalizes the brand in title and description", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.title).toBe("DYLLU Impact Drill");
    expect(record.description).toBe("Powerful DYLLU drill");
  });

  it("picks the minimum-price variant for price/original_price, paired", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.price).toBe(900);
    expect(record.original_price).toBe(1200);
  });

  it("flags on_sale true if any variant is discounted", () => {
    expect(buildAlgoliaRecord(product).on_sale).toBe(true);
  });

  it("flags on_sale false if no variant is discounted", () => {
    const noSale: ProductForIndexing = {
      ...product,
      variants: [
        {
          sku: "SKU-1",
          title: "Default",
          calculated_price: { calculated_amount: 900, original_amount: 900 },
        },
      ],
    };
    expect(buildAlgoliaRecord(noSale).on_sale).toBe(false);
  });

  it("flattens metadata into a searchable string, including arbitrary keys like a 1C id", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.metadata).toContain("51542");
    expect(record.metadata).toContain("featured");
  });

  it("collects skus, variant titles, category names and ids", () => {
    const record = buildAlgoliaRecord(product);
    expect(record.skus).toEqual(["SKU-1", "SKU-2"]);
    expect(record.variant_titles).toEqual(["Default", "Kit"]);
    expect(record.category_names).toEqual(["Scule electrice"]);
    expect(record.category_ids).toEqual(["pcat_1"]);
  });

  it("uses the product id as objectID", () => {
    expect(buildAlgoliaRecord(product).objectID).toBe("prod_1");
  });
});
