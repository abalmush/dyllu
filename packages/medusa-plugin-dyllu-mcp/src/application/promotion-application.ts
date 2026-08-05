import { createOperationHash } from "../domain/operation-hash";
import {
  Actor,
  ConfirmationReceipt,
  OperationProposal,
  PromotionDetails,
  PromotionStatus,
  PromotionStatusOperationValue,
  RequestContext,
} from "../domain/types";
import { ApplicationError } from "./errors";
import {
  Clock,
  IdGenerator,
  OperationGovernanceStore,
  PromotionChangeExecutor,
  PromotionDirectory,
} from "./ports";
import { promotionStatusOperationValueSchema } from "./promotion-status-schema";

const PROPOSAL_TTL_MS = 30 * 60 * 1000;

export class PromotionApplication {
  constructor(
    private readonly dependencies: {
      directory: PromotionDirectory;
      governance: OperationGovernanceStore;
      executor: PromotionChangeExecutor;
      clock: Clock;
      ids: IdGenerator;
    }
  ) {}

  list(input: { status?: PromotionStatus; limit: number; offset: number }) {
    return this.dependencies.directory.list(input);
  }

  async get(promotionId: string) {
    const promotion = await this.dependencies.directory.findById(promotionId);
    if (!promotion) {
      throw new ApplicationError(
        "promotion_not_found",
        `DYLLU promotion ${promotionId} was not found`
      );
    }
    return promotion;
  }

  async proposeStatus(
    context: RequestContext,
    input: { promotionId: string; status: PromotionStatus; reason: string }
  ) {
    validateReason(input.reason);
    const promotion = await this.get(input.promotionId);
    if (promotion.status === input.status) {
      throw new ApplicationError(
        "unchanged_promotion",
        "The DYLLU promotion already has the selected status"
      );
    }
    const beforeValue = toValue(promotion);
    return this.storeProposal(context, {
      kind: "promotion_status_update",
      beforeValue,
      proposedValue: { ...beforeValue, status: input.status },
      reason: input.reason,
      sourceRevisionId: null,
    });
  }

  listHistory(promotionId: string, limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new ApplicationError(
        "invalid_audit_limit",
        "Promotion history limit must be between 1 and 50"
      );
    }
    return this.dependencies.governance.listRevisions(
      `promotion:${promotionId}`,
      limit
    );
  }

  async proposeRollback(
    context: RequestContext,
    input: { revisionId: string; reason: string }
  ) {
    validateReason(input.reason);
    const source = await this.dependencies.governance.findRevision(
      input.revisionId
    );
    if (
      !source ||
      source.targetType !== "promotion" ||
      (source.kind !== "promotion_status_update" &&
        source.kind !== "promotion_status_rollback")
    ) {
      throw new ApplicationError(
        "revision_not_found",
        `Promotion revision ${input.revisionId} was not found`
      );
    }
    const historical = promotionStatusOperationValueSchema.safeParse(
      source.beforeValue
    );
    if (!historical.success) {
      throw new ApplicationError(
        "invalid_promotion_revision",
        "The historical promotion status cannot be restored safely"
      );
    }
    const promotion = await this.get(source.targetId);
    if (promotion.status === historical.data.status) {
      throw new ApplicationError(
        "unchanged_promotion",
        "The DYLLU promotion already has the historical status"
      );
    }
    const beforeValue = toValue(promotion);
    return this.storeProposal(context, {
      kind: "promotion_status_rollback",
      beforeValue,
      proposedValue: { ...beforeValue, status: historical.data.status },
      reason: input.reason,
      sourceRevisionId: source.id,
    });
  }

  async publishStatus(
    actor: Actor,
    input: {
      proposalId: string;
      confirmation: ConfirmationReceipt;
      requestId: string;
    }
  ) {
    const proposal = await this.dependencies.governance.findProposal(
      input.proposalId
    );
    if (
      !proposal ||
      proposal.targetType !== "promotion" ||
      (proposal.kind !== "promotion_status_update" &&
        proposal.kind !== "promotion_status_rollback")
    ) {
      throw new ApplicationError(
        "proposal_not_found",
        `Promotion proposal ${input.proposalId} was not found`
      );
    }
    if (proposal.actorId !== actor.id) {
      throw new ApplicationError(
        "proposal_owner_mismatch",
        "Only the proposal author can publish it"
      );
    }
    if (proposal.status !== "pending") {
      throw new ApplicationError(
        "proposal_not_pending",
        "The proposal is no longer pending"
      );
    }
    if (proposal.expiresAt <= this.dependencies.clock.now()) {
      await this.closeFailed(actor, proposal, input.requestId, "expired");
      throw new ApplicationError(
        "proposal_expired",
        "The proposal expired and must be regenerated"
      );
    }
    if (
      input.confirmation.action !== "accept" ||
      input.confirmation.proposalId !== proposal.id ||
      input.confirmation.contentHash !== proposal.contentHash
    ) {
      throw new ApplicationError(
        "confirmation_mismatch",
        "Confirmation does not match the exact proposal"
      );
    }
    try {
      return await this.dependencies.executor.publishStatus({
        actor,
        proposal,
        requestId: input.requestId,
        confirmedAt: input.confirmation.confirmedAt,
      });
    } catch (error) {
      await this.closeFailed(actor, proposal, input.requestId, "failed");
      throw error;
    }
  }

  private async storeProposal(
    context: RequestContext,
    input: {
      kind: "promotion_status_update" | "promotion_status_rollback";
      beforeValue: PromotionStatusOperationValue;
      proposedValue: PromotionStatusOperationValue;
      reason: string;
      sourceRevisionId: string | null;
    }
  ) {
    const createdAt = this.dependencies.clock.now();
    const id = this.dependencies.ids.next("operationProposal");
    const targetKey = `promotion:${input.beforeValue.id}`;
    const targetVersion = input.beforeValue.updatedAt;
    const proposal: OperationProposal = {
      id,
      kind: input.kind,
      status: "pending",
      actorId: context.actorId,
      targetType: "promotion",
      targetId: input.beforeValue.id,
      targetKey,
      beforeValue: input.beforeValue,
      proposedValue: input.proposedValue,
      targetVersion,
      contentHash: createOperationHash({
        kind: input.kind,
        targetType: "promotion",
        targetId: input.beforeValue.id,
        targetKey,
        targetVersion,
        beforeValue: input.beforeValue,
        proposedValue: input.proposedValue,
      }),
      reason: input.reason.trim(),
      sourceRevisionId: input.sourceRevisionId,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + PROPOSAL_TTL_MS),
    };
    await this.dependencies.governance.createProposal({
      proposal,
      requestId: context.requestId,
    });
    return proposal;
  }

  private closeFailed(
    actor: Actor,
    proposal: OperationProposal,
    requestId: string,
    status: "expired" | "failed"
  ) {
    return this.dependencies.governance.closeProposal({
      actorId: actor.id,
      proposalId: proposal.id,
      targetKey: proposal.targetKey,
      requestId,
      occurredAt: this.dependencies.clock.now(),
      status,
      reason:
        status === "expired"
          ? "proposal_ttl_elapsed"
          : "promotion_publish_failed",
    });
  }
}

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

function validateReason(reason: string) {
  const trimmed = reason.trim();
  if (trimmed.length < 3 || trimmed.length > 500) {
    throw new ApplicationError(
      "invalid_reason",
      "Reason must contain 3 to 500 characters"
    );
  }
}
