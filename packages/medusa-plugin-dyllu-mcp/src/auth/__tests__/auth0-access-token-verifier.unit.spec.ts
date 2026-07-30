import { generateKeyPairSync } from "node:crypto";
import { sign } from "jsonwebtoken";

import { Auth0AccessTokenVerifier } from "../auth0-access-token-verifier";

const issuer = "https://dyllu-test.eu.auth0.com/";
const audience = "https://api.dyllu.md/mcp";
const userIdClaim = "https://dyllu.md/medusa_user_id";
const clientId = "tpc_chatgpt_dyllu";

describe("Auth0AccessTokenVerifier", () => {
  it("accepts a correctly scoped Auth0 token mapped to a Medusa user", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        azp: clientId,
        scope: "openid mcp:connect",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience,
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).resolves.toEqual({
      issuer,
      subject: "auth0|andrei",
      clientId,
      medusaUserId: "user_andrei",
      scopes: ["mcp:connect", "openid"],
    });
  });

  it("accepts the RFC 9068 client identifier claim", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        client_id: clientId,
        scope: "mcp:connect",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience,
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).resolves.toMatchObject({
      clientId,
      medusaUserId: "user_andrei",
    });
  });

  it("rejects an Auth0 identity without a trusted Medusa user mapping", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign({ azp: clientId, scope: "mcp:connect" }, privateKey, {
      algorithm: "RS256",
      audience,
      expiresIn: "5m",
      issuer,
      keyid: "test-key",
      subject: "auth0|unmapped",
    });
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: "identity_mapping_missing",
    });
  });

  it("rejects a token without the required MCP scope", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        azp: clientId,
        scope: "openid",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience,
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: "insufficient_scope",
    });
  });

  it("rejects a token issued for another audience", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        azp: clientId,
        scope: "mcp:connect",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience: "https://api.dyllu.md/another-service",
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("rejects a token issued to a different OAuth client", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        azp: "tpc_untrusted",
        scope: "mcp:connect",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience,
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("rejects a token without an authorized-party claim", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        scope: "mcp:connect",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience,
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  it("rejects conflicting OAuth client identifier claims", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const token = sign(
      {
        azp: clientId,
        client_id: "tpc_another_client",
        scope: "mcp:connect",
        [userIdClaim]: "user_andrei",
      },
      privateKey,
      {
        algorithm: "RS256",
        audience,
        expiresIn: "5m",
        issuer,
        keyid: "test-key",
        subject: "auth0|andrei",
      }
    );
    const verifier = new Auth0AccessTokenVerifier(
      {
        allowedClientIds: [clientId],
        issuer,
        audience,
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: userIdClaim,
      },
      {
        getSigningKey: async () => publicKey,
      }
    );

    await expect(verifier.verify(token)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });
});
