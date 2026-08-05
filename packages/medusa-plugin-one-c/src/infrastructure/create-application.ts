import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { OneCSyncApplication } from "../application/one-c-sync-application";
import { ONE_C_SYNC_MODULE } from "../modules/one-c-sync";
import OneCSyncModuleService from "../modules/one-c-sync/service";
import {
  MedusaOneCCatalogReader,
  MedusaOneCSyncStore,
} from "./medusa-adapters";
import { OneCFeedClient } from "./one-c-feed-client";
import { MedusaIdGenerator, SystemClock } from "./system";

export function createOneCSyncApplication(container: MedusaContainer) {
  const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  return new OneCSyncApplication({
    feeds: new OneCFeedClient(),
    catalog: new MedusaOneCCatalogReader(
      container.resolve(ContainerRegistrationKeys.QUERY)
    ),
    store: new MedusaOneCSyncStore(service),
    ids: new MedusaIdGenerator(),
    clock: new SystemClock(),
  });
}
