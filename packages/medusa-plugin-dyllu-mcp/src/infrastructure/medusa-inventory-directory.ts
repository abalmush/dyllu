import { RemoteQueryFunction } from "@medusajs/framework/types";
import { z } from "@medusajs/framework/zod";

import { InventoryDirectory } from "../application/ports";

const numericSchema = z.preprocess((value) => {
  if (typeof value === "object" && value !== null) {
    if ("numeric" in value) {
      return Number(value.numeric);
    }
    if ("value" in value) {
      return Number(value.value);
    }
  }
  return Number(value);
}, z.number().finite());

const inventoryVariantSchema = z.object({
  id: z.string(),
  title: z.string(),
  sku: z.string().nullable(),
  manage_inventory: z.boolean(),
  allow_backorder: z.boolean(),
  product: z.object({
    id: z.string(),
    title: z.string(),
    status: z.string(),
  }),
  inventory_items: z
    .array(
      z.object({
        inventory_item_id: z.string(),
        required_quantity: numericSchema,
        inventory: z.object({
          id: z.string(),
          location_levels: z
            .array(
              z.object({
                location_id: z.string(),
                stocked_quantity: numericSchema,
                reserved_quantity: numericSchema,
                incoming_quantity: numericSchema,
                available_quantity: numericSchema,
                stock_locations: z
                  .object({ id: z.string(), name: z.string() })
                  .nullable()
                  .optional(),
              })
            )
            .optional(),
        }),
      })
    )
    .optional(),
});

export class MedusaInventoryDirectory implements InventoryDirectory {
  constructor(private readonly query: Pick<RemoteQueryFunction, "graph">) {}

  async list(input: { limit: number; offset: number }) {
    const { data, metadata } = await this.query.graph({
      entity: "variant",
      fields: inventoryVariantFields,
      pagination: {
        take: input.limit,
        skip: input.offset,
        order: { id: "ASC" },
      },
    });
    return {
      variants: z
        .array(inventoryVariantSchema)
        .parse(data)
        .map((variant) => ({
          productId: variant.product.id,
          productTitle: variant.product.title,
          productStatus: variant.product.status,
          variantId: variant.id,
          variantTitle: variant.title,
          sku: variant.sku,
          manageInventory: variant.manage_inventory,
          allowBackorder: variant.allow_backorder,
          items: (variant.inventory_items ?? []).map((item) => ({
            inventoryItemId: item.inventory_item_id,
            requiredQuantity: item.required_quantity,
            levels: (item.inventory.location_levels ?? []).map((level) => ({
              locationId: level.location_id,
              locationName:
                level.stock_locations?.name ?? level.location_id,
              stockedQuantity: level.stocked_quantity,
              reservedQuantity: level.reserved_quantity,
              incomingQuantity: level.incoming_quantity,
              availableQuantity: level.available_quantity,
            })),
          })),
        })),
      count: z.number().int().nonnegative().parse(metadata?.count),
    };
  }
}

const inventoryVariantFields = [
  "id",
  "title",
  "sku",
  "manage_inventory",
  "allow_backorder",
  "product.id",
  "product.title",
  "product.status",
  "inventory_items.inventory_item_id",
  "inventory_items.required_quantity",
  "inventory_items.inventory.id",
  "inventory_items.inventory.location_levels.location_id",
  "inventory_items.inventory.location_levels.stocked_quantity",
  "inventory_items.inventory.location_levels.reserved_quantity",
  "inventory_items.inventory.location_levels.incoming_quantity",
  "inventory_items.inventory.location_levels.available_quantity",
  "inventory_items.inventory.location_levels.stock_locations.id",
  "inventory_items.inventory.location_levels.stock_locations.name",
];
