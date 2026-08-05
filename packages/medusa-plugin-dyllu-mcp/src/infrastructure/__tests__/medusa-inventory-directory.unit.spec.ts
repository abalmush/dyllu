import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaInventoryDirectory } from "../medusa-inventory-directory";

describe("MedusaInventoryDirectory", () => {
  it("returns bounded variant inventory snapshots", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "variant_tools",
          title: "Standard",
          sku: "TOOLS-1",
          manage_inventory: true,
          allow_backorder: false,
          product: {
            id: "prod_tools",
            title: "Trusă de scule",
            status: "published",
          },
          inventory_items: [
            {
              inventory_item_id: "iitem_tools",
              required_quantity: 1,
              inventory: {
                id: "iitem_tools",
                location_levels: [
                  {
                    location_id: "sloc_main",
                    stocked_quantity: 10,
                    reserved_quantity: 2,
                    incoming_quantity: 3,
                    available_quantity: 8,
                    stock_locations: {
                      id: "sloc_main",
                      name: "Main warehouse",
                    },
                  },
                ],
              },
            },
          ],
        },
      ],
      metadata: { count: 1 },
    });
    const directory = new MedusaInventoryDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(directory.list({ limit: 100, offset: 0 })).resolves.toEqual({
      variants: [
        {
          productId: "prod_tools",
          productTitle: "Trusă de scule",
          productStatus: "published",
          variantId: "variant_tools",
          variantTitle: "Standard",
          sku: "TOOLS-1",
          manageInventory: true,
          allowBackorder: false,
          items: [
            {
              inventoryItemId: "iitem_tools",
              requiredQuantity: 1,
              levels: [
                {
                  locationId: "sloc_main",
                  locationName: "Main warehouse",
                  stockedQuantity: 10,
                  reservedQuantity: 2,
                  incomingQuantity: 3,
                  availableQuantity: 8,
                },
              ],
            },
          ],
        },
      ],
      count: 1,
    });
    expect(graph).toHaveBeenCalledWith({
      entity: "variant",
      fields: expect.arrayContaining([
        "inventory_items.inventory.location_levels.available_quantity",
      ]),
      pagination: { take: 100, skip: 0, order: { id: "ASC" } },
    });
  });

  it("fails closed without exact count metadata", async () => {
    const directory = new MedusaInventoryDirectory({
      graph: jest.fn().mockResolvedValue({ data: [] }),
    } as Pick<RemoteQueryFunction, "graph">);

    await expect(directory.list({ limit: 100, offset: 0 })).rejects.toBeDefined();
  });
});
