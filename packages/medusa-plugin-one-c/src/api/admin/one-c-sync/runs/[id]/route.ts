import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { ONE_C_SYNC_MODULE } from "../../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../../modules/one-c-sync/service";
import { getRun, runIdSchema } from "../../../../read-model";

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const runId = runIdSchema.safeParse(req.params.id);
  if (!runId.success) {
    res.status(400).json({ error: "run_id_required" });
    return;
  }
  const run = await getRun(service, runId.data);
  if (!run) {
    res.status(404).json({ error: "run_not_found" });
    return;
  }
  res.json({ run });
}
