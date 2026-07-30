import {
  authenticateMcpAuthorization,
  McpAccessTokenVerifier,
} from "../authenticate-mcp-authorization";

describe("authenticateMcpAuthorization", () => {
  it("authenticates an exact Bearer access token", async () => {
    const identity = {
      issuer: "https://dyllu.eu.auth0.com/",
      subject: "auth0|andrei",
      medusaUserId: "user_andrei",
      scopes: ["mcp:connect"],
    };
    const verifier: McpAccessTokenVerifier = {
      verify: jest.fn().mockResolvedValue(identity),
    };

    await expect(
      authenticateMcpAuthorization("Bearer signed-access-token", verifier)
    ).resolves.toEqual(identity);
    expect(verifier.verify).toHaveBeenCalledWith("signed-access-token");
  });
});
