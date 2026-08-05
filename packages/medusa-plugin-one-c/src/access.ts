import { MedusaContainer } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

import { getRun, listItems, listRuns } from "./api/read-model";
import { OneCSyncAccess, OneCSyncReadInput } from "./contracts";
import { createOneCSyncApplication } from "./infrastructure/create-application";
import { ONE_C_SYNC_MODULE } from "./modules/one-c-sync";
import OneCSyncModuleService from "./modules/one-c-sync/service";

export function createOneCSyncAccess(
  container: MedusaContainer
): OneCSyncAccess {
  const service = container.resolve<OneCSyncModuleService>(ONE_C_SYNC_MODULE);

  return {
    async getLatest() {
      const result = await listRuns(service, { limit: 1, offset: 0 });
      const latest = result.runs[0];
      if (!latest) return null;
      const run = await getRun(service, latest.id);
      if (!run) return null;
      return {
        ...run,
        counts: renameCounts(run.counts),
      };
    },
    async listComparisons(input: OneCSyncReadInput) {
      const runId = input.runId ?? (await latestRunId(service));
      if (!runId) {
        return {
          run_id: null,
          items: [],
          count: 0,
          limit: input.limit,
          offset: input.offset,
        };
      }
      const result = await listItems(service, {
        runId,
        mappingStatus: input.mappingStatus,
        sku: input.sku,
        limit: input.limit,
        offset: input.offset,
      });
      return {
        run_id: runId,
        ...result,
        items: result.items.map((item) => ({
          sku: item.sku,
          name: item.name,
          mapping_status:
            item.mapping_status === "missing_medusa"
              ? "missing_dyllu"
              : item.mapping_status,
          dyllu_product_id: item.medusa_product_id,
          dyllu_variant_id: item.medusa_variant_id,
          dyllu_product_title: item.medusa_product_title,
          regular_price_mdl: item.regular_price_mdl,
          balance: item.balance,
          differences: item.differences,
          hidden: item.hidden,
          deleted: item.deleted,
        })),
      };
    },
    async receive(input) {
      const locking = container.resolve(Modules.LOCKING);
      return locking.execute(
        "dyllu-one-c:receive",
        () =>
          createOneCSyncApplication(container).receive({
            actorId: input.actorId,
            requestId: input.requestId,
            trigger: "mcp",
          }),
        { timeout: 1 }
      );
    },
  };
}

function renameCounts(counts: unknown) {
  if (!counts || typeof counts !== "object") return counts;
  const value = counts as Record<string, unknown>;
  const { missingMedusa, ...rest } = value;
  return { ...rest, missingDyllu: missingMedusa };
}

async function latestRunId(service: OneCSyncModuleService) {
  const result = await listRuns(service, { limit: 1, offset: 0 });
  return result.runs[0]?.id ?? null;
}
