import jwksClient from "jwks-rsa";

import { SigningKeyProvider } from "./auth0-access-token-verifier";

export class Auth0JwksSigningKeyProvider implements SigningKeyProvider {
  private readonly client;

  constructor(jwksUri: string) {
    this.client = jwksClient({
      cache: true,
      cacheMaxAge: 10 * 60 * 1000,
      cacheMaxEntries: 5,
      jwksRequestsPerMinute: 10,
      jwksUri,
      rateLimit: true,
      timeout: 5_000,
    });
  }

  async getSigningKey(keyId: string) {
    const key = await this.client.getSigningKey(keyId);
    return key.getPublicKey();
  }
}
