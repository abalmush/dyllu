import { randomUUID } from "node:crypto";

import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

import { createOneCSyncApplication } from "../../../../infrastructure/create-application";
import { ONE_C_SYNC_MODULE } from "../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../modules/one-c-sync/service";
import { listQuerySchema, listRuns } from "../../../read-model";

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = listQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  res.json(
    await listRuns(service, {
      limit: query.data.limit,
      offset: query.data.offset,
    })
  );
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const actorId = req.auth_context?.actor_id;
  if (!actorId) {
    res.status(401).json({ error: "authentication_required" });
    return;
  }
  const locking = req.scope.resolve(Modules.LOCKING);
  try {
    const result = await locking.execute(
      "dyllu-one-c:receive",
      () =>
        createOneCSyncApplication(req.scope).receive({
          actorId,
          requestId: req.requestId ?? randomUUID(),
          trigger: "manual",
        }),
      { timeout: 1 }
    );
    res.status(201).json({ run: result });
  } catch (error) {
    res.status(502).json({
      error: "one_c_receive_failed",
      message: error instanceof Error ? error.message : "1C receive failed",
    });
  }
}
