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
import { createPriceListsWorkflow } from "@medusajs/medusa/core-flows";

import { Actor, OperationProposal, OperationRevision } from "../domain/types";
import { saleOperationValueSchema } from "../application/sale-operation-schema";
import { createOperationHash } from "../domain/operation-hash";
import { MedusaSaleDirectory } from "../infrastructure/medusa-directory";
import { MedusaOperationGovernanceStore } from "../infrastructure/medusa-governance-store";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishSaleCreateWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedSaleCreate = {
  proposal: OperationProposal;
  value: ReturnType<typeof saleOperationValueSchema.parse>;
};

const validateSaleCreateStep = createStep(
  "validate-sale-create",
  async (input: PublishSaleCreateWorkflowInput, { container }) => {
    const governance = new MedusaOperationGovernanceStore(
      resolveGovernanceService(container)
    );
    const proposal = await governance.findProposal(input.proposalId);
    if (!proposal) {
      throw conflict("The DYLLU sale proposal is no longer publishable");
    }
    const parsedValue = saleOperationValueSchema.safeParse(
      proposal.proposedValue
    );
    if (
      !parsedValue.success ||
      parsedValue.data.saleId !== null ||
      parsedValue.data.items.length < 1 ||
      parsedValue.data.items.some((item) => item.salePriceId !== null) ||
      proposal.kind !== "sale_create" ||
      proposal.targetType !== "sale" ||
      proposal.targetId !== null ||
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

    const value = parsedValue.data;
    const sales = new MedusaSaleDirectory(resolveQuery(container));
    const variantIds = value.items.map((item) => item.variantId);
    const targets = await sales.findVariantTargets(variantIds, "mdl");
    const targetsByVariant = new Map(
      targets.map((target) => [target.variantId, target])
    );
    const stale = value.items.some((item) => {
      const target = targetsByVariant.get(item.variantId);
      return (
        !target ||
        target.basePriceId !== item.basePriceId ||
        target.normalAmount !== item.normalAmount ||
        target.updatedAt.toISOString() !== item.targetUpdatedAt ||
        item.saleAmount >= target.normalAmount
      );
    });
    if (stale || targets.length !== value.items.length) {
      throw conflict(
        "A DYLLU normal price changed after the sale proposal was created"
      );
    }
    const overlaps = await sales.findOverlappingActiveSales({
      variantIds,
      startsAt: value.startsAt ? new Date(value.startsAt) : null,
      endsAt: value.endsAt ? new Date(value.endsAt) : null,
    });
    if (overlaps.length > 0) {
      throw conflict(
        "A selected variant now has an overlapping active DYLLU sale"
      );
    }
    return new StepResponse<ValidatedSaleCreate>({ proposal, value });
  }
);

const recordSaleCreateRevisionStep = createStep(
  "record-sale-create-revision",
  async (
    input: PublishSaleCreateWorkflowInput &
      ValidatedSaleCreate & {
        createdPriceLists: Array<{ id: string; type?: string }>;
      },
    { container }
  ) => {
    const created = input.createdPriceLists[0];
    if (
      input.createdPriceLists.length !== 1 ||
      !created?.id ||
      (created.type && created.type !== "sale")
    ) {
      throw conflict("The DYLLU sale was not created as expected");
    }
    const afterValue = { ...input.value, saleId: created.id };
    const revision: OperationRevision = {
      id: generateEntityId(undefined, "mcporev"),
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action: "update",
      actor: input.actor,
      targetType: "sale",
      targetId: created.id,
      targetKey: `sale:${created.id}`,
      beforeValue: input.proposal.beforeValue,
      afterValue,
      sourceRevisionId: null,
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

export const dylluMcpPublishSaleCreateWorkflow = createWorkflow(
  "dyllu-mcp-publish-sale-create",
  (input: PublishSaleCreateWorkflowInput) => {
    const validated = validateSaleCreateStep(input);
    const createInput = transform(validated, ({ value }) => ({
      price_lists_data: [
        {
          title: value.title,
          description: value.description,
          type: "sale",
          status: value.status,
          starts_at: value.startsAt,
          ends_at: value.endsAt,
          prices: value.items.map((item) => ({
            variant_id: item.variantId,
            currency_code: item.currencyCode,
            amount: item.saleAmount,
          })),
        },
      ],
    }));
    const createdPriceLists = createPriceListsWorkflow.runAsStep({
      input: createInput,
    });
    const revisionInput = transform(
      { input, validated, createdPriceLists },
      ({
        input: workflowInput,
        validated: sale,
        createdPriceLists: priceLists,
      }) => ({
        ...workflowInput,
        ...sale,
        createdPriceLists: priceLists,
      })
    );
    return new WorkflowResponse(recordSaleCreateRevisionStep(revisionInput));
  }
);

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
