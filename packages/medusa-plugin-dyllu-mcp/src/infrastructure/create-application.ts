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
import { MedusaIdGenerator, SystemClock } from "./system";

export function createProductChangeApplication(container: MedusaContainer) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const governanceService = container.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
  const locking = container.resolve(Modules.LOCKING);

  return new ProductChangeApplication({
    users: new MedusaUserDirectory(query),
    capabilities: new MedusaCapabilityStore(governanceService, locking),
    products: new MedusaProductCatalog(query),
    sales: new MedusaSaleDirectory(query),
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
    operationGovernance: new MedusaOperationGovernanceStore(governanceService),
    executor: new MedusaProductChangeExecutor(container, locking),
    saleExecutor: new MedusaSaleChangeExecutor(container, locking),
    clock: new SystemClock(),
    ids: new MedusaIdGenerator(),
  });
}
