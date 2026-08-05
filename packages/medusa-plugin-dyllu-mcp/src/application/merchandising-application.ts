import { createOperationHash } from "../domain/operation-hash";
import {
  Actor,
  CategoryAssignmentOperationValue,
  ConfirmationReceipt,
  OperationProposal,
  RequestContext,
} from "../domain/types";
import { categoryAssignmentOperationValueSchema } from "./category-assignment-schema";
import { ApplicationError } from "./errors";
import {
  Clock,
  IdGenerator,
  MerchandisingChangeExecutor,
  MerchandisingDirectory,
  OperationGovernanceStore,
} from "./ports";

const PROPOSAL_TTL_MS = 30 * 60 * 1000;
const MAX_REASON_LENGTH = 500;

export type ProposeCategoryAssignmentsInput = {
  categoryId: string;
  addProductIds: string[];
  removeProductIds: string[];
  reason: string;
};

export type PublishCategoryAssignmentsInput = {
  proposalId: string;
  confirmation: ConfirmationReceipt;
  requestId: string;
};

export class MerchandisingApplication {
  constructor(
    private readonly dependencies: {
      directory: MerchandisingDirectory;
      governance: OperationGovernanceStore;
      executor: MerchandisingChangeExecutor;
      clock: Clock;
      ids: IdGenerator;
    }
  ) {}

  listCategories(input: { limit: number; offset: number }) {
    if (
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 50 ||
      !Number.isSafeInteger(input.offset) ||
      input.offset < 0 ||
      input.offset > 10_000
    ) {
      throw new ApplicationError(
        "invalid_category_page",
        "Category page limits are invalid"
      );
    }
    return this.dependencies.directory.listCategories(input);
  }

  async getCategory(
    categoryId: string,
    input: { limit: number; offset: number }
  ) {
    const category =
      await this.dependencies.directory.findCategoryById(categoryId);
    if (!category) {
      throw new ApplicationError(
        "category_not_found",
        `DYLLU product category ${categoryId} was not found`
      );
    }
    const page = await this.dependencies.directory.listCategoryProducts(
      categoryId,
      input
    );
    return { ...category, products: page.products, productCount: page.count };
  }

  async proposeCategoryAssignments(
    context: RequestContext,
    input: ProposeCategoryAssignmentsInput
  ) {
    this.validateReason(input.reason);
    const addProductIds = input.addProductIds.map((id) => id.trim());
    const removeProductIds = input.removeProductIds.map((id) => id.trim());
    const productIds = [...addProductIds, ...removeProductIds];
    if (
      productIds.length < 1 ||
      productIds.length > 100 ||
      productIds.some((id) => !id) ||
      new Set(productIds).size !== productIds.length
    ) {
      throw new ApplicationError(
        "invalid_category_assignment",
        "A category proposal must change 1 to 100 unique DYLLU products"
      );
    }
    const category = await this.dependencies.directory.findCategoryById(
      input.categoryId.trim()
    );
    if (!category) {
      throw new ApplicationError(
        "category_not_found",
        `DYLLU product category ${input.categoryId} was not found`
      );
    }
    const targets = await this.dependencies.directory.findProductTargets(
      productIds,
      category.id
    );
    const targetByProduct = new Map(
      targets.map((target) => [target.productId, target])
    );
    if (targetByProduct.size !== productIds.length) {
      throw new ApplicationError(
        "product_not_found",
        "Each selected DYLLU product must exist"
      );
    }
    for (const productId of addProductIds) {
      if (targetByProduct.get(productId)!.assigned) {
        throw new ApplicationError(
          "unchanged_category_assignment",
          `DYLLU product ${productId} is already in this category`
        );
      }
    }
    for (const productId of removeProductIds) {
      if (!targetByProduct.get(productId)!.assigned) {
        throw new ApplicationError(
          "unchanged_category_assignment",
          `DYLLU product ${productId} is not in this category`
        );
      }
    }
    const beforeValue = this.buildValue(category, targets);
    const addSet = new Set(addProductIds);
    const proposedValue: CategoryAssignmentOperationValue = {
      ...beforeValue,
      products: beforeValue.products.map((product) => ({
        ...product,
        assigned: addSet.has(product.productId),
      })),
    };
    return this.storeProposal(context, {
      kind: "category_assignment_update",
      beforeValue,
      proposedValue,
      reason: input.reason,
      sourceRevisionId: null,
    });
  }

