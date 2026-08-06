import {
  EnvironmentValidationError,
  parseBackendEnvironment,
} from "../environment";

function productionEnvironment() {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "postgres://medusa:password@postgres.internal:5432/dyllu",
    DATABASE_SSL: "true",
    REDIS_URL: "rediss://redis.internal:6379",
    STORE_CORS: "https://store.example.com",
    ADMIN_CORS: "https://api.example.com",
    AUTH_CORS: "https://store.example.com,https://api.example.com",
    JWT_SECRET: "jwt-0123456789abcdef0123456789abcdef0123456789abcdef",
    COOKIE_SECRET: "cookie-0123456789abcdef0123456789abcdef0123456789abcdef",
    STOREFRONT_URL: "https://store.example.com",
    REVALIDATE_SECRET:
      "revalidate-0123456789abcdef0123456789abcdef0123456789abcdef",
    S3_FILE_URL: "https://cdn.example.com",
    S3_ACCESS_KEY_ID: "access-key",
    S3_SECRET_ACCESS_KEY: "secret-key",
    S3_REGION: "auto",
    S3_BUCKET: "dyllu-assets",
    S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  };
}

describe("parseBackendEnvironment", () => {
  it("accepts a complete production environment and enables verified TLS", () => {
    const environment = parseBackendEnvironment(productionEnvironment());

    expect(environment.isProduction).toBe(true);
    expect(environment.databaseSsl).toEqual({ rejectUnauthorized: true });
    expect(environment.s3).toEqual({
      fileUrl: "https://cdn.example.com",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
      region: "auto",
      bucket: "dyllu-assets",
      endpoint: "https://account.r2.cloudflarestorage.com",
    });
    expect(environment.mcp).toEqual({
      enabled: false,
      bootstrapUserIds: [],
      oauth: null,
    });
  });

  it("allows an explicit database TLS override", () => {
    const environment = parseBackendEnvironment({
      ...productionEnvironment(),
      DATABASE_SSL: "false",
    });

    expect(environment.databaseSsl).toBe(false);
  });

  it("requires an explicit production database TLS decision", () => {
    const input = productionEnvironment();
    delete (input as Partial<typeof input>).DATABASE_SSL;

    expect(() => parseBackendEnvironment(input)).toThrow(
      /DATABASE_SSL must be set explicitly/
    );
  });

  it("fails closed when production requirements are missing", () => {
    expect(() => parseBackendEnvironment({ NODE_ENV: "production" })).toThrow(
      EnvironmentValidationError
    );

    try {
      parseBackendEnvironment({ NODE_ENV: "production" });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as Error).message).toContain("DATABASE_URL is required");
      expect((error as Error).message).toContain("REDIS_URL is required");
      expect((error as Error).message).toContain("JWT_SECRET is required");
      expect((error as Error).message).toContain("S3_BUCKET is required");
    }
  });

  it("rejects weak or shared secrets and unsafe production CORS", () => {
    const input = {
      ...productionEnvironment(),
      JWT_SECRET: "supersecret",
      COOKIE_SECRET: "supersecret",
      STORE_CORS: "https://*.example.com,http://store.example.com",
    };

    expect(() => parseBackendEnvironment(input)).toThrow(
      /JWT_SECRET must be at least 32 characters/
    );
    expect(() => parseBackendEnvironment(input)).toThrow(
      /JWT_SECRET and COOKIE_SECRET must be distinct/
    );
    expect(() => parseBackendEnvironment(input)).toThrow(/exact origins/);
    expect(() => parseBackendEnvironment(input)).toThrow(/must use https/);
  });

  it("rejects partial S3 configuration outside production too", () => {
    expect(() =>
      parseBackendEnvironment({
        NODE_ENV: "development",
        S3_BUCKET: "assets",
      })
    ).toThrow(/S3_FILE_URL is required when S3 storage is configured/);
  });

  it("enables Resend only when both values are configured", () => {
    const environment = parseBackendEnvironment({
      NODE_ENV: "test",
      RESEND_API_KEY: "re_test",
      RESEND_FROM_EMAIL: "DYLLU <notifications@dyllu.md>",
    });

    expect(environment.resend).toEqual({
      apiKey: "re_test",
      fromEmail: "DYLLU <notifications@dyllu.md>",
    });
    expect(() =>
      parseBackendEnvironment({
        NODE_ENV: "test",
        RESEND_API_KEY: "re_test",
      })
    ).toThrow(/RESEND_FROM_EMAIL is required/);
  });

  it("enables Algolia only when all four values are configured", () => {
    const environment = parseBackendEnvironment({
      NODE_ENV: "test",
      ALGOLIA_APP_ID: "app123",
      ALGOLIA_ADMIN_API_KEY: "admin-key",
      ALGOLIA_SEARCH_API_KEY: "search-key",
      ALGOLIA_PRODUCT_INDEX_NAME: "dyllu_products",
    });

    expect(environment.algolia).toEqual({
      appId: "app123",
      adminApiKey: "admin-key",
      searchApiKey: "search-key",
      indexName: "dyllu_products",
    });
    expect(() =>
      parseBackendEnvironment({
        NODE_ENV: "test",
        ALGOLIA_APP_ID: "app123",
      })
    ).toThrow(
      /ALGOLIA_ADMIN_API_KEY is required when Algolia search is configured/
    );
  });

  it("parses a complete disabled MCP configuration for staged rollout", () => {
    const environment = parseBackendEnvironment({
      ...productionEnvironment(),
      DYLLU_MCP_ENABLED: "false",
      DYLLU_MCP_AUTH0_ISSUER: "https://dyllu.eu.auth0.com",
      DYLLU_MCP_RESOURCE: "https://api.dyllu.md/mcp",
      DYLLU_MCP_ALLOWED_CLIENT_IDS: "tpc_chatgpt,tpc_codex",
      DYLLU_MCP_BOOTSTRAP_USER_IDS: "user_ANDREI,user_ANDREI",
    });

    expect(environment.mcp).toEqual({
      enabled: false,
      bootstrapUserIds: ["user_ANDREI"],
      oauth: {
        issuer: "https://dyllu.eu.auth0.com",
        resource: "https://api.dyllu.md/mcp",
        allowedClientIds: ["tpc_chatgpt", "tpc_codex"],
      },
    });
  });

  it("fails closed when MCP is enabled without complete configuration", () => {
    expect(() =>
      parseBackendEnvironment({
        ...productionEnvironment(),
        DYLLU_MCP_ENABLED: "true",
      })
    ).toThrow(/DYLLU_MCP_AUTH0_ISSUER is required/);
  });

  it("rejects unsafe MCP URLs and identifiers", () => {
    const input = {
      ...productionEnvironment(),
      DYLLU_MCP_ENABLED: "true",
      DYLLU_MCP_AUTH0_ISSUER: "http://dyllu.eu.auth0.com",
      DYLLU_MCP_RESOURCE: "https://api.dyllu.md/mcp",
      DYLLU_MCP_ALLOWED_CLIENT_IDS: "bad client",
      DYLLU_MCP_BOOTSTRAP_USER_IDS: "not-a-user",
    };

    expect(() => parseBackendEnvironment(input)).toThrow(
      /DYLLU_MCP_AUTH0_ISSUER must use https:/
    );
    expect(() => parseBackendEnvironment(input)).toThrow(
      /DYLLU_MCP_ALLOWED_CLIENT_IDS contains an invalid client ID/
    );
  });

  it("uses distinct development-only defaults without enabling TLS", () => {
    const environment = parseBackendEnvironment({ NODE_ENV: "test" });

    expect(environment.isProduction).toBe(false);
    expect(environment.databaseSsl).toBe(false);
    expect(environment.jwtSecret).not.toBe(environment.cookieSecret);
    expect(environment.s3).toBeUndefined();
    expect(environment.resend).toBeUndefined();
    expect(environment.algolia).toBeUndefined();
    expect(environment.mcp).toEqual({
      enabled: false,
      bootstrapUserIds: [],
      oauth: null,
    });
  });
});
