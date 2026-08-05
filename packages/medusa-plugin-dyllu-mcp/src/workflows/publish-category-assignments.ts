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
import { batchLinkProductsToCategoryWorkflow } from "@medusajs/medusa/core-flows";

import { categoryAssignmentOperationValueSchema } from "../application/category-assignment-schema";
import { createOperationHash } from "../domain/operation-hash";
import {
  Actor,
  CategoryAssignmentOperationValue,
  OperationProposal,
  OperationRevision,
  ProductCategoryDetails,
  ProductCategoryTarget,
} from "../domain/types";
import { MedusaOperationGovernanceStore } from "../infrastructure/medusa-governance-store";
import { MedusaMerchandisingDirectory } from "../infrastructure/medusa-merchandising-directory";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "../modules/governance";
import { DylluMcpGovernanceModuleService } from "../modules/governance/service";

export type PublishCategoryAssignmentsWorkflowInput = {
  actor: Actor;
  proposalId: string;
  contentHash: string;
  requestId: string;
  confirmedAt: Date;
};

type ValidatedCategoryAssignments = {
  proposal: OperationProposal;
  beforeValue: CategoryAssignmentOperationValue;
  proposedValue: CategoryAssignmentOperationValue;
};

const validateCategoryAssignmentsStep = createStep(
  "validate-category-assignments",
  async (input: PublishCategoryAssignmentsWorkflowInput, { container }) => {
    const governance = new MedusaOperationGovernanceStore(
      resolveGovernanceService(container)
    );
    const proposal = await governance.findProposal(input.proposalId);
    if (!proposal) {
      throw conflict("The DYLLU category proposal is no longer publishable");
    }
    const beforeValue = categoryAssignmentOperationValueSchema.safeParse(
      proposal.beforeValue
    );
    const proposedValue = categoryAssignmentOperationValueSchema.safeParse(
      proposal.proposedValue
    );
    if (
      !beforeValue.success ||
      !proposedValue.success ||
      !proposal.targetId ||
      !proposal.targetVersion ||
      proposal.targetType !== "product_category" ||
      (proposal.kind !== "category_assignment_update" &&
        proposal.kind !== "category_assignment_rollback") ||
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
      throw conflict("The DYLLU category proposal is no longer publishable");
    }
    const directory = new MedusaMerchandisingDirectory(resolveQuery(container));
    const category = await directory.findCategoryById(proposal.targetId);
    if (
      !category ||
      category.updatedAt.toISOString() !== proposal.targetVersion
    ) {
      throw conflict(
        "The DYLLU product category changed after the proposal was created"
      );
    }
    const targets = await directory.findProductTargets(
      beforeValue.data.products.map((product) => product.productId),
      category.id
    );
    const currentValue = buildValue(category, targets);
    if (JSON.stringify(currentValue) !== JSON.stringify(beforeValue.data)) {
      throw conflict(
        "A DYLLU category assignment changed after the proposal was created"
      );
    }
    return new StepResponse<ValidatedCategoryAssignments>({
      proposal,
      beforeValue: beforeValue.data,
      proposedValue: proposedValue.data,
    });
  }
);

const recordCategoryRevisionStep = createStep(
  "record-category-revision",
  async (
    input: PublishCategoryAssignmentsWorkflowInput &
      ValidatedCategoryAssignments & { batchResult: unknown },
    { container }
  ) => {
    const directory = new MedusaMerchandisingDirectory(resolveQuery(container));
    const category = await directory.findCategoryById(input.proposal.targetId!);
    if (!category) {
      throw conflict("The DYLLU product category was not updated as expected");
    }
    const targets = await directory.findProductTargets(
      input.proposedValue.products.map((product) => product.productId),
      category.id
    );
    const afterValue = buildValue(category, targets);
    if (!sameAssignmentIntent(afterValue, input.proposedValue)) {
      throw conflict("The DYLLU product category was not updated as expected");
    }
    const revision: OperationRevision = {
      id: generateEntityId(undefined, "mcporev"),
      proposalId: input.proposal.id,
      kind: input.proposal.kind,
      action:
        input.proposal.kind === "category_assignment_rollback"
          ? "rollback"
          : "update",
      actor: input.actor,
      targetType: "product_category",
      targetId: category.id,
      targetKey: `product-category:${category.id}`,
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

export const dylluMcpPublishCategoryAssignmentsWorkflow = createWorkflow(
  "dyllu-mcp-publish-category-assignments",
  (input: PublishCategoryAssignmentsWorkflowInput) => {
    const validated = validateCategoryAssignmentsStep(input);
    const batchInput = transform(validated, (change) => {
      const beforeByProduct = new Map(
        change.beforeValue.products.map((product) => [
          product.productId,
          product,
        ])
      );
      return {
        id: change.proposal.targetId!,
        add: change.proposedValue.products
          .filter(
            (product) =>
              product.assigned &&
              !beforeByProduct.get(product.productId)?.assigned
          )
          .map((product) => product.productId),
        remove: change.proposedValue.products
          .filter(
            (product) =>
              !product.assigned &&
              beforeByProduct.get(product.productId)?.assigned
          )
          .map((product) => product.productId),
      };
    });
    const batchResult = batchLinkProductsToCategoryWorkflow.runAsStep({
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
    return new WorkflowResponse(recordCategoryRevisionStep(revisionInput));
  }
);

function buildValue(
  category: ProductCategoryDetails,
  targets: ProductCategoryTarget[]
): CategoryAssignmentOperationValue {
  return {
    category: {
      id: category.id,
      name: category.name,
      handle: category.handle,
      updatedAt: category.updatedAt.toISOString(),
    },
    products: targets
      .map((target) => ({
        productId: target.productId,
        productTitle: target.productTitle,
        productHandle: target.productHandle,
        productStatus: target.productStatus,
        productUpdatedAt: target.productUpdatedAt.toISOString(),
        assigned: target.assigned,
      }))
      .sort((left, right) => left.productId.localeCompare(right.productId)),
  };
}

function sameAssignmentIntent(
  actual: CategoryAssignmentOperationValue,
  expected: CategoryAssignmentOperationValue
) {
  return (
    actual.category.id === expected.category.id &&
    actual.products.length === expected.products.length &&
    actual.products.every(
      (product, index) =>
        product.productId === expected.products[index]?.productId &&
        product.assigned === expected.products[index]?.assigned
    )
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
