import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  getOrderDetailWorkflow,
  getOrdersListWorkflow,
} from "@medusajs/medusa/core-flows";

import { ProductChangeApplication } from "../application/product-change-application";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";
import {
  MedusaOrderDirectory,
  MedusaProductCatalog,
  MedusaSaleDirectory,
  MedusaUserDirectory,
} from "./medusa-directory";
import {
  MedusaCapabilityStore,
  MedusaGovernanceStore,
  MedusaOperationGovernanceStore,
} from "./medusa-governance-store";
import { MedusaProductChangeExecutor } from "./medusa-product-change-executor";
import { MedusaSaleChangeExecutor } from "./medusa-sale-change-executor";
import { MedusaInventoryDirectory } from "./medusa-inventory-directory";
import { MerchandisingApplication } from "../application/merchandising-application";
import { MedusaMerchandisingDirectory } from "./medusa-merchandising-directory";
import { MedusaMerchandisingChangeExecutor } from "./medusa-merchandising-change-executor";
import { PromotionApplication } from "../application/promotion-application";
import { MedusaPromotionDirectory } from "./medusa-promotion-directory";
import { MedusaPromotionChangeExecutor } from "./medusa-promotion-change-executor";
import { ReturnApplication } from "../application/return-application";
import { MedusaReturnDirectory } from "./medusa-return-directory";
import { MedusaReturnChangeExecutor } from "./medusa-return-change-executor";
import { MedusaIdGenerator, SystemClock } from "./system";
import { createOneCSyncAccess } from "@dyllu/medusa-plugin-one-c/access";

export function createProductChangeApplication(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const governanceService = container.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
  const locking = container.resolve(Modules.LOCKING);
  const operationGovernance = new MedusaOperationGovernanceStore(
    governanceService
  );
  const merchandisingDirectory = new MedusaMerchandisingDirectory(query);
  const merchandisingExecutor = new MedusaMerchandisingChangeExecutor(
    container,
    locking
  );
  const promotionDirectory = new MedusaPromotionDirectory(query);
  const promotionExecutor = new MedusaPromotionChangeExecutor(
    container,
    locking
  );
  const returnDirectory = new MedusaReturnDirectory(query);
  const returnExecutor = new MedusaReturnChangeExecutor(container, locking);

  return new ProductChangeApplication({
    users: new MedusaUserDirectory(query),
    capabilities: new MedusaCapabilityStore(governanceService, locking),
    products: new MedusaProductCatalog(query),
    sales: new MedusaSaleDirectory(query),
    inventory: new MedusaInventoryDirectory(query),
    orders: new MedusaOrderDirectory(query, {
      list: async (input) => {
        const { result } = await getOrdersListWorkflow(container).run({
          input,
        });
        return result;
      },
      retrieve: async (input) => {
        const { result } = await getOrderDetailWorkflow(container).run({
          input,
        });
        return result;
      },
    }),
    governance: new MedusaGovernanceStore(governanceService),
    operationGovernance,
    executor: new MedusaProductChangeExecutor(container, locking),
    saleExecutor: new MedusaSaleChangeExecutor(container, locking),
    merchandising: new MerchandisingApplication({
      directory: merchandisingDirectory,
      governance: operationGovernance,
      executor: merchandisingExecutor,
      clock: new SystemClock(),
      ids: new MedusaIdGenerator(),
    }),
    promotions: new PromotionApplication({
      directory: promotionDirectory,
      governance: operationGovernance,
      executor: promotionExecutor,
      clock: new SystemClock(),
      ids: new MedusaIdGenerator(),
    }),
    returns: new ReturnApplication({
      directory: returnDirectory,
      governance: operationGovernance,
      executor: returnExecutor,
      clock: new SystemClock(),
      ids: new MedusaIdGenerator(),
    }),
    clock: new SystemClock(),
    ids: new MedusaIdGenerator(),
    oneCSync: createOneCSyncAccess(container),
  });
}
