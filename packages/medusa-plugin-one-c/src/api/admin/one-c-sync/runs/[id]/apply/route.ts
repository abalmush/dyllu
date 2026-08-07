import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { createApplyOneCUpdatesApplication } from "../../../../../../infrastructure/create-application";
import { runIdSchema } from "../../../../../read-model";

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const runId = runIdSchema.safeParse(req.params.id);
  const actorId = req.auth_context?.actor_id;
  if (!runId.success) {
    return void res.status(400).json({ error: "invalid_run" });
  }
  if (!actorId) {
    return void res.status(401).json({ error: "authentication_required" });
  }
  const application = await createApplyOneCUpdatesApplication(req.scope);
  const result = await application.applyRun({ runId: runId.data, actorId });
  res.status(200).json({
    applied_count: result.appliedCount,
    flagged_count: result.flaggedCount,
    failed_count: result.failedCount,
  });
}
