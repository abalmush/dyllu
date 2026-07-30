import { parseDylluMcpOptions } from "../options";

describe("parseDylluMcpOptions", () => {
  it("fails closed when MCP is enabled without complete OAuth configuration", () => {
    expect(() =>
      parseDylluMcpOptions({
        enabled: true,
        bootstrapUserIds: ["user_andrei"],
      })
    ).toThrow("OAuth configuration is required when DYLLU MCP is enabled");
  });

  it("normalizes a minimal HTTPS Auth0 configuration", () => {
    expect(
      parseDylluMcpOptions({
        enabled: true,
        bootstrapUserIds: ["user_andrei", "user_andrei"],
        oauth: {
          allowedClientIds: ["tpc_chatgpt", "tpc_chatgpt"],
          issuer: "https://dyllu.eu.auth0.com",
          resource: "https://api.dyllu.md/mcp",
        },
      })
    ).toEqual({
      enabled: true,
      bootstrapUserIds: ["user_andrei"],
      oauth: {
        allowedClientIds: ["tpc_chatgpt"],
        issuer: "https://dyllu.eu.auth0.com/",
        resource: "https://api.dyllu.md/mcp",
        jwksUri: "https://dyllu.eu.auth0.com/.well-known/jwks.json",
        protectedResourceMetadataUrl:
          "https://api.dyllu.md/.well-known/oauth-protected-resource",
        requiredScopes: ["mcp:connect"],
        medusaUserIdClaim: "https://dyllu.md/medusa_user_id",
      },
    });
  });

  it("rejects non-HTTPS OAuth endpoints", () => {
    expect(() =>
      parseDylluMcpOptions({
        enabled: true,
        oauth: {
          allowedClientIds: ["tpc_chatgpt"],
          issuer: "http://dyllu.eu.auth0.com",
          resource: "https://api.dyllu.md/mcp",
        },
      })
    ).toThrow("OAuth URLs must use HTTPS");
  });

  it("rejects unsafe OAuth scope values", () => {
    expect(() =>
      parseDylluMcpOptions({
        enabled: true,
        oauth: {
          allowedClientIds: ["tpc_chatgpt"],
          issuer: "https://dyllu.eu.auth0.com",
          resource: "https://api.dyllu.md/mcp",
          requiredScopes: ['mcp:connect"'],
        },
      })
    ).toThrow("OAuth scopes contain an invalid value");
  });

  it("requires an explicit OAuth client allowlist", () => {
    expect(() =>
      parseDylluMcpOptions({
        enabled: true,
        oauth: {
          issuer: "https://dyllu.eu.auth0.com",
          resource: "https://api.dyllu.md/mcp",
        },
      })
    ).toThrow("At least one allowed OAuth client ID is required");
  });
});
