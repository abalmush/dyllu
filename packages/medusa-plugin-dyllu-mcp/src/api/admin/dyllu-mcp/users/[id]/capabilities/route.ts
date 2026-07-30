import { randomUUID } from "node:crypto";

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { ApplicationError } from "../../../../../../application/errors";
import { createProductChangeApplication } from "../../../../../../infrastructure/create-application";
import { capabilities, RequestContext } from "../../../../../../domain/types";

const paramsSchema = z.object({
  id: z.string().trim().min(1).max(100),
});
const bodySchema = z
  .object({
    capabilities: z.array(z.enum(capabilities)).max(capabilities.length),
  })
  .strict();

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const boundary = requestBoundary(req);
  const params = paramsSchema.safeParse(req.params);
  if (!boundary || !params.success) {
    res.status(400).json({
      error: "invalid_request",
      message: "A valid actor and user ID are required",
    });
    return;
  }

  try {
    const result = await createProductChangeApplication(
      req.scope
    ).getUserAccess(boundary, params.data.id);
    res.json(result);
  } catch (error) {
    handleError(req, res, boundary, error);
  }
}

export async function PUT(
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) {
  const boundary = requestBoundary(req);
  const params = paramsSchema.safeParse(req.params);
  const body = bodySchema.safeParse(req.body);
  if (!boundary || !params.success || !body.success) {
    res.status(400).json({
      error: "invalid_request",
      message: "A valid actor, user ID and capability list are required",
    });
    return;
  }

  try {
    const result = await createProductChangeApplication(
      req.scope
    ).replaceUserAccess(boundary, {
      userId: params.data.id,
      capabilities: body.data.capabilities,
    });
    res.json(result);
  } catch (error) {
    handleError(req, res, boundary, error);
  }
}

function requestBoundary(
  req: AuthenticatedMedusaRequest
): RequestContext | null {
  const actorId = req.auth_context?.actor_id;
  if (!actorId) {
    return null;
  }
  return {
    actorId,
    requestId: req.requestId ?? randomUUID(),
  };
}

function handleError(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  context: RequestContext,
  error: unknown
) {
  if (error instanceof ApplicationError) {
    const status = error.code === "capability_denied" ? 403 : 404;
    res.status(status).json({ error: error.code, message: error.message });
    return;
  }
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  logger.error(
    JSON.stringify({
      event: "dyllu_mcp.capabilities.failed",
      request_id: context.requestId,
      actor_id: context.actorId,
      error: error instanceof Error ? error.name : "NonErrorThrown",
    })
  );
  res.status(500).json({
    error: "internal_error",
    message: "The capability operation failed",
  });
}
