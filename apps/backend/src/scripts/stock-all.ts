import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

const STOCK_QUANTITY = 1000;

export default async function stockAll({ container }: ExecArgs) {
  const inventoryService = container.resolve(Modules.INVENTORY);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);

  const locations = await stockLocationService.listStockLocations({});
  if (!locations.length) {
    throw new Error("no stock location found");
  }
  const locationId = locations[0].id;

  const items = await inventoryService.listInventoryItems({}, { take: null });
  const existing = await inventoryService.listInventoryLevels(
    { location_id: locationId },
    { take: null }
  );
  const stockedItemIds = new Set(existing.map((l) => l.inventory_item_id));

  const toCreate = items
    .filter((item) => !stockedItemIds.has(item.id))
    .map((item) => ({
      inventory_item_id: item.id,
      location_id: locationId,
      stocked_quantity: STOCK_QUANTITY,
    }));

  console.log(
    `location=${locations[0].name} items=${items.length} ` +
      `alreadyStocked=${stockedItemIds.size} creating=${toCreate.length}`
  );

  if (toCreate.length) {
    await inventoryService.createInventoryLevels(toCreate);
  }

  console.log(`done — set stocked_quantity=${STOCK_QUANTITY} on ${toCreate.length} items`);
}
