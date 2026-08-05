import { ProductSummary } from "../../domain/types";
import { createCatalogQualityReport } from "../catalog-quality";

const baseProduct: ProductSummary = {
  id: "prod_base",
  title: "Produs",
  handle: "produs",
  status: "published",
  description: "A complete product description.",
  imageCount: 1,
  updatedAt: new Date("2026-08-05T08:00:00.000Z"),
  variants: [],
};

describe("createCatalogQualityReport", () => {
  it("finds product, variant, SKU, and normal-price issues", () => {
    const products: ProductSummary[] = [
      {
        ...baseProduct,
        id: "prod_empty",
        title: " ",
        handle: "",
        description: null,
        imageCount: 0,
      },
      {
        ...baseProduct,
        id: "prod_first_sku",
        description: "Short",
        variants: [
          {
            id: "variant_first",
            title: "Standard",
            sku: "DUP-1",
            updatedAt: baseProduct.updatedAt,
            prices: [
              {
                id: "price_invalid",
                amount: 0,
                currencyCode: "mdl",
                updatedAt: baseProduct.updatedAt,
              },
            ],
          },
        ],
      },
      {
        ...baseProduct,
        id: "prod_second_sku",
        variants: [
          {
            id: "variant_second",
            title: "Standard",
            sku: "dup-1",
            updatedAt: baseProduct.updatedAt,
            prices: [],
          },
        ],
      },
    ];

    expect(createCatalogQualityReport(products, 20, 10)).toEqual({
      productCount: 3,
      productsWithIssues: 3,
      issueCounts: {
        missing_title: 1,
        missing_handle: 1,
        missing_description: 1,
        short_description: 1,
        missing_image: 1,
        missing_variant: 1,
        duplicate_sku: 2,
        missing_mdl_price: 1,
        invalid_mdl_price: 1,
      },
      resultsTruncated: false,
      products: [
        {
          productId: "prod_empty",
          title: " ",
          handle: "",
          status: "published",
          issues: [
            { code: "missing_title", variantIds: [], values: [] },
            { code: "missing_handle", variantIds: [], values: [] },
            { code: "missing_description", variantIds: [], values: [] },
            { code: "missing_image", variantIds: [], values: [] },
            { code: "missing_variant", variantIds: [], values: [] },
          ],
        },
        {
          productId: "prod_first_sku",
          title: "Produs",
          handle: "produs",
          status: "published",
          issues: [
            { code: "short_description", variantIds: [], values: [] },
            {
              code: "duplicate_sku",
              variantIds: ["variant_first"],
              values: ["DUP-1"],
            },
            {
              code: "invalid_mdl_price",
              variantIds: ["variant_first"],
              values: ["0"],
            },
          ],
        },
        {
          productId: "prod_second_sku",
          title: "Produs",
          handle: "produs",
          status: "published",
          issues: [
            {
              code: "duplicate_sku",
              variantIds: ["variant_second"],
              values: ["dup-1"],
            },
            {
              code: "missing_mdl_price",
              variantIds: ["variant_second"],
              values: [],
            },
          ],
        },
      ],
    });
  });

  it("reports when detailed product results are truncated", () => {
    const products = [
      { ...baseProduct, id: "prod_one", variants: [] },
      { ...baseProduct, id: "prod_two", variants: [] },
    ];

    expect(createCatalogQualityReport(products, 20, 1)).toMatchObject({
      productCount: 2,
      productsWithIssues: 2,
      resultsTruncated: true,
      products: [{ productId: "prod_one" }],
    });
  });
});
