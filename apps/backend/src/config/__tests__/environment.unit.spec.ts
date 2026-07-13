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

  it("uses distinct development-only defaults without enabling TLS", () => {
    const environment = parseBackendEnvironment({ NODE_ENV: "test" });

    expect(environment.isProduction).toBe(false);
    expect(environment.databaseSsl).toBe(false);
    expect(environment.jwtSecret).not.toBe(environment.cookieSecret);
    expect(environment.s3).toBeUndefined();
  });
});
