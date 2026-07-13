import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import Redis from "ioredis";

import { logRouteError } from "../_shared/logging";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      connectTimeout: 2_000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
  : null;

redis?.on("error", () => {
  // Readiness reports connection failures; the listener prevents an unhandled
  // EventEmitter error from terminating the process between probes.
});

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Dependency readiness timeout")),
          timeoutMs
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store");

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    await query.graph({
      entity: "store",
      fields: ["id"],
      pagination: { take: 1 },
    });
    if (redis) {
      await withTimeout(redis.ping(), 2_000);
    }
    res.status(200).json({ status: "ready" });
  } catch (error) {
    logRouteError(req, "readiness.failed", error);
    res.status(503).json({ status: "unavailable" });
  }
}
