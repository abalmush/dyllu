import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { z } from "@medusajs/framework/zod";

import {
  createCsvExport,
  createJsonExport,
} from "../../../../../../application/export-sync-items";
import { ONE_C_SYNC_MODULE } from "../../../../../../modules/one-c-sync";
import OneCSyncModuleService from "../../../../../../modules/one-c-sync/service";
import { recordOneCSyncExportWorkflow } from "../../../../../../workflows/record-sync-export";
import { itemDto, runIdSchema } from "../../../../../read-model";

const querySchema = z
  .object({
    format: z.enum(["csv", "json"]),
    mapping_status: z
      .enum(["matched", "missing_medusa", "ambiguous", "excluded"])
      .optional(),
  })
  .passthrough();

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const query = querySchema.safeParse(req.query);
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
  const actorId = req.auth_context?.actor_id;
  if (!actorId) {
    res.status(401).json({ error: "authentication_required" });
    return;
  }
  const [items, count] = await service.listAndCountOneCSyncItems(
    {
      run_id: runId.data,
      ...(query.data.mapping_status
        ? { mapping_status: query.data.mapping_status }
        : {}),
    },
    { take: 10_000, order: { sku: "ASC" } }
  );
  if (count > 10_000) {
    res.status(413).json({
      error: "export_too_large",
      message: "Filter the export to 10,000 products or fewer",
    });
    return;
  }
  const exportedAt = new Date().toISOString();
  const exportItems = items.map(itemDto).map((item) => ({
    referenceId: item.id,
    sku: item.sku,
    name: item.name,
    mappingStatus: item.mapping_status,
    preparationStatus: item.preparation_status,
    regularPriceMdl: item.regular_price_mdl,
    salePriceMdl: item.sale_price_mdl,
    balance: item.balance,
    differences: item.differences,
    hidden: item.hidden,
    deleted: item.deleted,
  }));
  const format = query.data.format;
  const body =
    format === "csv"
      ? createCsvExport({ runId: runId.data, exportedAt, items: exportItems })
      : createJsonExport({ runId: runId.data, exportedAt, items: exportItems });
  await recordOneCSyncExportWorkflow(req.scope).run({
    input: {
      runId: runId.data,
      actorId,
      format,
      mappingStatus: query.data.mapping_status ?? null,
      rowCount: exportItems.length,
      occurredAt: new Date(),
    },
  });
  res.setHeader(
    "Content-Type",
    format === "csv"
      ? "text/csv; charset=utf-8"
      : "application/json; charset=utf-8"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="one-c-${runId.data}.${format}"`
  );
  res.send(body);
}
