import middlewareConfig from "../middlewares";

describe("OAuth protected-resource metadata route", () => {
  it("returns the configured MCP resource metadata", async () => {
    const metadata = {
      resource: "https://api.dyllu.md/mcp",
      authorization_servers: ["https://dyllu.eu.auth0.com/"],
      scopes_supported: ["mcp:connect"],
      resource_documentation: "https://dyllu.md",
    };
    const request = {
      scope: {
        resolve: jest.fn().mockReturnValue({
          isEnabled: jest.fn().mockResolvedValue(true),
          getOAuthResourceMetadata: jest.fn().mockResolvedValue(metadata),
        }),
      },
    };
    const response = {
      removeHeader: jest.fn(),
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const route = middlewareConfig.routes?.find(
      (candidate) =>
        candidate.matcher === "/.well-known/oauth-protected-resource"
    );
    expect(route).toBeDefined();
    const middlewares = route?.middlewares ?? [];

    const dispatch = async (index: number): Promise<void> => {
      const middleware = middlewares[index];
      if (!middleware) return;
      await middleware(request as never, response as never, () =>
        dispatch(index + 1)
      );
    };

    await dispatch(0);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(metadata);
  });
});
