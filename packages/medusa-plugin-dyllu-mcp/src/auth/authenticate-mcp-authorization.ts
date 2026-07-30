import {
  AuthenticatedMcpIdentity,
  McpAuthenticationError,
} from "./auth0-access-token-verifier";

export interface McpAccessTokenVerifier {
  verify(token: string): Promise<AuthenticatedMcpIdentity>;
}

export async function authenticateMcpAuthorization(
  authorization: string | undefined,
  verifier: McpAccessTokenVerifier
) {
  if (!authorization) {
    throw new McpAuthenticationError("invalid_token");
  }
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match?.[1]) {
    throw new McpAuthenticationError("invalid_token");
  }
  return verifier.verify(match[1]);
}