  async listCategoryHistory(categoryId: string, limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
      throw new ApplicationError(
        "invalid_audit_limit",
        "Category history limit must be between 1 and 50"
      );
    }
    return this.dependencies.governance.listRevisions(
      `product-category:${categoryId}`,
      limit
    );
  }

  async proposeCategoryRollback(
    context: RequestContext,
    input: { revisionId: string; reason: string }
  ) {
    this.validateReason(input.reason);
    const source = await this.dependencies.governance.findRevision(
      input.revisionId
    );
    if (
      !source ||
      source.targetType !== "product_category" ||
      (source.kind !== "category_assignment_update" &&
        source.kind !== "category_assignment_rollback")
    ) {
      throw new ApplicationError(
        "revision_not_found",
        `Category revision ${input.revisionId} was not found`
      );
    }
    const historical = categoryAssignmentOperationValueSchema.safeParse(
      source.beforeValue
    );
    if (!historical.success) {
      throw new ApplicationError(
        "invalid_category_revision",
        "The historical category assignment cannot be restored safely"
      );
    }
    const category = await this.dependencies.directory.findCategoryById(
      source.targetId
    );
    if (!category) {
      throw new ApplicationError(
        "category_not_found",
        `DYLLU product category ${source.targetId} was not found`
      );
    }
    const productIds = historical.data.products.map(
      (product) => product.productId
    );
    const targets = await this.dependencies.directory.findProductTargets(
      productIds,
      category.id
    );
    if (targets.length !== productIds.length) {
      throw new ApplicationError(
        "product_not_found",
        "A DYLLU product from this category revision no longer exists"
      );
    }
    const beforeValue = this.buildValue(category, targets);
    const historicalByProduct = new Map(
      historical.data.products.map((product) => [product.productId, product])
    );
    const proposedValue: CategoryAssignmentOperationValue = {
      ...beforeValue,
      products: beforeValue.products.map((product) => ({
        ...product,
        assigned: historicalByProduct.get(product.productId)!.assigned,
      })),
    };
    if (sameAssignments(beforeValue, proposedValue)) {
      throw new ApplicationError(
        "unchanged_category_assignment",
        "The DYLLU category already has the selected historical assignments"
      );
    }
    return this.storeProposal(context, {
      kind: "category_assignment_rollback",
      beforeValue,
      proposedValue,
      reason: input.reason,
      sourceRevisionId: source.id,
    });
  }

  async publishCategoryAssignments(
    actor: Actor,
    input: PublishCategoryAssignmentsInput
  ) {
    const proposal = await this.dependencies.governance.findProposal(
      input.proposalId
    );
    if (
      !proposal ||
      proposal.targetType !== "product_category" ||
      (proposal.kind !== "category_assignment_update" &&
        proposal.kind !== "category_assignment_rollback")
    ) {
      throw new ApplicationError(
        "proposal_not_found",
        `Category proposal ${input.proposalId} was not found`
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
      await this.dependencies.governance.closeProposal({
        actorId: actor.id,
        proposalId: proposal.id,
        targetKey: proposal.targetKey,
        requestId: input.requestId,
        occurredAt: this.dependencies.clock.now(),
        status: "expired",
        reason: "proposal_ttl_elapsed",
      });
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
      return await this.dependencies.executor.publishCategoryAssignments({
        actor,
        proposal,
        requestId: input.requestId,
        confirmedAt: input.confirmation.confirmedAt,
      });
    } catch (error) {
      await this.dependencies.governance.closeProposal({
        actorId: actor.id,
        proposalId: proposal.id,
        targetKey: proposal.targetKey,
        requestId: input.requestId,
        occurredAt: this.dependencies.clock.now(),
        status: "failed",
        reason: "category_publish_failed",
      });
      throw error;
    }
  }

  private buildValue(
    category: Awaited<
      ReturnType<MerchandisingDirectory["findCategoryById"]>
    > & {},
    targets: Awaited<ReturnType<MerchandisingDirectory["findProductTargets"]>>
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

  private async storeProposal(
    context: RequestContext,
    input: {
      kind: "category_assignment_update" | "category_assignment_rollback";
      beforeValue: CategoryAssignmentOperationValue;
      proposedValue: CategoryAssignmentOperationValue;
      reason: string;
      sourceRevisionId: string | null;
    }
  ) {
    const createdAt = this.dependencies.clock.now();
    const id = this.dependencies.ids.next("operationProposal");
    const categoryId = input.beforeValue.category.id;
    const targetKey = `product-category:${categoryId}`;
    const targetVersion = input.beforeValue.category.updatedAt;
    const proposal: OperationProposal = {
      id,
      kind: input.kind,
      status: "pending",
      actorId: context.actorId,
      targetType: "product_category",
      targetId: categoryId,
      targetKey,
      beforeValue: input.beforeValue,
      proposedValue: input.proposedValue,
      targetVersion,
      contentHash: createOperationHash({
        kind: input.kind,
        targetType: "product_category",
        targetId: categoryId,
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

  private validateReason(reason: string) {
    const trimmed = reason.trim();
    if (trimmed.length < 3 || trimmed.length > MAX_REASON_LENGTH) {
      throw new ApplicationError(
        "invalid_reason",
        "Reason must contain 3 to 500 characters"
      );
    }
  }
}

function sameAssignments(
  left: CategoryAssignmentOperationValue,
  right: CategoryAssignmentOperationValue
) {
  return left.products.every(
    (product, index) =>
      product.productId === right.products[index]?.productId &&
      product.assigned === right.products[index]?.assigned
  );
}
