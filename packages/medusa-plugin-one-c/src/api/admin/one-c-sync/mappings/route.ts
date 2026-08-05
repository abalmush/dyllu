import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { ONE_C_SYNC_MODULE } from "../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../modules/one-c-sync/service";
import { saveOneCProductMappingWorkflow } from "../../../../workflows/save-product-mapping";

const inputSchema = z
  .object({
    sync_item_id: z.string().regex(/^onecitem_[A-Za-z0-9]+$/),
    medusa_sku: z.string().trim().min(1).max(255),
  })
  .strict();

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const input = inputSchema.safeParse(req.body);
  const actorId = req.auth_context?.actor_id;
  if (!input.success)
    return void res.status(400).json({ error: "invalid_mapping" });
  if (!actorId)
    return void res.status(401).json({ error: "authentication_required" });

  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const items = await service.listOneCSyncItems(
    { id: input.data.sync_item_id },
    { take: 1 }
  );
  const item = items[0];
  if (!item || item.hidden || item.deleted) {
    return void res.status(404).json({ error: "sync_item_not_found" });
  }
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  );
  const result = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku"],
    filters: { sku: input.data.medusa_sku },
    pagination: { take: 2 },
  });
  const variants = z
    .array(z.object({ id: z.string(), sku: z.string().nullable() }))
    .parse(result.data);
  if (variants.length !== 1) {
    return void res.status(409).json({ error: "medusa_sku_not_unique" });
  }
  const variant = variants[0]!;
  const conflicts = await service.listOneCProductMappings(
    { medusa_variant_id: variant.id },
    { take: 1 }
  );
  const existing = await service.listOneCProductMappings(
    { external_id: item.external_id },
    { take: 1 }
  );
  if (conflicts[0] && conflicts[0].external_id !== item.external_id) {
    return void res
      .status(409)
      .json({ error: "medusa_variant_already_mapped" });
  }
  const { result: mapping } = await saveOneCProductMappingWorkflow(
    req.scope
  ).run({
    input: {
      existingId: existing[0]?.id ?? null,
      externalId: item.external_id,
      medusaVariantId: variant.id,
      medusaSku: variant.sku!,
      actorId,
    },
  });
  res.status(existing[0] ? 200 : 201).json({
    mapping: { id: mapping.id, medusa_sku: mapping.medusa_sku },
  });
}
