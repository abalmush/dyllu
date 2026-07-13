import { loadEnv, defineConfig } from "@medusajs/framework/utils";

import { parseBackendEnvironment } from "./src/config/environment";

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const environment = parseBackendEnvironment(process.env);

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: environment.databaseUrl,
    redisUrl: environment.redisUrl,
    databaseDriverOptions: {
      connection: { ssl: environment.databaseSsl },
    },
    http: {
      storeCors: environment.storeCors,
      adminCors: environment.adminCors,
      authCors: environment.authCors,
      jwtSecret: environment.jwtSecret,
      cookieSecret: environment.cookieSecret,
    },
  },
  admin: {
    path: "/backend",
  },
  modules: [
    ...(environment.redisUrl
      ? [
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: {
              redisUrl: environment.redisUrl,
              jobOptions: {
                removeOnComplete: { age: 3_600, count: 1_000 },
                removeOnFail: { age: 86_400, count: 5_000 },
              },
            },
          },
          {
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: { redis: { redisUrl: environment.redisUrl } },
          },
          {
            resolve: "@medusajs/medusa/locking",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/locking-redis",
                  id: "locking-redis",
                  is_default: true,
                  options: { redisUrl: environment.redisUrl },
                },
              ],
            },
          },
        ]
      : []),
    ...(environment.s3
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: environment.s3.fileUrl,
                    access_key_id: environment.s3.accessKeyId,
                    secret_access_key: environment.s3.secretAccessKey,
                    region: environment.s3.region,
                    bucket: environment.s3.bucket,
                    endpoint: environment.s3.endpoint,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
});
