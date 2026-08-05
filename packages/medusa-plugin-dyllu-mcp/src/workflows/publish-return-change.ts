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
  cancelReturnWorkflow,
  createAndCompleteReturnOrderWorkflow,
} from "@medusajs/medusa/core-flows";
import { z } from "@medusajs/framework/zod";

import { createOperationHash } from "../domain/operation-hash";
import {
  Actor,
  OperationProposal,
  OperationRevision,
  ReturnCancelOperationValue,
  ReturnRequestOperationValue,
} from "../domain/types";
import {
  returnCancelOperationValueSchema,
  returnRequestOperationValueSchema,
} from "../application/return-operation-schema";
import { toCancelValue } from "../application/return-application";
import { MedusaOperationGovernanceStore } from "../infrastructure/medusa-governance-store";
import { MedusaReturnDirectory } from "../infrastructure/medusa-return-directory";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishReturnChangeWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedReturnCreate = {
  proposal: OperationProposal;
  beforeValue: ReturnRequestOperationValue;
  proposedValue: ReturnRequestOperationValue;
};

type ValidatedReturnCancel = {
  proposal: OperationProposal;
  beforeValue: ReturnCancelOperationValue;
  proposedValue: ReturnCancelOperationValue;
};

const validateReturnCreateStep = createStep(
  "validate-return-create",
  async (input: PublishReturnChangeWorkflowInput, { container }) => {
    const proposal = await loadProposal(container, input);
    const beforeValue = returnRequestOperationValueSchema.safeParse(
      proposal.beforeValue
    );
    const proposedValue = returnRequestOperationValueSchema.safeParse(
      proposal.proposedValue
    );
    if (
      proposal.kind !== "return_request_create" ||
      proposal.targetType !== "return" ||
      proposal.targetId !== null ||
      !beforeValue.success ||
      !proposedValue.success
    ) {
      throw conflict("The DYLLU return proposal is no longer publishable");
    }
    const directory = new MedusaReturnDirectory(resolveQuery(container));
    const order = await directory.findOrderTarget(beforeValue.data.order.id);
    if (
      !order ||
      order.status === "canceled" ||
      order.updatedAt.toISOString() !== proposal.targetVersion
    ) {
      throw conflict("The DYLLU order changed after the proposal was created");
    }
    const existing = await directory.listForOrder(order.id);
    const returnedByItem = new Map<string, number>();
    for (const orderReturn of existing) {
      if (orderReturn.status === "canceled") {
        continue;
      }
      for (const item of orderReturn.items) {
        returnedByItem.set(
          item.itemId,
          (returnedByItem.get(item.itemId) ?? 0) + item.quantity
        );
      }
    }
    const orderItems = new Map(order.items.map((item) => [item.id, item]));
    for (const requested of proposedValue.data.items) {
      const orderItem = orderItems.get(requested.itemId);
      const alreadyReturned = returnedByItem.get(requested.itemId) ?? 0;
      if (
        !orderItem ||
        requested.orderedQuantity !== orderItem.quantity ||
        requested.alreadyReturnedQuantity !== alreadyReturned ||
        requested.requestQuantity < 1 ||
        requested.requestQuantity > orderItem.quantity - alreadyReturned
      ) {
        throw conflict("The available DYLLU return quantity changed");
      }
    }
    return new StepResponse<ValidatedReturnCreate>({
      proposal,
      beforeValue: beforeValue.data,
      proposedValue: proposedValue.data,
    });
  }
);

const validateReturnCancelStep = createStep(
  "validate-return-cancel",
  async (input: PublishReturnChangeWorkflowInput, { container }) => {
    const proposal = await loadProposal(container, input);
    const beforeValue = returnCancelOperationValueSchema.safeParse(
      proposal.beforeValue
    );
    const proposedValue = returnCancelOperationValueSchema.safeParse(
      proposal.proposedValue
    );
    if (
      proposal.kind !== "return_cancel" ||
      proposal.targetType !== "return" ||
      !proposal.targetId ||
      !beforeValue.success ||
      !proposedValue.success ||
      proposedValue.data.status !== "canceled"
    ) {
      throw conflict("The DYLLU return proposal is no longer publishable");
    }
    const directory = new MedusaReturnDirectory(resolveQuery(container));
    const current = await directory.findById(proposal.targetId);
    if (
      !current ||
      JSON.stringify(toCancelValue(current)) !==
        JSON.stringify(beforeValue.data)
    ) {
      throw conflict("The DYLLU return changed after the proposal was created");
    }
    return new StepResponse<ValidatedReturnCancel>({
      proposal,
      beforeValue: beforeValue.data,
      proposedValue: proposedValue.data,
    });
  }
);

