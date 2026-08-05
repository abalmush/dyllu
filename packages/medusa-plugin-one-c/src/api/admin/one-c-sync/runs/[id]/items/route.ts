import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";

import { ONE_C_SYNC_MODULE } from "../../../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../../../modules/one-c-sync/service";
import {
  listItems,
  listQuerySchema,
  runIdSchema,
} from "../../../../../read-model";

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = listQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }
  const runId = runIdSchema.safeParse(req.params.id);
  if (!runId.success) {
    res.status(400).json({ error: "run_id_required" });
    return;
  }
  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  res.json(
    await listItems(service, {
      runId: runId.data,
      mappingStatus: query.data.mapping_status,
      limit: query.data.limit,
      offset: query.data.offset,
    })
  );
}
