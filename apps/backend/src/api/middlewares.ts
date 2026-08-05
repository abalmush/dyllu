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
  CategoryImageUploadSchema,
  CompatibleAccessoriesQuerySchema,
  NewsletterConfirmationQuerySchema,
  NewsletterSubscriptionSchema,
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
      matcher: "/admin/category-image-uploads",
      methods: ["POST"],
      bodyParser: { sizeLimit: "8mb" },
      policies: [{ resource: "file", operation: PolicyOperation.create }],
      middlewares: [
        adminAuthentication,
        validateAndTransformBody(CategoryImageUploadSchema),
      ],
    },
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
      matcher: "/admin/one-c-connection-test",
      methods: ["POST"],
      bodyParser: false,
      policies: [{ resource: "product", operation: PolicyOperation.read }],
      middlewares: [adminAuthentication],
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
    {
      matcher: "/store/newsletter",
      methods: ["POST"],
      bodyParser: { sizeLimit: "4kb" },
      middlewares: [validateAndTransformBody(NewsletterSubscriptionSchema)],
    },
    {
      matcher: "/newsletter/confirm",
      methods: ["GET"],
      middlewares: [
        validateAndTransformQuery(NewsletterConfirmationQuerySchema, {
          defaults: [],
          isList: false,
        }),
      ],
    },
  ],
};

export default defineMiddlewares(middlewareConfig);
