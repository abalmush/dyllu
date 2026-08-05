import {
  authenticate,
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { PolicyOperation } from "@medusajs/framework/utils";

import { ManualReceiveRateLimiter } from "./manual-receive-rate-limiter";

const userAuthentication = authenticate("user", [
  "session",
  "bearer",
  "api-key",
]);
const manualReceiveRateLimiter = new ManualReceiveRateLimiter(
  3,
  60_000,
  10_000
);

function limitManualReceive(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const authContext = "auth_context" in req ? req.auth_context : null;
  const actorId =
    authContext && typeof authContext === "object"
      ? Reflect.get(authContext, "actor_id")
      : null;
  if (typeof actorId !== "string") {
    res.status(401).json({ error: "authentication_required" });
    return;
  }
  if (!manualReceiveRateLimiter.consume(actorId, Date.now())) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "manual_receive_rate_limited" });
    return;
  }
  return next();
}

function privateHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  return next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/one-c-sync/mappings",
      methods: ["POST"],
      policies: [{ resource: "product", operation: PolicyOperation.update }],
      middlewares: [privateHeaders, userAuthentication],
    },
    {
      matcher: /^\/admin\/one-c-sync\/runs(?:\/[^/]+(?:\/(?:items|export))?)?$/,
      methods: ["GET"],
      policies: [{ resource: "product", operation: PolicyOperation.read }],
      middlewares: [privateHeaders, userAuthentication],
    },
    {
      matcher: "/admin/one-c-sync/runs",
      methods: ["POST"],
      bodyParser: false,
      policies: [{ resource: "product", operation: PolicyOperation.read }],
      middlewares: [privateHeaders, userAuthentication, limitManualReceive],
    },
    {
      matcher: "/admin/one-c-sync/runs/:id/export",
      methods: ["POST"],
      bodyParser: false,
      policies: [{ resource: "product", operation: PolicyOperation.read }],
      middlewares: [privateHeaders, userAuthentication],
    },
  ],
});
