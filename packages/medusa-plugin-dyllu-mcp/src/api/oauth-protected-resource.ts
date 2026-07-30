import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export async function handleOAuthProtectedResourceMetadata(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const governance = req.scope.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
  res.status(200).json(await governance.getOAuthResourceMetadata());
}
