import { randomUUID } from "node:crypto";

import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { createProductChangeApplication } from "../../infrastructure/create-application";
import { createDylluMcpServer } from "../../mcp/server";
import { dylluMcpSessions } from "../../mcp/session-registry";
import { getMcpActorId } from "../middlewares";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../../modules/governance";
import { DylluMcpGovernanceModuleService } from "../../modules/governance/service";

async function handle(req: MedusaRequest<unknown>, res: MedusaResponse) {
  const actorId = getMcpActorId(req);
  if (!actorId) {
    res.status(401).json({
      error: "authentication_required",
      message: "An authenticated DYLLU user is required",
    });
    return;
  }

  const requestId = req.requestId ?? randomUUID();
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    const governance = req.scope.resolve<DylluMcpGovernanceModuleService>(
      DYLLU_MCP_GOVERNANCE_MODULE
    );
    const oauthMetadata = await governance.getOAuthResourceMetadata();
    await dylluMcpSessions.handle(
      req,
      res,
      {
        actorId,
        requestId,
      },
      (getContext) =>
        createDylluMcpServer(
          createProductChangeApplication(req.scope),
          getContext,
          logger,
          oauthMetadata.scopes_supported
        )
    );
  } catch (error) {
    logger.error(
      JSON.stringify({
        event: "dyllu_mcp.request.failed",
        request_id: requestId,
        actor_id: actorId,
        error: error instanceof Error ? error.name : "NonErrorThrown",
      })
    );
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "The DYLLU MCP request failed",
        },
        id: null,
      });
    }
  }
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
