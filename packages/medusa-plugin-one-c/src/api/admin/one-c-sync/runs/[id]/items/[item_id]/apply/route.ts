import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import { createApplyOneCUpdatesApplication } from "../../../../../../../../infrastructure/create-application";
import { ONE_C_SYNC_MODULE } from "../../../../../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../../../../../modules/one-c-sync/service";
import { runIdSchema } from "../../../../../../../read-model";

const itemIdSchema = z.string().regex(/^onecitem_[A-Za-z0-9]+$/);

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const runId = runIdSchema.safeParse(req.params.id);
  const itemId = itemIdSchema.safeParse(req.params.item_id);
  const actorId = req.auth_context?.actor_id;
  if (!runId.success || !itemId.success) {
    return void res.status(400).json({ error: "invalid_item" });
  }
  if (!actorId) {
    return void res.status(401).json({ error: "authentication_required" });
  }
  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const items = await service.listOneCSyncItems(
    { id: itemId.data, run_id: runId.data, mapping_status: "matched" },
    { take: 1 }
  );
  const item = items[0];
  if (!item) return void res.status(404).json({ error: "item_not_found" });

  const application = await createApplyOneCUpdatesApplication(req.scope);
  const outcome = await application.applyItem({
    item: {
      id: item.id,
      runId: item.run_id,
      medusaVariantId: item.medusa_variant_id,
      normalized: item.normalized as {
        regularPriceMdl?: number | null;
        salePriceMdl?: number | null;
        balance?: number | null;
      },
    },
    actorId,
  });
  res.status(200).json({ outcome });
}
