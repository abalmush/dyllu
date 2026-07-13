import { z } from "@medusajs/framework/zod";

const DEV_JWT_SECRET = "development-jwt-secret-not-for-production-use";
const DEV_COOKIE_SECRET = "development-cookie-secret-not-for-production-use";
const MIN_SECRET_LENGTH = 32;

const optionalString = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional()
);

const optionalBoolean = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return value;
}, z.boolean().optional());

const rawEnvironmentSchema = z
  .object({
    NODE_ENV: z.string().optional(),
    DATABASE_URL: optionalString,
    DATABASE_SSL: optionalBoolean,
    DATABASE_SSL_REJECT_UNAUTHORIZED: optionalBoolean,
    REDIS_URL: optionalString,
    STORE_CORS: optionalString,
    ADMIN_CORS: optionalString,
    AUTH_CORS: optionalString,
    JWT_SECRET: optionalString,
    COOKIE_SECRET: optionalString,
    STOREFRONT_URL: optionalString,
    REVALIDATE_SECRET: optionalString,
    S3_FILE_URL: optionalString,
    S3_ACCESS_KEY_ID: optionalString,
    S3_SECRET_ACCESS_KEY: optionalString,
    S3_REGION: optionalString,
    S3_BUCKET: optionalString,
    S3_ENDPOINT: optionalString,
  })
  .passthrough();

const S3_KEYS = [
  "S3_FILE_URL",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ENDPOINT",
] as const;

const PRODUCTION_REQUIRED_KEYS = [
  "DATABASE_URL",
  "REDIS_URL",
  "STORE_CORS",
  "ADMIN_CORS",
  "AUTH_CORS",
  "JWT_SECRET",
  "COOKIE_SECRET",
  "STOREFRONT_URL",
  "REVALIDATE_SECRET",
  ...S3_KEYS,
] as const;

const BLOCKED_SECRET_VALUES = new Set([
  "secret",
  "supersecret",
  "supersecret-change-me",
  "change-me",
  "changeme",
  DEV_JWT_SECRET,
  DEV_COOKIE_SECRET,
]);
const BLOCKED_SECRET_MARKERS = [
  "development",
  "not-for-production",
  "replace",
  "example",
];

export type S3Environment = {
  fileUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucket: string;
  endpoint: string;
};

export type BackendEnvironment = {
  isProduction: boolean;
  databaseUrl?: string;
  databaseSsl: false | { rejectUnauthorized: boolean };
  redisUrl?: string;
  storeCors: string;
  adminCors: string;
  authCors: string;
  jwtSecret: string;
  cookieSecret: string;
  s3?: S3Environment;
};

