import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { RemoteQueryFunction } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { z } from "@medusajs/framework/zod";

import { planExactProductMappings } from "../../../../../application/plan-product-mappings";
import { ONE_C_SYNC_MODULE } from "../../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../../modules/one-c-sync/service";
import { saveOneCProductMappingsWorkflow } from "../../../../../workflows/save-product-mappings";

const runInputSchema = z
  .object({ run_id: z.string().regex(/^onecrun_[A-Za-z0-9]+$/) })
  .strict();

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const input = runInputSchema.safeParse(req.query);
  if (!input.success)
    return void res.status(400).json({ error: "invalid_run" });
  const plan = await loadPlan(req, input.data.run_id);
  res.json(preview(plan));
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const input = runInputSchema.safeParse(req.body);
  const actorId = req.auth_context?.actor_id;
  if (!input.success)
    return void res.status(400).json({ error: "invalid_run" });
  if (!actorId)
    return void res.status(401).json({ error: "authentication_required" });
  const plan = await loadPlan(req, input.data.run_id);
  await saveOneCProductMappingsWorkflow(req.scope).run({
    input: {
      actorId,
      mappings: plan.mappings.map((mapping) => ({
        externalId: mapping.externalId,
        medusaVariantId: mapping.medusaVariantId,
        medusaSku: mapping.medusaSku,
      })),
    },
  });
  res.status(201).json({
    mapped_count: plan.mappings.length,
    skipped_count: plan.skippedCount,
  });
}

async function loadPlan(req: AuthenticatedMedusaRequest, runId: string) {
  const service = req.scope.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);
  const items = await service.listOneCSyncItems(
    { run_id: runId, mapping_status: "missing_medusa" },
    { take: 10_000 }
  );
  const candidates = items.map((item) => {
    const normalized = item.normalized as Record<string, unknown>;
    return {
      id: item.id,
      externalId: item.external_id,
      name: item.name,
      suggestedMedusaSku:
        typeof normalized.suggestedMedusaSku === "string"
          ? normalized.suggestedMedusaSku
          : null,
      hidden: item.hidden,
      deleted: item.deleted,
    };
  });
  const skus = [
    ...new Set(candidates.flatMap((item) => item.suggestedMedusaSku ?? [])),
  ];
  const query = req.scope.resolve<RemoteQueryFunction>(
    ContainerRegistrationKeys.QUERY
  );
  const variants = skus.length
    ? z.array(z.object({ id: z.string(), sku: z.string().nullable() })).parse(
        (
          await query.graph({
            entity: "product_variant",
            fields: ["id", "sku"],
            filters: { sku: skus },
            pagination: { take: 10_000 },
          })
        ).data
      )
    : [];
  const existing = await service.listOneCProductMappings(
    { active: true },
    { take: 10_000 }
  );
  return planExactProductMappings(
    candidates,
    variants,
    existing.map((mapping) => ({
      externalId: mapping.external_id,
      medusaVariantId: mapping.medusa_variant_id,
    }))
  );
}

function preview(plan: Awaited<ReturnType<typeof loadPlan>>) {
  return {
    eligible_count: plan.mappings.length,
    skipped_count: plan.skippedCount,
    sample: plan.mappings.slice(0, 50).map((mapping) => ({
      sync_item_id: mapping.syncItemId,
      one_c_sku: mapping.externalId,
      medusa_sku: mapping.medusaSku,
      name: mapping.name,
    })),
  };
}
