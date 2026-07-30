import { MedusaError } from "@medusajs/framework/utils";

export type DylluMcpModuleOptions = {
  enabled?: boolean;
  bootstrapUserIds?: string[];
  oauth?: {
    allowedClientIds?: string[];
    issuer: string;
    resource: string;
    jwksUri?: string;
    requiredScopes?: string[];
    medusaUserIdClaim?: string;
  };
};

export type ParsedDylluMcpOptions = {
  enabled: boolean;
  bootstrapUserIds: string[];
  oauth: {
    allowedClientIds: string[];
    issuer: string;
    resource: string;
    jwksUri: string;
    protectedResourceMetadataUrl: string;
    requiredScopes: string[];
    medusaUserIdClaim: string;
  } | null;
};

export function parseDylluMcpOptions(options?: DylluMcpModuleOptions) {
  const enabled = options?.enabled === true;
  if (enabled && !options?.oauth) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "OAuth configuration is required when DYLLU MCP is enabled"
    );
  }
  const oauth = options?.oauth ? normalizeOAuthOptions(options.oauth) : null;
  return {
    enabled,
    bootstrapUserIds: [...new Set(options?.bootstrapUserIds ?? [])],
    oauth,
  } satisfies ParsedDylluMcpOptions;
}

function normalizeOAuthOptions(
  options: NonNullable<DylluMcpModuleOptions["oauth"]>
) {
  const issuer = new URL(options.issuer);
  issuer.pathname = issuer.pathname.endsWith("/")
    ? issuer.pathname
    : `${issuer.pathname}/`;
  const resource = new URL(options.resource);
  const protectedResourceMetadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    resource
  );
  const jwksUri = new URL(options.jwksUri ?? ".well-known/jwks.json", issuer);
  if (
    [issuer, resource, protectedResourceMetadataUrl, jwksUri].some(
      (url) => url.protocol !== "https:"
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "OAuth URLs must use HTTPS"
    );
  }
  const requiredScopes = [
    ...new Set(options.requiredScopes ?? ["mcp:connect"]),
  ];
  const allowedClientIds = [...new Set(options.allowedClientIds ?? [])];
  if (allowedClientIds.length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "At least one allowed OAuth client ID is required"
    );
  }
  if (
    allowedClientIds.some(
      (clientId) => !/^[A-Za-z0-9_-]{5,200}$/.test(clientId)
    )
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "OAuth client IDs contain an invalid value"
    );
  }
  if (
    requiredScopes.length === 0 ||
    requiredScopes.some((scope) => !/^[A-Za-z0-9:_./-]{1,100}$/.test(scope))
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "OAuth scopes contain an invalid value"
    );
  }
  return {
    allowedClientIds,
    issuer: issuer.toString(),
    resource: resource.toString(),
    jwksUri: jwksUri.toString(),
    protectedResourceMetadataUrl: protectedResourceMetadataUrl.toString(),
    requiredScopes,
    medusaUserIdClaim:
      options.medusaUserIdClaim ?? "https://dyllu.md/medusa_user_id",
  };
}
