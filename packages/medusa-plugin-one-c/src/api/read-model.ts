import { z } from "@medusajs/framework/zod";

import OneCSyncModuleService from "../modules/one-c-sync/service";

export const listQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
    mapping_status: z
      .enum(["matched", "missing_medusa", "ambiguous", "excluded"])
      .optional(),
  })
  .passthrough();

export const runIdSchema = z.string().regex(/^onecrun_[A-Za-z0-9]+$/);

export async function listRuns(
  service: OneCSyncModuleService,
  input: { limit: number; offset: number }
) {
  const [runs, count] = await service.listAndCountOneCSyncRuns(
    {},
    {
      take: input.limit,
      skip: input.offset,
      order: { started_at: "DESC" },
    }
  );
  return {
    runs: runs.map(runDto),
    count,
    limit: input.limit,
    offset: input.offset,
  };
}

export async function getRun(service: OneCSyncModuleService, id: string) {
  const runs = await service.listOneCSyncRuns({ id }, { take: 1 });
  const run = runs[0];
  if (!run) return null;
  const snapshots = await service.listOneCFeedSnapshots(
    { run_id: id },
    { take: 2_000, order: { created_at: "ASC" } }
  );
  return {
    ...runDto(run),
    snapshots: snapshots.map((snapshot) => ({
      id: snapshot.id,
      endpoint: snapshot.endpoint,
      batch: snapshot.batch,
      status_code: snapshot.status_code,
      elapsed_ms: snapshot.elapsed_ms,
      response_hash: snapshot.response_hash,
      response_bytes: Buffer.byteLength(snapshot.raw_body, "utf8"),
      created_at: snapshot.created_at,
    })),
  };
}

export async function listItems(
  service: OneCSyncModuleService,
  input: {
    runId: string;
    mappingStatus?: "matched" | "missing_medusa" | "ambiguous" | "excluded";
    sku?: string;
    limit: number;
    offset: number;
  }
) {
  const [items, count] = await service.listAndCountOneCSyncItems(
    {
      run_id: input.runId,
      ...(input.mappingStatus ? { mapping_status: input.mappingStatus } : {}),
      ...(input.sku ? { sku: input.sku } : {}),
    },
    {
      take: input.limit,
      skip: input.offset,
      order: { sku: "ASC" },
    }
  );
  return {
    items: items.map(itemDto),
    count,
    limit: input.limit,
    offset: input.offset,
  };
}

const FULL_RUN_SCAN_LIMIT = 10_000;

export async function listSaleItems(
  service: OneCSyncModuleService,
  input: { runId: string; limit: number; offset: number }
) {
  const [items] = await service.listAndCountOneCSyncItems(
    { run_id: input.runId },
    { take: FULL_RUN_SCAN_LIMIT, order: { sku: "ASC" } }
  );
  const saleItems = items
    .map((item) => itemDto(item))
    .filter((item) => item.sale_price_mdl !== null);
  return {
    items: saleItems.slice(input.offset, input.offset + input.limit),
    count: saleItems.length,
    limit: input.limit,
    offset: input.offset,
  };
}

export function runDto(
  run: Awaited<ReturnType<OneCSyncModuleService["listOneCSyncRuns"]>>[number]
) {
  return {
    id: run.id,
    trigger: run.trigger,
    status: run.status,
    actor_id: run.actor_id,
    transport_trusted: run.transport_trusted,
    outbound_ip: run.outbound_ip,
    counts: run.counts,
    error_code: run.error_code,
    error_message: run.error_message,
    started_at: run.started_at,
    completed_at: run.completed_at,
  };
}

export function itemDto(
  item: Awaited<ReturnType<OneCSyncModuleService["listOneCSyncItems"]>>[number]
) {
  const normalized = item.normalized as Record<string, unknown>;
  return {
    id: item.id,
    run_id: item.run_id,
    external_id: item.external_id,
    sku: item.sku,
    name: item.name,
    mapping_status: item.mapping_status,
    preparation_status: item.preparation_status,
    medusa_product_id: item.medusa_product_id,
    medusa_variant_id: item.medusa_variant_id,
    medusa_product_title: item.medusa_product_title,
    regular_price_mdl:
      typeof normalized.regularPriceMdl === "number"
        ? normalized.regularPriceMdl
        : null,
    sale_price_mdl:
      typeof normalized.salePriceMdl === "number"
        ? normalized.salePriceMdl
        : null,
    sale_starts_at:
      typeof normalized.saleStartsAt === "string"
        ? normalized.saleStartsAt
        : null,
    sale_ends_at:
      typeof normalized.saleEndsAt === "string" ? normalized.saleEndsAt : null,
    balance: typeof normalized.balance === "number" ? normalized.balance : null,
    brand_external_id:
      typeof normalized.brandExternalId === "string"
        ? normalized.brandExternalId
        : null,
    suggested_medusa_sku:
      typeof normalized.suggestedMedusaSku === "string"
        ? normalized.suggestedMedusaSku
        : null,
    differences: item.differences,
    hidden: item.hidden,
    deleted: item.deleted,
    created_at: item.created_at,
  };
}
