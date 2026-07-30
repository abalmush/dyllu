import { Module } from "@medusajs/framework/utils";

import DylluMcpGovernanceModuleService from "./service";

export const DYLLU_MCP_GOVERNANCE_MODULE = "dylluMcpGovernance";

export default Module(DYLLU_MCP_GOVERNANCE_MODULE, {
  service: DylluMcpGovernanceModuleService,
});
