import {
  JwtHeader,
  JwtPayload,
  Secret,
  SigningKeyCallback,
  verify,
} from "jsonwebtoken";

const MAX_TOKEN_LENGTH = 16_384;

export type Auth0VerifierOptions = {
  allowedClientIds: string[];
  issuer: string;
  audience: string;
  requiredScopes: string[];
  medusaUserIdClaim: string;
};

export type AuthenticatedMcpIdentity = {
  issuer: string;
  subject: string;
  clientId: string;
  medusaUserId: string;
  scopes: string[];
};

export interface SigningKeyProvider {
  getSigningKey(keyId: string): Promise<Secret>;
}

export class McpAuthenticationError extends Error {
  constructor(
    public readonly code:
      | "invalid_token"
      | "insufficient_scope"
      | "identity_mapping_missing"
  ) {
    super("MCP authentication failed");
    this.name = "McpAuthenticationError";
  }
}

export class Auth0AccessTokenVerifier {
  private readonly allowedClientIds: ReadonlySet<string>;

  constructor(
    private readonly options: Auth0VerifierOptions,
    private readonly signingKeys: SigningKeyProvider
  ) {
    this.allowedClientIds = new Set(options.allowedClientIds);
  }

  async verify(token: string): Promise<AuthenticatedMcpIdentity> {
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      throw new McpAuthenticationError("invalid_token");
    }

    const payload = await this.verifySignature(token);
    const subject = payload.sub;
    const authorizedParty = payload.azp;
    const profileClientId = payload.client_id;
    if (
      typeof authorizedParty === "string" &&
      typeof profileClientId === "string" &&
      authorizedParty !== profileClientId
    ) {
      throw new McpAuthenticationError("invalid_token");
    }
    const clientId =
      typeof authorizedParty === "string" ? authorizedParty : profileClientId;
    const medusaUserId = payload[this.options.medusaUserIdClaim];
    const scopes =
      typeof payload.scope === "string"
        ? [...new Set(payload.scope.split(/\s+/).filter(Boolean))].sort()
        : [];

    if (
      typeof subject !== "string" ||
      typeof clientId !== "string" ||
      !this.allowedClientIds.has(clientId) ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      throw new McpAuthenticationError("invalid_token");
    }
    if (
      typeof medusaUserId !== "string" ||
      medusaUserId.length === 0 ||
      medusaUserId.length > 100
    ) {
      throw new McpAuthenticationError("identity_mapping_missing");
    }
    if (
      this.options.requiredScopes.some((required) => !scopes.includes(required))
    ) {
      throw new McpAuthenticationError("insufficient_scope");
    }

    return {
      issuer: this.options.issuer,
      subject,
      clientId,
      medusaUserId,
      scopes,
    };
  }

  private verifySignature(token: string) {
    return new Promise<JwtPayload>((resolve, reject) => {
      verify(
        token,
        this.resolveSigningKey,
        {
          algorithms: ["RS256"],
          audience: this.options.audience,
          clockTolerance: 5,
          issuer: this.options.issuer,
        },
        (error, decoded) => {
          if (
            error ||
            !decoded ||
            typeof decoded === "string" ||
            Array.isArray(decoded)
          ) {
            reject(new McpAuthenticationError("invalid_token"));
            return;
          }
          resolve(decoded);
        }
      );
    });
  }

  private readonly resolveSigningKey = (
    header: JwtHeader,
    callback: SigningKeyCallback
  ) => {
    if (
      header.alg !== "RS256" ||
      typeof header.kid !== "string" ||
      header.kid.length === 0
    ) {
      callback(new McpAuthenticationError("invalid_token"));
      return;
    }
    this.signingKeys.getSigningKey(header.kid).then(
      (key) => callback(null, key),
      () => callback(new McpAuthenticationError("invalid_token"))
    );
  };
}
