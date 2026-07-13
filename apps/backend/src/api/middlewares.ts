import {
  authenticate,
  defineMiddlewares,
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
  MiddlewaresConfig,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";
import { PolicyOperation } from "@medusajs/framework/utils";

import {
  AiApplyBodySchema,
  AiChatBodySchema,
  CompatibleAccessoriesQuerySchema,
} from "./_shared/contracts";

const adminAuthentication = authenticate("user", [
  "session",
  "bearer",
  "api-key",
]);

function securityHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  res.removeHeader("X-Powered-By");
  res.setHeader(
    "Content-Security-Policy",
    "base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), geolocation=(), microphone=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  return next();
}

const middlewareConfig: MiddlewaresConfig = {
  routes: [
    ...["/*", "/store/*", "/admin/*", "/auth/*"].map((matcher) => ({
      matcher,
      middlewares: [securityHeaders],
    })),
    {
      matcher: "/admin/ai-edit/chat",
      methods: ["POST"],
      bodyParser: { sizeLimit: "32kb" },
      policies: [{ resource: "product", operation: PolicyOperation.read }],
      middlewares: [
        adminAuthentication,
        validateAndTransformBody(AiChatBodySchema),
      ],
    },
    {
      matcher: "/admin/ai-edit/apply",
      methods: ["POST"],
      bodyParser: { sizeLimit: "64kb" },
      policies: [{ resource: "product", operation: PolicyOperation.update }],
      middlewares: [
        adminAuthentication,
        validateAndTransformBody(AiApplyBodySchema),
      ],
    },
    {
      matcher: "/store/compatible-accessories",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(CompatibleAccessoriesQuerySchema, {
          defaults: [],
          isList: false,
        }),
      ],
    },
  ],
};

export default defineMiddlewares(middlewareConfig);