const recordCreatedReturnRevisionStep = createStep(
  "record-created-return-revision",
  async (
    input: PublishReturnChangeWorkflowInput &
      ValidatedReturnCreate & { createdReturn: unknown },
    { container }
  ) => {
    const created = z.object({ id: z.string() }).parse(input.createdReturn);
    const revision = await recordRevision(
      container,
      input,
      created.id,
      input.beforeValue
    );
    return new StepResponse(revision);
  }
);

const recordCanceledReturnRevisionStep = createStep(
  "record-canceled-return-revision",
  async (
    input: PublishReturnChangeWorkflowInput &
      ValidatedReturnCancel & { cancelResult: unknown },
    { container }
  ) => {
    const revision = await recordRevision(
      container,
      input,
      input.proposal.targetId!,
      input.beforeValue
    );
    return new StepResponse(revision);
  }
);

export const dylluMcpPublishReturnCreateWorkflow = createWorkflow(
  "dyllu-mcp-publish-return-create",
  (input: PublishReturnChangeWorkflowInput) => {
    const validated = validateReturnCreateStep(input);
    const createInput = transform(validated, (change) => ({
      order_id: change.proposedValue.order.id,
      created_by: change.proposal.actorId,
      items: change.proposedValue.items.map((item) => ({
        id: item.itemId,
        quantity: item.requestQuantity,
        reason_id: item.reasonId,
        note: item.note,
      })),
      note: change.proposedValue.note,
      receive_now: false,
    }));
    const createdReturn = createAndCompleteReturnOrderWorkflow.runAsStep({
      input: createInput,
    });
    const revisionInput = transform(
      { input, validated, createdReturn },
      ({ input: workflowInput, validated: change, createdReturn: result }) => ({
        ...workflowInput,
        ...change,
        createdReturn: result,
      })
    );
    return new WorkflowResponse(recordCreatedReturnRevisionStep(revisionInput));
  }
);

export const dylluMcpPublishReturnCancelWorkflow = createWorkflow(
  "dyllu-mcp-publish-return-cancel",
  (input: PublishReturnChangeWorkflowInput) => {
    const validated = validateReturnCancelStep(input);
    const cancelInput = transform(validated, (change) => ({
      return_id: change.proposal.targetId!,
    }));
    const cancelResult = cancelReturnWorkflow.runAsStep({ input: cancelInput });
    const revisionInput = transform(
      { input, validated, cancelResult },
      ({ input: workflowInput, validated: change, cancelResult: result }) => ({
        ...workflowInput,
        ...change,
        cancelResult: result,
      })
    );
    return new WorkflowResponse(
      recordCanceledReturnRevisionStep(revisionInput)
    );
  }
);

async function loadProposal(
  container: MedusaContainer,
  input: PublishReturnChangeWorkflowInput
) {
  const governance = new MedusaOperationGovernanceStore(
    resolveGovernanceService(container)
  );
  const proposal = await governance.findProposal(input.proposalId);
  if (
    !proposal ||
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
    throw conflict("The DYLLU return proposal is no longer publishable");
  }
  return proposal;
}

async function recordRevision(
  container: MedusaContainer,
  input: PublishReturnChangeWorkflowInput & {
    proposal: OperationProposal;
  },
  returnId: string,
  beforeValue: Record<string, unknown>
) {
  const directory = new MedusaReturnDirectory(resolveQuery(container));
  const current = await directory.findById(returnId);
  if (
    !current ||
    (input.proposal.kind === "return_request_create" &&
      current.status !== "requested") ||
    (input.proposal.kind === "return_cancel" && current.status !== "canceled")
  ) {
    throw conflict("The DYLLU return was not updated as expected");
  }
  const revision: OperationRevision = {
    id: generateEntityId(undefined, "mcporev"),
    proposalId: input.proposal.id,
    kind: input.proposal.kind,
    action: "update",
    actor: input.actor,
    targetType: "return",
    targetId: current.id,
    targetKey: `return:${current.id}`,
    beforeValue,
    afterValue: toCancelValue(current),
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
  return revision;
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
