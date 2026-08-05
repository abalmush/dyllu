import { createOperationHash } from "../domain/operation-hash";
import {
  Actor,
  ConfirmationReceipt,
  OperationProposal,
  RequestContext,
  ReturnCancelOperationValue,
  ReturnDetails,
  ReturnRequestOperationValue,
  ReturnStatus,
} from "../domain/types";
import { ApplicationError } from "./errors";
import {
  Clock,
  IdGenerator,
  OperationGovernanceStore,
  ReturnChangeExecutor,
  ReturnDirectory,
} from "./ports";

const PROPOSAL_TTL_MS = 30 * 60 * 1000;
const RETURN_STATUSES: ReturnStatus[] = [
  "requested",
  "received",
  "partially_received",
  "canceled",
];

export class ReturnApplication {
  constructor(
    private readonly dependencies: {
      directory: ReturnDirectory;
      governance: OperationGovernanceStore;
      executor: ReturnChangeExecutor;
      clock: Clock;
      ids: IdGenerator;
    }
  ) {}

  list(input: { status?: ReturnStatus; limit: number; offset: number }) {
    if (
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 50 ||
      !Number.isSafeInteger(input.offset) ||
      input.offset < 0 ||
      input.offset > 10_000 ||
      (input.status !== undefined && !RETURN_STATUSES.includes(input.status))
    ) {
      throw new ApplicationError(
        "invalid_return",
        "Return list input is invalid"
      );
    }
    return this.dependencies.directory.list(input);
  }

  async get(returnId: string) {
    const normalizedReturnId = normalizeId(returnId, "Return ID");
    const orderReturn =
      await this.dependencies.directory.findById(normalizedReturnId);
    if (!orderReturn) {
      throw new ApplicationError(
        "return_not_found",
        `DYLLU return ${returnId} was not found`
      );
    }
    return orderReturn;
  }

  async proposeCreate(
    context: RequestContext,
    input: {
      orderReference: string;
      items: Array<{
        itemId: string;
        quantity: number;
        reasonId: string | null;
        note: string | null;
      }>;
      note: string | null;
      reason: string;
    }
  ) {
    validateReason(input.reason);
    const orderReference = normalizeId(input.orderReference, "Order reference");
    const items = input.items.map((item) => ({
      ...item,
      itemId: normalizeId(item.itemId, "Order item ID"),
      reasonId: normalizeOptionalId(item.reasonId, "Return reason ID"),
      note: normalizeOptionalText(item.note),
    }));
    if (
      items.length < 1 ||
      items.length > 20 ||
      new Set(items.map((item) => item.itemId)).size !== items.length
    ) {
      throw new ApplicationError(
        "invalid_return",
        "A return request must contain 1 to 20 unique DYLLU order items"
      );
    }
    const note = normalizeOptionalText(input.note);
    const order =
      await this.dependencies.directory.findOrderTarget(orderReference);
    if (!order || order.status === "canceled") {
      throw new ApplicationError(
        "invalid_return",
        "The selected DYLLU order cannot accept a return request"
      );
    }
    const existingReturns = await this.dependencies.directory.listForOrder(
      order.id
    );
    const alreadyReturned = new Map<string, number>();
    for (const orderReturn of existingReturns) {
      if (orderReturn.status === "canceled") {
        continue;
      }
      for (const item of orderReturn.items) {
        alreadyReturned.set(
          item.itemId,
          (alreadyReturned.get(item.itemId) ?? 0) + item.quantity
        );
      }
    }
    const orderItems = new Map(order.items.map((item) => [item.id, item]));
    const requestedByItem = new Map(items.map((item) => [item.itemId, item]));
    const valueItems = items
      .map((requested) => {
        const item = orderItems.get(requested.itemId);
        const previous = alreadyReturned.get(requested.itemId) ?? 0;
        if (
          !item ||
          !Number.isSafeInteger(requested.quantity) ||
          requested.quantity < 1 ||
          requested.quantity > item.quantity - previous
        ) {
          throw new ApplicationError(
            "invalid_return_quantity",
            "A return quantity must not exceed the remaining DYLLU order quantity"
          );
        }
        return {
          itemId: item.id,
          title: item.title,
          sku: item.sku,
          orderedQuantity: item.quantity,
          alreadyReturnedQuantity: previous,
          requestQuantity: requested.quantity,
          reasonId: requested.reasonId,
          note: requested.note,
        };
      })
      .sort((left, right) => left.itemId.localeCompare(right.itemId));
    const base: ReturnRequestOperationValue = {
      order: {
        id: order.id,
        displayId: order.displayId,
        status: order.status,
        fulfillmentStatus: order.fulfillmentStatus,
        currencyCode: order.currencyCode,
        updatedAt: order.updatedAt.toISOString(),
      },
      returnId: null,
      status: null,
      note,
      items: valueItems.map((item) => ({ ...item, requestQuantity: 0 })),
    };
    const proposedValue: ReturnRequestOperationValue = {
      ...base,
      items: base.items.map((item) => ({
        ...item,
        requestQuantity: requestedByItem.get(item.itemId)!.quantity,
      })),
    };
    return this.storeProposal(context, {
      kind: "return_request_create",
      targetId: null,
      targetKey: `return-order:${order.id}`,
      targetVersion: order.updatedAt.toISOString(),
      beforeValue: base,
      proposedValue,
      reason: input.reason,
    });
  }

