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
import { updatePromotionsStatusWorkflow } from "@medusajs/medusa/core-flows";

import { createOperationHash } from "../domain/operation-hash";
import {
  Actor,
  OperationProposal,
  OperationRevision,
  PromotionDetails,
  PromotionStatusOperationValue,
} from "../domain/types";
import { promotionStatusOperationValueSchema } from "../application/promotion-status-schema";
import { MedusaOperationGovernanceStore } from "../infrastructure/medusa-governance-store";
import { MedusaPromotionDirectory } from "../infrastructure/medusa-promotion-directory";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishPromotionStatusWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedPromotionStatus = {
  proposal: OperationProposal;
  beforeValue: PromotionStatusOperationValue;
  proposedValue: PromotionStatusOperationValue;
};

const validatePromotionStatusStep = createStep(
  "validate-promotion-status",
  async (input: PublishPromotionStatusWorkflowInput, { container }) => {
    const governance = new MedusaOperationGovernanceStore(
      resolveGovernanceService(container)
    );
    const proposal = await governance.findProposal(input.proposalId);
    if (!proposal) {
      throw conflict("The DYLLU promotion proposal is no longer publishable");
    }
    const beforeValue = promotionStatusOperationValueSchema.safeParse(
      proposal.beforeValue
    );
    const proposedValue = promotionStatusOperationValueSchema.safeParse(
      proposal.proposedValue
    );
    if (
      !beforeValue.success ||
      !proposedValue.success ||
      !proposal.targetId ||
      !proposal.targetVersion ||
      proposal.targetType !== "promotion" ||
      (proposal.kind !== "promotion_status_update" &&
        proposal.kind !== "promotion_status_rollback") ||
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
      throw conflict("The DYLLU promotion proposal is no longer publishable");
    }
    const directory = new MedusaPromotionDirectory(resolveQuery(container));
    const current = await directory.findById(proposal.targetId);
    if (
      !current ||
      JSON.stringify(toValue(current)) !== JSON.stringify(beforeValue.data)
    ) {
      throw conflict(
        "The DYLLU promotion changed after the proposal was created"
      );
    }
    return new StepResponse<ValidatedPromotionStatus>({
      proposal,
      beforeValue: beforeValue.data,
      proposedValue: proposedValue.data,
    });
  }
);

const recordPromotionRevisionStep = createStep(
  "record-promotion-revision",
  async (
    input: PublishPromotionStatusWorkflowInput &
      ValidatedPromotionStatus & { updateResult: unknown },
    { container }
  ) => {
    const directory = new MedusaPromotionDirectory(resolveQuery(container));
    const updated = await directory.findById(input.proposal.targetId!);
    if (!updated || updated.status !== input.proposedValue.status) {
      throw conflict("The DYLLU promotion was not updated as expected");
    }
    const afterValue = toValue(updated);
    const revision: OperationRevision = {
      id: generateEntityId(undefined, "mcporev"),
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action:
        input.proposal.kind === "promotion_status_rollback"
          ? "rollback"
          : "update",
      actor: input.actor,
      targetType: "promotion",
      targetId: updated.id,
      targetKey: `promotion:${updated.id}`,
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

export const dylluMcpPublishPromotionStatusWorkflow = createWorkflow(
  "dyllu-mcp-publish-promotion-status",
  (input: PublishPromotionStatusWorkflowInput) => {
    const validated = validatePromotionStatusStep(input);
    const updateInput = transform(validated, (change) => ({
      promotionsData: [
        {
          id: change.proposal.targetId!,
          status: change.proposedValue.status,
        },
      ],
    }));
    const updateResult = updatePromotionsStatusWorkflow.runAsStep({
      input: updateInput,
    });
    const revisionInput = transform(
      { input, validated, updateResult },
      ({ input: workflowInput, validated: change, updateResult: result }) => ({
        ...workflowInput,
        ...change,
        updateResult: result,
      })
    );
    return new WorkflowResponse(recordPromotionRevisionStep(revisionInput));
  }
);

function toValue(promotion: PromotionDetails): PromotionStatusOperationValue {
  return {
    id: promotion.id,
    code: promotion.code,
    type: promotion.type,
    status: promotion.status,
    isAutomatic: promotion.isAutomatic,
    isTaxInclusive: promotion.isTaxInclusive,
    limit: promotion.limit,
    used: promotion.used,
    campaignId: promotion.campaignId,
    createdAt: promotion.createdAt.toISOString(),
    updatedAt: promotion.updatedAt.toISOString(),
  };
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
