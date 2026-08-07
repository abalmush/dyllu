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
          salePriceListEntry: null,
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

  it("uses the private 1C mapping instead of matching the internal id as SKU", () => {
    const now = new Date("2026-08-05T10:00:00.000Z");
    const product = {
      externalId: "50683",
      sku: "50683",
      name: "Set surubelnita DYLLU DTSS45M1",
      description: "",
      regularPriceMdl: 30,
      salePriceMdl: null,
      saleStartsAt: null,
      saleEndsAt: null,
      balance: 6,
      brandExternalId: "dyllu",
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "50683" },
    };
    const variants = [
      {
        productId: "prod_1",
        productTitle: product.name,
        productDescription: "",
        productStatus: "published",
        productUpdatedAt: now,
        variantId: "variant_1",
        variantTitle: "Default",
        variantUpdatedAt: now,
        sku: "DTSS45M1",
        prices: [
          { id: "price_1", currencyCode: "mdl", amount: 30, updatedAt: now },
        ],
        salePriceListEntry: null,
      },
    ];

    expect(
      compareCatalog([product], variants, [
        {
          externalId: "50683",
          medusaVariantId: "variant_1",
          medusaSku: "DTSS45M1",
        },
      ])
    ).toEqual([
      expect.objectContaining({
        sku: "DTSS45M1",
        mappingStatus: "matched",
        medusaVariantId: "variant_1",
      }),
    ]);
  });

  it("suggests one exact Medusa SKU found in the 1C product name", () => {
    const now = new Date("2026-08-05T10:00:00.000Z");
    const product = {
      externalId: "51542",
      sku: "51542",
      name: "Set pensule de vopsit DTPB1952",
      description: "",
      regularPriceMdl: 50,
      balance: 5,
      brandExternalId: "dyllu",
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "51542" },
    };
    const variants = [
      {
        productId: "prod_2",
        productTitle: "Set pensule de vopsit, 5 buc.",
        productDescription: "",
        productStatus: "published",
        productUpdatedAt: now,
        variantId: "variant_2",
        variantTitle: "Default",
        variantUpdatedAt: now,
        sku: "DTPB1952",
        prices: [
          { id: "price_2", currencyCode: "mdl", amount: 50, updatedAt: now },
        ],
        salePriceListEntry: null,
      },
    ];

    expect(compareCatalog([product], variants, [])).toEqual([
      expect.objectContaining({
        sku: "",
        mappingStatus: "missing_medusa",
        suggestedMedusaSku: "DTPB1952",
      }),
    ]);
  });

  it("diffs the sale price against Medusa's current sale-list entry", () => {
    const product = {
      externalId: "SALE-1",
      sku: "SALE-1",
      name: "On sale",
      description: "",
      regularPriceMdl: 799,
      salePriceMdl: 649,
      balance: 1,
      brandExternalId: null,
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "SALE-1" },
    };
    const variant = {
      productId: "prod_1",
      productTitle: "On sale",
      productDescription: "",
      productStatus: "published",
      productUpdatedAt: new Date(),
      variantId: "variant_1",
      variantTitle: "On sale",
      variantUpdatedAt: new Date(),
      sku: "SALE-1",
      prices: [{ id: "price_1", currencyCode: "mdl", amount: 799, updatedAt: new Date() }],
      salePriceListEntry: { id: "saleprice_1", amount: 699 },
    };

    const [comparison] = compareCatalog([product], [variant]);

    expect(comparison?.differences).toEqual(
      expect.arrayContaining([
        { field: "sale_price_mdl", before: 699, proposed: 649 },
      ])
    );
  });

  it("does not diff sale price when both sides agree", () => {
    const product = {
      externalId: "SALE-2",
      sku: "SALE-2",
      name: "Steady sale",
      description: "",
      regularPriceMdl: 799,
      salePriceMdl: 649,
      balance: 1,
      brandExternalId: null,
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "SALE-2" },
    };
    const variant = {
      productId: "prod_2",
      productTitle: "Steady sale",
      productDescription: "",
      productStatus: "published",
      productUpdatedAt: new Date(),
      variantId: "variant_2",
      variantTitle: "Steady sale",
      variantUpdatedAt: new Date(),
      sku: "SALE-2",
      prices: [{ id: "price_2", currencyCode: "mdl", amount: 799, updatedAt: new Date() }],
      salePriceListEntry: { id: "saleprice_2", amount: 649 },
    };

    const [comparison] = compareCatalog([product], [variant]);

    expect(
      comparison?.differences.some((diff) => diff.field === "sale_price_mdl")
    ).toBe(false);
  });

  it("does not diff sale price when neither side has one", () => {
    const product = {
      externalId: "SALE-3",
      sku: "SALE-3",
      name: "No sale",
      description: "",
      regularPriceMdl: 799,
      salePriceMdl: null,
      balance: 1,
      brandExternalId: null,
      categoryExternalIds: [],
      hidden: false,
      deleted: false,
      source: { id: "SALE-3" },
    };
    const variant = {
      productId: "prod_3",
      productTitle: "No sale",
      productDescription: "",
      productStatus: "published",
      productUpdatedAt: new Date(),
      variantId: "variant_3",
      variantTitle: "No sale",
      variantUpdatedAt: new Date(),
      sku: "SALE-3",
      prices: [{ id: "price_3", currencyCode: "mdl", amount: 799, updatedAt: new Date() }],
      salePriceListEntry: null,
    };

    const [comparison] = compareCatalog([product], [variant]);

    expect(
      comparison?.differences.some((diff) => diff.field === "sale_price_mdl")
    ).toBe(false);
  });
});