export class EnvironmentValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid backend environment:\n- ${issues.join("\n- ")}`);
    this.name = "EnvironmentValidationError";
  }
}

export function parseBackendEnvironment(
  input: NodeJS.ProcessEnv | Record<string, string | undefined>
): BackendEnvironment {
  const parsed = rawEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new EnvironmentValidationError(
      parsed.error.issues.map((issue) => {
        const path = issue.path.join(".") || "environment";
        return `${path}: ${issue.message}`;
      })
    );
  }

  const env = parsed.data;
  const isProduction = env.NODE_ENV === "production";
  const issues: string[] = [];

  if (isProduction) {
    for (const key of PRODUCTION_REQUIRED_KEYS) {
      if (!env[key]) issues.push(`${key} is required in production`);
    }
    if (env.DATABASE_SSL === undefined) {
      issues.push(
        "DATABASE_SSL must be set explicitly in production (true for remote TLS, false only for a private local network)"
      );
    }
  }

  validateServiceUrl(
    env.DATABASE_URL,
    ["postgres:", "postgresql:"],
    "DATABASE_URL",
    issues
  );
  validateServiceUrl(env.REDIS_URL, ["redis:", "rediss:"], "REDIS_URL", issues);

  for (const key of ["STORE_CORS", "ADMIN_CORS", "AUTH_CORS"] as const) {
    if (env[key]) validateCorsOrigins(env[key], key, isProduction, issues);
  }

  if (env.JWT_SECRET)
    validateSecret(env.JWT_SECRET, "JWT_SECRET", isProduction, issues);
  if (env.COOKIE_SECRET) {
    validateSecret(env.COOKIE_SECRET, "COOKIE_SECRET", isProduction, issues);
  }
  if (env.REVALIDATE_SECRET) {
    validateSecret(
      env.REVALIDATE_SECRET,
      "REVALIDATE_SECRET",
      isProduction,
      issues
    );
  }
  if (env.STOREFRONT_URL) {
    validateHttpUrl(env.STOREFRONT_URL, "STOREFRONT_URL", issues);
    if (isProduction && !env.STOREFRONT_URL.startsWith("https://")) {
      issues.push("STOREFRONT_URL must use https: in production");
    }
  }
  if (
    env.JWT_SECRET &&
    env.COOKIE_SECRET &&
    env.JWT_SECRET === env.COOKIE_SECRET
  ) {
    issues.push("JWT_SECRET and COOKIE_SECRET must be distinct");
  }

  const hasAnyS3Value = S3_KEYS.some((key) => Boolean(env[key]));
  if (hasAnyS3Value) {
    for (const key of S3_KEYS) {
      if (!env[key])
        issues.push(`${key} is required when S3 storage is configured`);
    }
    validateHttpUrl(env.S3_FILE_URL, "S3_FILE_URL", issues);
    validateHttpUrl(env.S3_ENDPOINT, "S3_ENDPOINT", issues);
    if (isProduction) {
      for (const key of ["S3_FILE_URL", "S3_ENDPOINT"] as const) {
        if (env[key] && !env[key].startsWith("https://")) {
          issues.push(`${key} must use https: in production`);
        }
      }
    }
  }

  if (issues.length > 0) {
    throw new EnvironmentValidationError([...new Set(issues)]);
  }

  const databaseSslEnabled = env.DATABASE_SSL ?? false;
  const jwtSecret = env.JWT_SECRET ?? DEV_JWT_SECRET;
  const cookieSecret = env.COOKIE_SECRET ?? DEV_COOKIE_SECRET;
  const s3 = hasAnyS3Value
    ? {
        fileUrl: env.S3_FILE_URL!,
        accessKeyId: env.S3_ACCESS_KEY_ID!,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
        region: env.S3_REGION!,
        bucket: env.S3_BUCKET!,
        endpoint: env.S3_ENDPOINT!,
      }
    : undefined;

  return {
    isProduction,
    databaseUrl: env.DATABASE_URL,
    databaseSsl: databaseSslEnabled
      ? {
          rejectUnauthorized: env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? true,
        }
      : false,
    redisUrl: env.REDIS_URL,
    storeCors: env.STORE_CORS ?? "http://localhost:4000,http://localhost:3001",
    adminCors: env.ADMIN_CORS ?? "http://localhost:9000,http://localhost:7001",
    authCors:
      env.AUTH_CORS ??
      "http://localhost:4000,http://localhost:3001,http://localhost:9000",
    jwtSecret,
    cookieSecret,
    s3,
  };
}

function validateServiceUrl(
  value: string | undefined,
  protocols: string[],
  key: string,
  issues: string[]
) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (!protocols.includes(url.protocol)) {
      issues.push(`${key} must use ${protocols.join(" or ")}`);
    }
    if (!url.hostname) issues.push(`${key} must include a hostname`);
  } catch {
    issues.push(`${key} must be a valid URL`);
  }
}

function validateHttpUrl(
  value: string | undefined,
  key: string,
  issues: string[]
) {
  if (!value) return;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      issues.push(`${key} must use http: or https:`);
    }
  } catch {
    issues.push(`${key} must be a valid URL`);
  }
}

function validateCorsOrigins(
  value: string,
  key: string,
  isProduction: boolean,
  issues: string[]
) {
  const origins = value.split(",").map((origin) => origin.trim());
  if (origins.some((origin) => !origin)) {
    issues.push(`${key} must not contain empty origins`);
  }

  for (const origin of origins.filter(Boolean)) {
    if (origin.includes("*")) {
      issues.push(`${key} must contain exact origins, not wildcards`);
      continue;
    }
    try {
      const url = new URL(origin);
      const isHttp = url.protocol === "http:" || url.protocol === "https:";
      const isOriginOnly =
        url.pathname === "/" &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password;
      if (!isHttp || !isOriginOnly) {
        issues.push(`${key} contains an invalid origin: ${origin}`);
      } else if (isProduction && url.protocol !== "https:") {
        issues.push(`${key} production origins must use https: ${origin}`);
      }
    } catch {
      issues.push(`${key} contains an invalid origin: ${origin}`);
    }
  }
}

function validateSecret(
  value: string,
  key: string,
  isProduction: boolean,
  issues: string[]
) {
  if (isProduction && value.length < MIN_SECRET_LENGTH) {
    issues.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters`);
  }
  const normalized = value.toLowerCase();
  if (
    isProduction &&
    (BLOCKED_SECRET_VALUES.has(normalized) ||
      BLOCKED_SECRET_MARKERS.some((marker) => normalized.includes(marker)))
  ) {
    issues.push(`${key} uses a blocked placeholder value`);
  }
}
