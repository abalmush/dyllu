import { compareCatalog } from "../compare-catalog";

describe("compareCatalog", () => {
  it("excludes hidden and deleted 1C products from the missing queue", () => {
    const products = [
      {
        externalId: "HIDDEN",
        sku: "HIDDEN",
        name: "Hidden",
        description: "",
        regularPriceMdl: 10,
        balance: 1,
        brandExternalId: null,
        categoryExternalIds: [],
        hidden: true,
        deleted: false,
        source: { id: "HIDDEN" },
      },
      {
        externalId: "DELETED",
        sku: "DELETED",
        name: "Deleted",
        description: "",
        regularPriceMdl: 10,
        balance: 1,
        brandExternalId: null,
        categoryExternalIds: [],
        hidden: false,
        deleted: true,
        source: { id: "DELETED" },
      },
    ];

    expect(compareCatalog(products, [])).toEqual([
      expect.objectContaining({ sku: "HIDDEN", mappingStatus: "excluded" }),
      expect.objectContaining({ sku: "DELETED", mappingStatus: "excluded" }),
    ]);
  });

  it("classifies duplicate 1C SKUs as ambiguous", () => {
    const product = {
      externalId: "DUPLICATE",
      sku: "DUPLICATE",
      name: "Duplicate",
      description: "",
      regularPriceMdl: 10,
      balance: 1,
      brandExternalId: null,
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "DUPLICATE" },
    };

    expect(
      compareCatalog([product, { ...product, externalId: "DUP-2" }], [])
    ).toEqual([
      expect.objectContaining({ mappingStatus: "ambiguous" }),
      expect.objectContaining({ mappingStatus: "ambiguous" }),
    ]);
  });

  it("classifies a valid 1C product with no exact Medusa SKU as missing", () => {
    const result = compareCatalog(
      [
        {
          externalId: "SKU-404",
          sku: "SKU-404",
          name: "Produs nou",
          description: "",
          regularPriceMdl: 250,
          balance: 3,
          brandExternalId: null,
          categoryExternalIds: [],
          hidden: false,
          deleted: false,
          source: { id: "SKU-404" },
        },
      ],
      []
    );

    expect(result).toEqual([
      expect.objectContaining({
        externalId: "SKU-404",
        sku: "SKU-404",
        mappingStatus: "missing_medusa",
        medusaProductId: null,
        medusaVariantId: null,
      }),
    ]);
  });

  it("returns field differences for one exact SKU match", () => {
    const source = {
      externalId: "SKU-100",
      sku: "SKU-100",
      name: "Nume 1C",
      description: "Descriere nouă",
      regularPriceMdl: 120,
      balance: 2,
      brandExternalId: null,
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "SKU-100" },
    };
    const now = new Date("2026-08-05T10:00:00.000Z");

    const [result] = compareCatalog(
      [source],
      [
        {
          productId: "prod_1",
          productTitle: "Nume Medusa",
          productDescription: "Descriere veche",
          productStatus: "published",
          productUpdatedAt: now,
          variantId: "variant_1",
          variantTitle: "Default",
          variantUpdatedAt: now,
          sku: "SKU-100",
          prices: [
            {
              id: "price_1",
              currencyCode: "mdl",
              amount: 100,
              updatedAt: now,
            },
          ],
        },
      ]
    );

    expect(result).toEqual(
      expect.objectContaining({
        mappingStatus: "matched",
        medusaProductId: "prod_1",
        medusaVariantId: "variant_1",
        differences: [
          { field: "name", before: "Nume Medusa", proposed: "Nume 1C" },
          {
            field: "description",
            before: "Descriere veche",
            proposed: "Descriere nouă",
          },
          { field: "regular_price_mdl", before: 100, proposed: 120 },
        ],
      })
    );
  });
});
