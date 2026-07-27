import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const databaseHost = new URL(databaseUrl).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(databaseHost)) {
  throw new Error("catalog:sync:local only accepts a local database");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("catalog:sync:local cannot run in production");
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backendDirectory = resolve(repositoryRoot, "apps/backend");
const source = "source=../../outputs/catalog-latest.medusa.json";
const baseArgs = [
  "exec",
  "medusa",
  "exec",
  "./src/scripts/dyllu-sync-catalog-details.ts",
  source,
];

for (const dryRun of ["true", "false"]) {
  const result = spawnSync("pnpm", [...baseArgs, `dryRun=${dryRun}`], {
    cwd: backendDirectory,
    env: process.env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(
      `Catalog ${dryRun === "true" ? "preview" : "apply"} failed`
    );
  }
}
