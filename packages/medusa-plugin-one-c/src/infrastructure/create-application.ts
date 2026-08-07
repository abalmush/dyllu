import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { ApplyOneCUpdatesApplication } from "../application/apply-one-c-updates";
import { OneCSyncApplication } from "../application/one-c-sync-application";
import { ONE_C_SYNC_MODULE } from "../modules/one-c-sync";
import OneCSyncModuleService from "../modules/one-c-sync/service";
import { applyOneCUpdatesWorkflow } from "../workflows/apply-one-c-updates";
import {
  MedusaOneCApplyReader,
  MedusaOneCCatalogReader,
  MedusaOneCSyncStore,
} from "./medusa-adapters";
import { OneCFeedClient } from "./one-c-feed-client";
import { MedusaIdGenerator, SystemClock } from "./system";

async function resolveStockLocationId(container: MedusaContainer) {
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);
  const locations = await stockLocationService.listStockLocations({});
  const location = locations[0];
  if (!location) {
    throw new Error("No Medusa stock location is configured");
  }
  return location.id;
}

export async function createOneCSyncApplication(container: MedusaContainer) {
  const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const stockLocationId = await resolveStockLocationId(container);
  return new OneCSyncApplication({
    feeds: new OneCFeedClient(),
    catalog: new MedusaOneCCatalogReader(
      container.resolve(ContainerRegistrationKeys.QUERY)
    ),
    applyReader: new MedusaOneCApplyReader(
      container.resolve(ContainerRegistrationKeys.QUERY),
      container.resolve(Modules.PRICING),
      container.resolve(Modules.INVENTORY),
      stockLocationId
    ),
    store: new MedusaOneCSyncStore(service),
    ids: new MedusaIdGenerator(),
    clock: new SystemClock(),
  });
}

export async function createApplyOneCUpdatesApplication(
  container: MedusaContainer
) {
  const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const stockLocationId = await resolveStockLocationId(container);
  const store = new MedusaOneCSyncStore(service);
  return new ApplyOneCUpdatesApplication({
    store: {
      createAppliedChanges: (input) => store.createAppliedChanges(input),
      listItems: async (input) => {
        const items = await service.listOneCSyncItems(
          { run_id: input.runId, mapping_status: input.mappingStatus },
          { take: 10_000 }
        );
        return items.map((item) => ({
          id: item.id,
          runId: item.run_id,
          medusaVariantId: item.medusa_variant_id,
          normalized: item.normalized as {
            regularPriceMdl?: number | null;
            salePriceMdl?: number | null;
            balance?: number | null;
          },
        }));
      },
    },
    applyReader: new MedusaOneCApplyReader(
      container.resolve(ContainerRegistrationKeys.QUERY),
      container.resolve(Modules.PRICING),
      container.resolve(Modules.INVENTORY),
      stockLocationId
    ),
    runWorkflow: async (input) => {
      await applyOneCUpdatesWorkflow(container).run({ input });
    },
    stockLocationId,
    ids: new MedusaIdGenerator(),
    clock: new SystemClock(),
  });
}
