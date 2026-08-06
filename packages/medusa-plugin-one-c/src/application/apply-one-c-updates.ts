import { evaluateGuardrail } from "../domain/guardrail";
import { planSalePriceChange } from "../domain/plan-sale-price-change";
import { ApplyOneCUpdatesInput } from "../workflows/apply-one-c-updates";
import { Clock, IdGenerator, MedusaCatalogApplyReader, OneCSyncStore } from "./ports";

type SyncItemForApply = {
  id: string;
  runId: string;
  medusaVariantId: string | null;
  normalized: {
    regularPriceMdl?: number | null;
    salePriceMdl?: number | null;
    balance?: number | null;
  };
};

type ApplyOneCUpdatesDependencies = {
  store: Pick<OneCSyncStore, "createAppliedChanges"> & {
    listItems(input: { runId: string; mappingStatus: "matched" }): Promise<
      SyncItemForApply[]
    >;
  };
  applyReader: MedusaCatalogApplyReader;
  runWorkflow: (input: ApplyOneCUpdatesInput) => Promise<void>;
  stockLocationId: string;
  ids: IdGenerator;
  clock: Clock;
};

export type ApplyRunResult = {
  appliedCount: number;
  flaggedCount: number;
  failedCount: number;
};

export class ApplyOneCUpdatesApplication {
  constructor(private readonly dependencies: ApplyOneCUpdatesDependencies) {}

  async applyRun(input: {
    runId: string;
    actorId: string;
  }): Promise<ApplyRunResult> {
    const items = await this.dependencies.store.listItems({
      runId: input.runId,
      mappingStatus: "matched",
    });
    const salePriceListId =
      await this.dependencies.applyReader.ensureSalePriceList();
    const result: ApplyRunResult = {
      appliedCount: 0,
      flaggedCount: 0,
      failedCount: 0,
    };
    for (const item of items) {
      const outcome = await this.applyItemInternal(
        item,
        input.actorId,
        salePriceListId
      );
      if (outcome === "applied") result.appliedCount += 1;
      else if (outcome === "flagged") result.flaggedCount += 1;
      else if (outcome === "failed") result.failedCount += 1;
    }
    return result;
  }

  async applyItem(input: {
    item: SyncItemForApply;
    actorId: string;
  }): Promise<"applied" | "flagged" | "failed" | "no_change"> {
    const salePriceListId =
      await this.dependencies.applyReader.ensureSalePriceList();
    return this.applyItemInternal(input.item, input.actorId, salePriceListId);
  }

