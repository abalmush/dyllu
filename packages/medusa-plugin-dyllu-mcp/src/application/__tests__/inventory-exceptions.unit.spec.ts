import { InventoryVariantSnapshot } from "../../domain/types";
import { createInventoryExceptionReport } from "../inventory-exceptions";

const baseVariant: InventoryVariantSnapshot = {
  productId: "prod_tools",
  productTitle: "Trusă de scule",
  productStatus: "published",
  variantId: "variant_tools",
  variantTitle: "Standard",
  sku: "TOOLS-1",
  manageInventory: true,
  allowBackorder: false,
  items: [],
};

describe("createInventoryExceptionReport", () => {
  it("finds missing, low, negative, and reservation inventory exceptions", () => {
    const variants: InventoryVariantSnapshot[] = [
      { ...baseVariant, variantId: "variant_unmanaged", manageInventory: false },
      { ...baseVariant, variantId: "variant_missing", sku: "MISS-1" },
      {
        ...baseVariant,
        variantId: "variant_low",
        sku: "LOW-1",
        items: [
          {
            inventoryItemId: "iitem_low",
            requiredQuantity: 1,
            levels: [
              {
                locationId: "sloc_main",
                locationName: "Main",
                stockedQuantity: 5,
                reservedQuantity: 2,
                incomingQuantity: 0,
                availableQuantity: 3,
              },
            ],
          },
        ],
      },
      {
        ...baseVariant,
        variantId: "variant_negative",
        sku: "NEG-1",
        items: [
          {
            inventoryItemId: "iitem_negative",
            requiredQuantity: 1,
            levels: [
              {
                locationId: "sloc_main",
                locationName: "Main",
                stockedQuantity: 2,
                reservedQuantity: 4,
                incomingQuantity: 0,
                availableQuantity: -2,
              },
            ],
          },
        ],
      },
    ];

    expect(
      createInventoryExceptionReport(variants, {
        lowStockThreshold: 5,
        resultLimit: 20,
        publishedOnly: true,
      })
    ).toMatchObject({
      scannedVariantCount: 4,
      managedVariantCount: 3,
      variantsWithExceptions: 3,
      exceptionCounts: {
        missing_inventory_item: 1,
        negative_available: 1,
        out_of_stock: 1,
        low_stock: 1,
        reservation_exceeds_stock: 1,
      },
      resultsTruncated: false,
      variants: [
        {
          variantId: "variant_missing",
          availableQuantity: null,
          codes: ["missing_inventory_item"],
        },
        {
          variantId: "variant_low",
          availableQuantity: 3,
          codes: ["low_stock"],
        },
        {
          variantId: "variant_negative",
          availableQuantity: -2,
          codes: [
            "negative_available",
            "out_of_stock",
            "reservation_exceeds_stock",
          ],
        },
      ],
    });
  });

  it("excludes non-published products when requested", () => {
    const variants = [
      { ...baseVariant, productStatus: "draft", variantId: "variant_draft" },
    ];

    expect(
      createInventoryExceptionReport(variants, {
        lowStockThreshold: 5,
        resultLimit: 20,
        publishedOnly: true,
      })
    ).toMatchObject({ scannedVariantCount: 0, variantsWithExceptions: 0 });
  });
});
