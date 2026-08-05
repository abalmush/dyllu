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
import { MedusaIdGenerator, SystemClock } from "./system";

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
    clock: new SystemClock(),
    ids: new MedusaIdGenerator(),
  });
}
