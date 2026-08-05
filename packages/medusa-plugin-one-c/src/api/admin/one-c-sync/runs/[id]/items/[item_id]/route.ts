import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import { ONE_C_SYNC_MODULE } from "../../../../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../../../../modules/one-c-sync/service";
import { itemDto, runIdSchema } from "../../../../../../read-model";

const itemIdSchema = z.string().regex(/^onecitem_[A-Za-z0-9]+$/);

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const runId = runIdSchema.safeParse(req.params.id);
  const itemId = itemIdSchema.safeParse(req.params.item_id);
  if (!runId.success || !itemId.success) {
    return void res.status(400).json({ error: "invalid_item" });
  }
  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const items = await service.listOneCSyncItems(
    { id: itemId.data, run_id: runId.data },
    { take: 1 }
  );
  const item = items[0];
  if (!item) return void res.status(404).json({ error: "item_not_found" });
  res.json({
    item: {
      ...itemDto(item),
      source: item.source,
      normalized: item.normalized,
    },
  });
}
