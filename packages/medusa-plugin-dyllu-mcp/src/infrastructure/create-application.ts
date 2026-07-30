import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import { ProductChangeApplication } from "../application/product-change-application";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";
import { MedusaProductCatalog, MedusaUserDirectory } from "./medusa-directory";
import {
  MedusaCapabilityStore,
  MedusaGovernanceStore,
} from "./medusa-governance-store";
import { MedusaProductChangeExecutor } from "./medusa-product-change-executor";
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
    governance: new MedusaGovernanceStore(governanceService),
    executor: new MedusaProductChangeExecutor(container, locking),
    clock: new SystemClock(),
    ids: new MedusaIdGenerator(),
  });
}