  async proposeCancel(
    context: RequestContext,
    input: { returnId: string; reason: string }
  ) {
    validateReason(input.reason);
    const orderReturn = await this.get(input.returnId);
    if (
      orderReturn.status !== "requested" ||
      orderReturn.items.some((item) => item.receivedQuantity > 0)
    ) {
      throw new ApplicationError(
        "return_not_cancelable",
        "Only an unreceived DYLLU return request can be canceled"
      );
    }
    const beforeValue = toCancelValue(orderReturn);
    return this.storeProposal(context, {
      kind: "return_cancel",
      targetId: orderReturn.id,
      targetKey: `return:${orderReturn.id}`,
      targetVersion: orderReturn.updatedAt.toISOString(),
      beforeValue,
      proposedValue: { ...beforeValue, status: "canceled" },
      reason: input.reason,
    });
  }

  listHistory(returnId: string, limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new ApplicationError(
        "invalid_audit_limit",
        "Return history limit must be between 1 and 50"
      );
    }
    const normalizedReturnId = normalizeId(returnId, "Return ID");
    return this.dependencies.governance.listRevisions(
      `return:${normalizedReturnId}`,
      limit
    );
  }

  async publish(
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
      proposal.targetType !== "return" ||
      (proposal.kind !== "return_request_create" &&
        proposal.kind !== "return_cancel")
    ) {
      throw new ApplicationError(
        "proposal_not_found",
        `Return proposal ${input.proposalId} was not found`
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
      await this.close(actor, proposal, input.requestId, "expired");
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
      const publish =
        proposal.kind === "return_request_create"
          ? this.dependencies.executor.publishCreate.bind(
              this.dependencies.executor
            )
          : this.dependencies.executor.publishCancel.bind(
              this.dependencies.executor
            );
      return await publish({
        actor,
        proposal,
        requestId: input.requestId,
        confirmedAt: input.confirmation.confirmedAt,
      });
    } catch (error) {
      await this.close(actor, proposal, input.requestId, "failed");
      throw error;
    }
  }

  private async storeProposal(
    context: RequestContext,
    input: {
      kind: "return_request_create" | "return_cancel";
      targetId: string | null;
      targetKey: string;
      targetVersion: string;
      beforeValue: ReturnRequestOperationValue | ReturnCancelOperationValue;
      proposedValue: ReturnRequestOperationValue | ReturnCancelOperationValue;
      reason: string;
    }
  ) {
    const createdAt = this.dependencies.clock.now();
    const id = this.dependencies.ids.next("operationProposal");
    const proposal: OperationProposal = {
      id,
      kind: input.kind,
      status: "pending",
      actorId: context.actorId,
      targetType: "return",
      targetId: input.targetId,
      targetKey: input.targetKey,
      beforeValue: input.beforeValue,
      proposedValue: input.proposedValue,
      targetVersion: input.targetVersion,
      contentHash: createOperationHash({
        kind: input.kind,
        targetType: "return",
        targetId: input.targetId,
        targetKey: input.targetKey,
        targetVersion: input.targetVersion,
        beforeValue: input.beforeValue,
        proposedValue: input.proposedValue,
      }),
      reason: input.reason.trim(),
      sourceRevisionId: null,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + PROPOSAL_TTL_MS),
    };
    await this.dependencies.governance.createProposal({
      proposal,
      requestId: context.requestId,
    });
    return proposal;
  }

  private close(
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
        status === "expired" ? "proposal_ttl_elapsed" : "return_publish_failed",
    });
  }
}

export function toCancelValue(
  orderReturn: ReturnDetails
): ReturnCancelOperationValue {
  return {
    returnId: orderReturn.id,
    orderId: orderReturn.orderId,
    displayId: orderReturn.displayId,
    status: orderReturn.status,
    updatedAt: orderReturn.updatedAt.toISOString(),
    items: orderReturn.items
      .map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        receivedQuantity: item.receivedQuantity,
        reasonId: item.reasonId,
      }))
      .sort((left, right) => left.itemId.localeCompare(right.itemId)),
  };
}

function validateReason(reason: string) {
  if (reason.trim().length < 3 || reason.trim().length > 500) {
    throw new ApplicationError(
      "invalid_reason",
      "Reason must contain 3 to 500 characters"
    );
  }
}

function normalizeOptionalText(value: string | null) {
  if (value === null) {
    return null;
  }
  const normalized = value.trim();
  if (normalized.length > 500) {
    throw new ApplicationError(
      "invalid_return",
      "Return notes must contain at most 500 characters"
    );
  }
  return normalized || null;
}

function normalizeId(value: string, label: string) {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 100) {
    throw new ApplicationError(
      "invalid_return",
      `${label} must contain 1 to 100 characters`
    );
  }
  return normalized;
}

function normalizeOptionalId(value: string | null, label: string) {
  return value === null ? null : normalizeId(value, label);
}
