import {
  authenticate,
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  PolicyOperation,
} from "@medusajs/framework/utils";

import { McpAuthenticationError } from "../auth/auth0-access-token-verifier";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { ActorRateLimiter } from "./actor-rate-limiter";

const actorRateLimiter = new ActorRateLimiter(120, 60_000, 10_000);
const userAuthentication = authenticate("user", ["session", "bearer"]);
const mcpActorId = Symbol("dylluMcpActorId");

async function requireEnabled(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const governance = req.scope.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
  if (!(await governance.isEnabled())) {
    res.status(503).json({
      error: "mcp_disabled",
      message: "The DYLLU MCP service is disabled",
    });
    return;
  }
  return next();
}

function rateLimitActor(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const actorId = getMcpActorId(req) ?? authenticatedMedusaActorId(req);
  if (!actorId) {
    res.status(401).json({
      error: "authentication_required",
      message: "An authenticated Medusa user is required",
    });
    return;
  }
  if (!actorRateLimiter.consume(actorId, Date.now())) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({
      error: "rate_limited",
      message: "Too many MCP requests",
    });
    return;
  }
  return next();
}

export function getMcpActorId(req: MedusaRequest) {
  const actorId = Reflect.get(req, mcpActorId);
  return typeof actorId === "string" ? actorId : null;
}

function authenticatedMedusaActorId(req: MedusaRequest) {
  if (!("auth_context" in req)) {
    return null;
  }
  const authContext = req.auth_context;
  if (!authContext || typeof authContext !== "object") {
    return null;
  }
  const actorId = Reflect.get(authContext, "actor_id");
  return typeof actorId === "string" ? actorId : null;
}

async function authenticateMcpOAuth(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const governance = req.scope.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
  try {
    const identity = await governance.authenticateMcpAuthorization(
      req.headers.authorization
    );
    Reflect.set(req, mcpActorId, identity.medusaUserId);
    return next();
  } catch (error) {
    const challenge = await governance.getOAuthChallenge();
    const internalErrorCode =
      error instanceof McpAuthenticationError ? error.code : "invalid_token";
    const oauthErrorCode =
      internalErrorCode === "insufficient_scope"
        ? "insufficient_scope"
        : "invalid_token";
    const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
    logger.warn(
      JSON.stringify({
        event: "dyllu_mcp.authentication.denied",
        request_id: req.requestId,
        error_code: internalErrorCode,
      })
    );
    res.setHeader(
      "WWW-Authenticate",
      `${challenge}, error="${oauthErrorCode}", error_description="Authentication is required"`
    );
    res.status(oauthErrorCode === "insufficient_scope" ? 403 : 401).json({
      error: "authentication_required",
      message: "OAuth authentication is required",
    });
  }
}

function setPrivateHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  res.removeHeader("X-Powered-By");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  return next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/mcp",
      methods: ["GET", "POST", "DELETE"],
      bodyParser: { sizeLimit: "128kb" },
      middlewares: [
        setPrivateHeaders,
        requireEnabled,
        authenticateMcpOAuth,
        rateLimitActor,
      ],
    },
    {
      matcher: "/.well-known/oauth-protected-resource",
      methods: ["GET"],
      middlewares: [setPrivateHeaders, requireEnabled],
    },
    {
      matcher: "/admin/dyllu-mcp/users/:id/capabilities",
      methods: ["GET"],
      policies: [{ resource: "user", operation: PolicyOperation.read }],
      middlewares: [
        setPrivateHeaders,
        userAuthentication,
        requireEnabled,
        rateLimitActor,
      ],
    },
    {
      matcher: "/admin/dyllu-mcp/users/:id/capabilities",
      methods: ["PUT"],
      bodyParser: { sizeLimit: "16kb" },
      policies: [{ resource: "user", operation: PolicyOperation.update }],
      middlewares: [
        setPrivateHeaders,
        userAuthentication,
        requireEnabled,
        rateLimitActor,
      ],
    },
  ],
});
