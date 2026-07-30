import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { DYLLU_MCP_GOVERNANCE_MODULE } from "../../../modules/governance";
import { DylluMcpGovernanceModuleService } from "../../../modules/governance/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const governance = req.scope.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
  res.json(await governance.getOAuthResourceMetadata());
}
