import { MedusaContainer, Query } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  MedusaError,
  generateEntityId,
} from "@medusajs/framework/utils";
import {
  StepResponse,
  WorkflowResponse,
  createStep,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk";
import {
  batchPriceListPricesWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows";

import { saleOperationValueSchema } from "../application/sale-operation-schema";
import {
  Actor,
  OperationProposal,
  OperationRevision,
  SaleDetails,
  SaleOperationValue,
  SaleVariantTarget,
} from "../domain/types";
import { createOperationHash } from "../domain/operation-hash";
import { MedusaSaleDirectory } from "../infrastructure/medusa-directory";
import { MedusaOperationGovernanceStore } from "../infrastructure/medusa-governance-store";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishSaleUpdateWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedSaleUpdate = {
  proposal: OperationProposal;
  beforeValue: SaleOperationValue;
  proposedValue: SaleOperationValue;
};

const validateSaleUpdateStep = createStep(
  "validate-sale-update",
  async (input: PublishSaleUpdateWorkflowInput, { container }) => {
    const governance = new MedusaOperationGovernanceStore(
      resolveGovernanceService(container)
    );
    const proposal = await governance.findProposal(input.proposalId);
    if (!proposal) {
      throw conflict("The DYLLU sale proposal is no longer publishable");
    }
    const beforeValue = saleOperationValueSchema.safeParse(
      proposal.beforeValue
    );
    const proposedValue = saleOperationValueSchema.safeParse(
      proposal.proposedValue
    );
    if (
      !beforeValue.success ||
      !proposedValue.success ||
      !proposal.targetId ||
      !proposal.targetVersion ||
      proposal.targetType !== "sale" ||
      (proposal.kind !== "sale_items_update" &&
        proposal.kind !== "sale_status_update" &&
        proposal.kind !== "sale_rollback") ||
      beforeValue.data.saleId !== proposal.targetId ||
      proposedValue.data.saleId !== proposal.targetId ||
      proposal.actorId !== input.actor.id ||
      proposal.status !== "pending" ||
      proposal.contentHash !== input.contentHash ||
      proposal.expiresAt <= input.confirmedAt ||
      proposal.contentHash !==
        createOperationHash({
          kind: proposal.kind,
          targetType: proposal.targetType,
          targetId: proposal.targetId,
          targetKey: proposal.targetKey,
          targetVersion: proposal.targetVersion,
          beforeValue: proposal.beforeValue,
          proposedValue: proposal.proposedValue,
        })
    ) {
      throw conflict("The DYLLU sale proposal is no longer publishable");
    }
    const sales = new MedusaSaleDirectory(resolveQuery(container));
    const sale = await sales.findById(proposal.targetId);
    if (!sale || sale.updatedAt.toISOString() !== proposal.targetVersion) {
      throw conflict("The DYLLU sale changed after the proposal was created");
    }
    const currentValue = await buildSnapshot(sales, sale);
    if (JSON.stringify(currentValue) !== JSON.stringify(beforeValue.data)) {
      throw conflict("The DYLLU sale changed after the proposal was created");
    }
    if (proposedValue.data.status === "active") {
      const overlaps = await sales.findOverlappingActiveSales({
        variantIds: proposedValue.data.items.map((item) => item.variantId),
        startsAt: proposedValue.data.startsAt
          ? new Date(proposedValue.data.startsAt)
          : null,
        endsAt: proposedValue.data.endsAt
          ? new Date(proposedValue.data.endsAt)
          : null,
        excludeSaleId: proposal.targetId,
      });
      if (overlaps.length > 0) {
        throw conflict(
          "A selected variant now has another overlapping active DYLLU sale"
        );
      }
    }
    return new StepResponse<ValidatedSaleUpdate>({
      proposal,
      beforeValue: beforeValue.data,
      proposedValue: proposedValue.data,
    });
  }
);

const recordSaleUpdateRevisionStep = createStep(
  "record-sale-update-revision",
  async (
    input: PublishSaleUpdateWorkflowInput &
      ValidatedSaleUpdate & { batchResult: unknown },
    { container }
  ) => {
    const sales = new MedusaSaleDirectory(resolveQuery(container));
    const updatedSale = await sales.findById(input.proposal.targetId!);
    if (!updatedSale) {
      throw conflict("The DYLLU sale was not updated as expected");
    }
    const afterValue = await buildSnapshot(sales, updatedSale);
    if (!sameSaleIntent(afterValue, input.proposedValue)) {
      throw conflict("The DYLLU sale was not updated as expected");
    }
    const revision: OperationRevision = {
      id: generateEntityId(undefined, "mcporev"),
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action: input.proposal.kind === "sale_rollback" ? "rollback" : "update",
      actor: input.actor,
      targetType: "sale",
      targetId: updatedSale.id,
      targetKey: `sale:${updatedSale.id}`,
      beforeValue: input.beforeValue,
      afterValue,
      sourceRevisionId: input.proposal.sourceRevisionId,
      reason: input.proposal.reason,
      requestId: input.requestId,
      createdAt: input.confirmedAt,
    };
    await resolveGovernanceService(container).completeOperationChange({
      actor: input.actor,
      proposal: input.proposal,
      revision,
      confirmedEventId: generateEntityId(undefined, "mcpevt"),
      appliedEventId: generateEntityId(undefined, "mcpevt"),
      confirmedAt: input.confirmedAt,
    });
    return new StepResponse(revision);
  }
);

export const dylluMcpPublishSaleUpdateWorkflow = createWorkflow(
  "dyllu-mcp-publish-sale-update",
  (input: PublishSaleUpdateWorkflowInput) => {
    const validated = validateSaleUpdateStep(input);
    const metadataInput = transform(validated, ({ proposal, proposedValue }) => ({
      price_lists_data: [
        {
          id: proposal.targetId!,
          title: proposedValue.title,
          description: proposedValue.description,
          status: proposedValue.status,
          starts_at: proposedValue.startsAt,
          ends_at: proposedValue.endsAt,
        },
      ],
    }));
    const updatedPriceLists = updatePriceListsWorkflow.runAsStep({
      input: metadataInput,
    });
    const batchInput = transform(
      { validated, updatedPriceLists },
      ({ validated: change }) => {
        const beforeByVariant = new Map(
          change.beforeValue.items.map((item) => [item.variantId, item])
        );
        const proposedByVariant = new Map(
          change.proposedValue.items.map((item) => [item.variantId, item])
        );
        return {
          data: {
            id: change.proposal.targetId!,
            create: change.proposedValue.items
              .filter((item) => !beforeByVariant.has(item.variantId))
              .map((item) => ({
                variant_id: item.variantId,
                currency_code: item.currencyCode,
                amount: item.saleAmount,
              })),
            update: change.proposedValue.items
              .filter((item) => {
                const before = beforeByVariant.get(item.variantId);
                return before && before.saleAmount !== item.saleAmount;
              })
              .map((item) => ({
                id: item.salePriceId!,
                variant_id: item.variantId,
                currency_code: item.currencyCode,
                amount: item.saleAmount,
              })),
            delete: change.beforeValue.items
              .filter((item) => !proposedByVariant.has(item.variantId))
              .map((item) => item.salePriceId!),
          },
        };
      }
    );
    const batchResult = batchPriceListPricesWorkflow.runAsStep({
      input: batchInput,
    });
    const revisionInput = transform(
      { input, validated, batchResult },
      ({ input: workflowInput, validated: change, batchResult: result }) => ({
        ...workflowInput,
        ...change,
        batchResult: result,
      })
    );
    return new WorkflowResponse(recordSaleUpdateRevisionStep(revisionInput));
  }
);

async function buildSnapshot(
  sales: MedusaSaleDirectory,
  sale: SaleDetails
): Promise<SaleOperationValue> {
  if (sale.items.some((item) => item.hasRules || item.currencyCode !== "mdl")) {
    throw conflict("This DYLLU sale has an unsupported price rule");
  }
  const targets = await sales.findVariantTargets(
    sale.items.map((item) => item.variantId),
    "mdl"
  );
  const targetsByVariant = new Map(
    targets.map((target) => [target.variantId, target])
  );
  if (targets.length !== sale.items.length) {
    throw conflict("A DYLLU sale variant has no normal MDL price");
  }
  return {
    saleId: sale.id,
    title: sale.title,
    description: sale.description,
    status: sale.status,
    startsAt: sale.startsAt?.toISOString() ?? null,
    endsAt: sale.endsAt?.toISOString() ?? null,
    items: sale.items
      .map((item) => toSnapshotItem(item, targetsByVariant.get(item.variantId)))
      .sort((left, right) => left.variantId.localeCompare(right.variantId)),
  };
}

function toSnapshotItem(
  item: SaleDetails["items"][number],
  target: SaleVariantTarget | undefined
) {
  if (!target) {
    throw conflict("A DYLLU sale variant has no normal MDL price");
  }
  return {
    productId: target.productId,
    productTitle: target.productTitle,
    variantId: target.variantId,
    variantTitle: target.variantTitle,
    sku: target.sku,
    basePriceId: target.basePriceId,
    salePriceId: item.priceId,
    normalAmount: target.normalAmount,
    saleAmount: item.saleAmount,
    currencyCode: target.currencyCode,
    targetUpdatedAt: target.updatedAt.toISOString(),
  };
}

function sameSaleIntent(
  actual: SaleOperationValue,
  expected: SaleOperationValue
) {
  const withoutSalePriceIds = (value: SaleOperationValue) => ({
    ...value,
    items: value.items.map(({ salePriceId: _salePriceId, ...item }) => item),
  });
  return (
    JSON.stringify(withoutSalePriceIds(actual)) ===
    JSON.stringify(withoutSalePriceIds(expected))
  );
}

function resolveQuery(container: MedusaContainer) {
  return container.resolve<Query>(ContainerRegistrationKeys.QUERY);
}

function resolveGovernanceService(container: MedusaContainer) {
  return container.resolve<DylluMcpGovernanceModuleService>(
    DYLLU_MCP_GOVERNANCE_MODULE
  );
}

function conflict(message: string) {
  return new MedusaError(MedusaError.Types.CONFLICT, message);
}