  private async applyItemInternal(
    item: SyncItemForApply,
    actorId: string,
    salePriceListId: string
  ): Promise<"applied" | "flagged" | "failed" | "no_change"> {
    if (!item.medusaVariantId) return "no_change";
    const variant = await this.dependencies.applyReader.getVariantForApply(
      item.medusaVariantId
    );
    if (!variant) return "failed";

    const priceGuardrail = evaluateGuardrail({
      currentValue: variant.regularPrice?.amount ?? null,
      proposedValue: item.normalized.regularPriceMdl ?? null,
    });
    const saleGuardrail = evaluateGuardrail({
      currentValue: variant.salePriceListEntry?.amount ?? null,
      proposedValue: item.normalized.salePriceMdl ?? null,
    });
    const stockGuardrail = evaluateGuardrail({
      currentValue: variant.stockedQuantity,
      proposedValue: item.normalized.balance ?? null,
    });

    if (
      priceGuardrail === "no_change" &&
      saleGuardrail === "no_change" &&
      stockGuardrail === "no_change"
    ) {
      return "no_change";
    }

    const auditRows: Array<{
      id: string;
      runId: string;
      syncItemId: string;
      medusaVariantId: string;
      field: "regular_price_mdl" | "sale_price_mdl" | "balance";
      before: unknown;
      after: unknown;
      actorId: string;
      appliedAt: Date;
      status: "applied" | "flagged" | "failed";
    }> = [];
    const appliedAt = this.dependencies.clock.now();

    const workflowInput: ApplyOneCUpdatesInput = {
      variantId: variant.variantId,
      productId: variant.productId,
      price: null,
      salePlan: { action: "none" },
      salePreviousAmount: variant.salePriceListEntry?.amount ?? null,
      salePriceListId,
      stock: null,
    };
    let hasApplicableChange = false;

    if (priceGuardrail === "within_threshold" && variant.regularPrice) {
      workflowInput.price = {
        priceId: variant.regularPrice.id,
        previousAmount: variant.regularPrice.amount,
        newAmount: item.normalized.regularPriceMdl!,
      };
      hasApplicableChange = true;
      auditRows.push({
        id: this.dependencies.ids.next("onecapplied"),
        runId: item.runId,
        syncItemId: item.id,
        medusaVariantId: variant.variantId,
        field: "regular_price_mdl",
        before: variant.regularPrice.amount,
        after: item.normalized.regularPriceMdl,
        actorId,
        appliedAt,
        status: "applied",
      });
    } else if (priceGuardrail === "flagged") {
      auditRows.push({
        id: this.dependencies.ids.next("onecapplied"),
        runId: item.runId,
        syncItemId: item.id,
        medusaVariantId: variant.variantId,
        field: "regular_price_mdl",
        before: variant.regularPrice?.amount ?? null,
        after: item.normalized.regularPriceMdl ?? null,
        actorId,
        appliedAt,
        status: "flagged",
      });
    }

    if (saleGuardrail === "within_threshold") {
      workflowInput.salePlan = planSalePriceChange({
        proposedSalePriceMdl: item.normalized.salePriceMdl ?? null,
        currentSalePriceListEntry: variant.salePriceListEntry,
      });
      if (workflowInput.salePlan.action !== "none") hasApplicableChange = true;
      auditRows.push({
        id: this.dependencies.ids.next("onecapplied"),
        runId: item.runId,
        syncItemId: item.id,
        medusaVariantId: variant.variantId,
        field: "sale_price_mdl",
        before: variant.salePriceListEntry?.amount ?? null,
        after: item.normalized.salePriceMdl ?? null,
        actorId,
        appliedAt,
        status: "applied",
      });
    } else if (saleGuardrail === "flagged") {
      auditRows.push({
        id: this.dependencies.ids.next("onecapplied"),
        runId: item.runId,
        syncItemId: item.id,
        medusaVariantId: variant.variantId,
        field: "sale_price_mdl",
        before: variant.salePriceListEntry?.amount ?? null,
        after: item.normalized.salePriceMdl ?? null,
        actorId,
        appliedAt,
        status: "flagged",
      });
    }

    if (
      stockGuardrail === "within_threshold" &&
      variant.inventoryItemId &&
      item.normalized.balance != null
    ) {
      workflowInput.stock = {
        inventoryItemId: variant.inventoryItemId,
        locationId: this.dependencies.stockLocationId,
        previousQuantity: variant.stockedQuantity ?? 0,
        newQuantity: item.normalized.balance,
      };
      hasApplicableChange = true;
      auditRows.push({
        id: this.dependencies.ids.next("onecapplied"),
        runId: item.runId,
        syncItemId: item.id,
        medusaVariantId: variant.variantId,
        field: "balance",
        before: variant.stockedQuantity,
        after: item.normalized.balance,
        actorId,
        appliedAt,
        status: "applied",
      });
    } else if (stockGuardrail === "flagged") {
      auditRows.push({
        id: this.dependencies.ids.next("onecapplied"),
        runId: item.runId,
        syncItemId: item.id,
        medusaVariantId: variant.variantId,
        field: "balance",
        before: variant.stockedQuantity,
        after: item.normalized.balance ?? null,
        actorId,
        appliedAt,
        status: "flagged",
      });
    }

    try {
      if (hasApplicableChange) {
        await this.dependencies.runWorkflow(workflowInput);
      }
      await this.dependencies.store.createAppliedChanges(auditRows);
    } catch (error) {
      await this.dependencies.store.createAppliedChanges(
        auditRows.map((row) => ({
          ...row,
          status: "failed" as const,
        }))
      );
      return "failed";
    }

    const hasFlagged = auditRows.some((row) => row.status === "flagged");
    return hasFlagged ? "flagged" : hasApplicableChange ? "applied" : "no_change";
  }
}
