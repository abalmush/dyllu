import { MedusaRequest } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

type RequestWithOptionalAuth = MedusaRequest & {
  auth_context?: { actor_id?: string };
};

export function logRouteError(
  req: MedusaRequest,
  event: string,
  error: unknown
) {
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const normalized = normalizeError(error);
  const authRequest = req as RequestWithOptionalAuth;

  logger.error(
    JSON.stringify({
      event,
      request_id: req.requestId,
      method: req.method,
      path: req.path,
      actor_id: authRequest.auth_context?.actor_id,
      error: normalized,
    })
  );
}

function normalizeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { name: "UnknownError", message: String(error) };
}
