import {
  Clock,
  GovernanceStore,
  IdGenerator,
  OrderDirectory,
  OrderListQuery,
  ProductCatalog,
  ProductChangeExecutor,
  UserDirectory,
  CapabilityStore,
} from "./ports";
import { ProductSearch } from "./ports";
import {
  AuditEvent,
  Capability,
  ConfirmationReceipt,
  ProductChangeProposal,
  ProductDescriptionProposal,
  ProductDescriptionRevision,
  ProductPriceProposal,
  ProductPriceRevision,
  RequestContext,
  capabilities as availableCapabilities,
} from "../domain/types";
import { ApplicationError } from "./errors";
import { createProductDescriptionHash } from "../domain/product-description-hash";
import { createCatalogChangeHash } from "../domain/catalog-change-hash";

const PROPOSAL_TTL_MS = 30 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 20_000;
const MAX_REASON_LENGTH = 500;

export type ProposeDescriptionInput = {
  productId: string;
  proposedDescription: string;
  reason: string;
};

export type PublishDescriptionInput = {
  proposalId: string;
  confirmation: ConfirmationReceipt;
};

export type PublishPriceInput = PublishDescriptionInput;

export type ProposePriceInput = {
  productId: string;
  variantId: string;
  priceId: string;
  currencyCode: string;
  proposedAmount: number;
  reason: string;
};

export type ProposeRollbackInput = {
  revisionId: string;
  reason: string;
};

export type ReplaceUserAccessInput = {
  userId: string;
  capabilities: Capability[];
};

export type AuditEventQuery = {
  actorId?: string;
  targetId?: string;
  limit: number;
};

export type ProductChangeApplicationDependencies = {
  users: UserDirectory;
  capabilities: CapabilityStore;
  products: ProductCatalog;
  orders: OrderDirectory;
  governance: GovernanceStore;
  executor: ProductChangeExecutor;
  clock: Clock;
  ids: IdGenerator;
};

export class ProductChangeApplication {
  constructor(
    private readonly dependencies: ProductChangeApplicationDependencies
  ) {}

  async getMyAccess(context: RequestContext) {
    const actor = await this.requireActiveActor(context, context.actorId);
    const granted = await this.dependencies.capabilities.listForUser(actor.id);
    return { actor, capabilities: granted };
  }

  async getUserAccess(context: RequestContext, userId: string) {
    await this.requireCapability(context, "capability.manage", userId);
    const actor = await this.dependencies.users.findActiveUser(userId);
    if (!actor) {
      throw new ApplicationError(
        "actor_not_active",
        "The selected DYLLU user is not active"
      );
    }
    const granted = await this.dependencies.capabilities.listForUser(actor.id);
    return { actor, capabilities: granted };
  }

  async replaceUserAccess(
    context: RequestContext,
    input: ReplaceUserAccessInput
  ) {
    await this.requireCapability(context, "capability.manage", input.userId);
    const actor = await this.dependencies.users.findActiveUser(input.userId);
    if (!actor) {
      throw new ApplicationError(
        "actor_not_active",
        "The selected DYLLU user is not active"
      );
    }
    const requested = new Set(input.capabilities);
    const granted = availableCapabilities.filter((capability) =>
      requested.has(capability)
    );
    await this.dependencies.capabilities.replaceForUser({
      actorId: context.actorId,
      userId: actor.id,
      capabilities: granted,
      requestId: context.requestId,
      occurredAt: this.dependencies.clock.now(),
    });
    return { actor, capabilities: granted };
  }

  async searchProducts(context: RequestContext, input: ProductSearch) {
    await this.requireCapability(context, "product.read", input.query);
    return this.dependencies.products.search(input);
  }

  async listOrders(context: RequestContext, input: OrderListQuery) {
    await this.requireCapability(context, "order.read", input.localDate);
    return this.dependencies.orders.list(input);
  }

  async getOrder(context: RequestContext, reference: string) {
    await this.requireCapability(context, "order.read", reference);
    const order = await this.dependencies.orders.findByReference(reference);
    if (!order) {
      throw new ApplicationError(
        "order_not_found",
        `DYLLU order ${reference} was not found`
      );
    }
    return order;
  }

  async getProduct(context: RequestContext, productId: string) {
    await this.requireCapability(context, "product.read", productId);
    const product = await this.dependencies.products.findById(productId);
    if (!product) {
      throw new ApplicationError(
        "product_not_found",
        `DYLLU product ${productId} was not found`
      );
    }
    return product;
  }

  async getProposal(context: RequestContext, proposalId: string) {
    const actor = await this.requireActiveActor(context, proposalId);
    const proposal =
      await this.dependencies.governance.findProposal(proposalId);
    if (!proposal) {
      throw new ApplicationError(
        "proposal_not_found",
        `Proposal ${proposalId} was not found`
      );
    }
    const granted = await this.dependencies.capabilities.listForUser(actor.id);
    const requiredCapability = this.requiredCapabilityForProposal(proposal);
    const canAudit = granted.includes("audit.read");
    const canReadOwn =
      proposal.actorId === actor.id && granted.includes(requiredCapability);
    if (!canAudit && !canReadOwn) {
      await this.recordAuthorizationDenied(
        context,
        requiredCapability,
        proposal.productId,
        "capability_denied"
      );
      throw new ApplicationError(
        "capability_denied",
        "The proposal is not available to this user"
      );
    }
    return proposal;
  }

  async listProductHistory(
    context: RequestContext,
    productId: string,
    limit: number
  ) {
    await this.requireCapability(context, "audit.read", productId);
    return this.dependencies.governance.listRevisions(productId, limit);
  }

  async listAuditEvents(context: RequestContext, input: AuditEventQuery) {
    await this.requireCapability(
      context,
      "audit.read",
      input.targetId ?? input.actorId ?? "audit"
    );
    if (input.limit < 1 || input.limit > 100) {
      throw new ApplicationError(
        "invalid_audit_limit",
        "Audit event limit must be between 1 and 100"
      );
    }
    const events = await this.dependencies.governance.listEvents(input);
    return events.map((event) =>
      event.details.capability === "active_medusa_user"
        ? {
            ...event,
            details: { ...event.details, capability: "active_dyllu_user" },
          }
        : event
    );
  }

  async proposeDescription(
    context: RequestContext,
    input: ProposeDescriptionInput
  ): Promise<ProductDescriptionProposal> {
    await this.requireCapability(
      context,
      "product_content.update",
      input.productId
    );
    this.validateDescription(input.proposedDescription);
    this.validateReason(input.reason);

    const product = await this.dependencies.products.findById(input.productId);
    if (!product) {
      throw new ApplicationError(
        "product_not_found",
        `DYLLU product ${input.productId} was not found`
      );
    }

    const beforeValue = product.description ?? "";
    if (beforeValue === input.proposedDescription) {
      throw new ApplicationError(
        "unchanged_description",
        "The proposed description is identical to the current description"
      );
    }

    const createdAt = this.dependencies.clock.now();
    const proposal: ProductDescriptionProposal = {
      id: this.dependencies.ids.next("proposal"),
      kind: "description_update",
      status: "pending",
      actorId: context.actorId,
      productId: product.id,
      productTitle: product.title,
      variantId: null,
      priceId: null,
      currencyCode: null,
      beforeValue,
      proposedValue: input.proposedDescription,
      targetUpdatedAt: product.updatedAt,
      contentHash: createProductDescriptionHash({
        productId: product.id,
        productUpdatedAt: product.updatedAt,
        beforeValue,
        proposedValue: input.proposedDescription,
      }),
      reason: input.reason,
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

  async proposePrice(
    context: RequestContext,
    input: ProposePriceInput
  ): Promise<ProductPriceProposal> {
    await this.requireCapability(
      context,
      "product_price.update",
      input.productId
    );
    this.validateReason(input.reason);
    const currencyCode = input.currencyCode.trim().toLowerCase();
    if (
      currencyCode !== "mdl" ||
      !Number.isSafeInteger(input.proposedAmount) ||
      input.proposedAmount < 1 ||
      input.proposedAmount > 100_000_000
    ) {
      throw new ApplicationError(
        "invalid_price",
        "Price must be a positive whole MDL amount"
      );
    }

    const target = await this.dependencies.products.findVariantPrice({
      productId: input.productId,
      variantId: input.variantId,
      priceId: input.priceId,
      currencyCode,
    });
    if (!target) {
      throw new ApplicationError(
        "price_not_found",
        "The selected DYLLU variant price was not found"
      );
    }
    if (target.amount === input.proposedAmount) {
      throw new ApplicationError(
        "unchanged_price",
        "The proposed price is identical to the current price"
      );
    }

    const createdAt = this.dependencies.clock.now();
    const beforeValue = String(target.amount);
    const proposedValue = String(input.proposedAmount);
    const proposal: ProductPriceProposal = {
      id: this.dependencies.ids.next("proposal"),
      kind: "price_update",
      status: "pending",
      actorId: context.actorId,
      productId: target.productId,
      productTitle: target.productTitle,
      variantId: target.variantId,
      priceId: target.priceId,
      currencyCode: target.currencyCode,
      beforeValue,
      proposedValue,
      targetUpdatedAt: target.updatedAt,
      contentHash: createCatalogChangeHash({
        kind: "price_update",
        productId: target.productId,
        variantId: target.variantId,
        priceId: target.priceId,
        currencyCode: target.currencyCode,
        targetUpdatedAt: target.updatedAt,
        beforeValue,
        proposedValue,
      }),
      reason: input.reason,
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

  async publishDescription(
    context: RequestContext,
    input: PublishDescriptionInput
  ): Promise<ProductDescriptionRevision> {
    const { actor, proposal } = await this.requireOwnedPendingProposal(
      context,
      input.proposalId
    );
    if (
      proposal.kind !== "description_update" &&
      proposal.kind !== "description_rollback"
    ) {
      throw new ApplicationError(
        "proposal_kind_mismatch",
        "The proposal is not a description change"
      );
    }

    const currentTime = this.dependencies.clock.now();
    if (proposal.expiresAt.getTime() <= currentTime.getTime()) {
      await this.dependencies.governance.closeProposal({
        actorId: actor.id,
        proposalId: proposal.id,
        productId: proposal.productId,
        requestId: context.requestId,
        occurredAt: currentTime,
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

    const product = await this.dependencies.products.findById(
      proposal.productId
    );
    if (!product) {
      await this.failProposal(context, proposal, "product_missing_at_publish");
      throw new ApplicationError(
        "product_not_found",
        `DYLLU product ${proposal.productId} was not found`
      );
    }
    if (
      product.updatedAt.getTime() !== proposal.targetUpdatedAt.getTime() ||
      (product.description ?? "") !== proposal.beforeValue
    ) {
      await this.failProposal(
        context,
        proposal,
        "product_changed_after_proposal"
      );
      throw new ApplicationError(
        "stale_product",
        "The DYLLU product changed after this proposal was created"
      );
    }

    try {
      return await this.dependencies.executor.publishDescription({
        actor,
        proposal,
        requestId: context.requestId,
        confirmedAt: input.confirmation.confirmedAt,
      });
    } catch (error) {
      await this.failProposal(context, proposal, "publish_execution_failed");
      throw error;
    }
  }

  async publishPrice(
    context: RequestContext,
    input: PublishPriceInput
  ): Promise<ProductPriceRevision> {
    const { actor, proposal } = await this.requireOwnedPendingProposal(
      context,
      input.proposalId
    );
    if (
      proposal.kind !== "price_update" &&
      proposal.kind !== "price_rollback"
    ) {
      throw new ApplicationError(
        "proposal_kind_mismatch",
        "The proposal is not a price change"
      );
    }

    const currentTime = this.dependencies.clock.now();
    if (proposal.expiresAt.getTime() <= currentTime.getTime()) {
      await this.dependencies.governance.closeProposal({
        actorId: actor.id,
        proposalId: proposal.id,
        productId: proposal.productId,
        requestId: context.requestId,
        occurredAt: currentTime,
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

    const target = await this.dependencies.products.findVariantPrice({
      productId: proposal.productId,
      variantId: proposal.variantId,
      priceId: proposal.priceId,
      currencyCode: proposal.currencyCode,
    });
    if (
      !target ||
      target.updatedAt.getTime() !== proposal.targetUpdatedAt.getTime() ||
      String(target.amount) !== proposal.beforeValue
    ) {
      await this.failProposal(
        context,
        proposal,
        "price_changed_after_proposal"
      );
      throw new ApplicationError(
        "stale_price",
        "The price changed after this proposal was created"
      );
    }

    try {
      return await this.dependencies.executor.publishPrice({
        actor,
        proposal,
        requestId: context.requestId,
        confirmedAt: input.confirmation.confirmedAt,
      });
    } catch (error) {
      await this.failProposal(context, proposal, "publish_execution_failed");
      throw error;
    }
  }

  async rejectProposal(context: RequestContext, proposalId: string) {
    const { actor, proposal } = await this.requireOwnedPendingProposal(
      context,
      proposalId
    );
    await this.dependencies.governance.closeProposal({
      actorId: actor.id,
      proposalId: proposal.id,
      productId: proposal.productId,
      requestId: context.requestId,
      occurredAt: this.dependencies.clock.now(),
      status: "rejected",
      reason: "manager_declined_or_cancelled",
    });
    return {
      proposalId: proposal.id,
      status: "rejected" as const,
    };
  }

  async proposeRollback(
    context: RequestContext,
    input: ProposeRollbackInput
  ): Promise<ProductDescriptionProposal> {
    await this.requireCapability(context, "product.rollback", input.revisionId);
    const revision = await this.dependencies.governance.findRevision(
      input.revisionId
    );
    if (!revision) {
      throw new ApplicationError(
        "revision_not_found",
        `Revision ${input.revisionId} was not found`
      );
    }
    if (
      revision.kind !== "description_update" &&
      revision.kind !== "description_rollback"
    ) {
      throw new ApplicationError(
        "revision_kind_mismatch",
        "The revision is not a description change"
      );
    }

    const product = await this.dependencies.products.findById(
      revision.productId
    );
    if (!product) {
      throw new ApplicationError(
        "product_not_found",
        `DYLLU product ${revision.productId} was not found`
      );
    }

    const beforeValue = product.description ?? "";
    const proposedValue = revision.beforeValue;
    this.validateDescription(proposedValue);
    this.validateReason(input.reason);
    if (beforeValue === proposedValue) {
      throw new ApplicationError(
        "unchanged_description",
        "The DYLLU product already has the selected historical description"
      );
    }

    const createdAt = this.dependencies.clock.now();
    const proposal: ProductDescriptionProposal = {
      id: this.dependencies.ids.next("proposal"),
      kind: "description_rollback",
      status: "pending",
      actorId: context.actorId,
      productId: product.id,
      productTitle: product.title,
      variantId: null,
      priceId: null,
      currencyCode: null,
      beforeValue,
      proposedValue,
      targetUpdatedAt: product.updatedAt,
      contentHash: createProductDescriptionHash({
        productId: product.id,
        productUpdatedAt: product.updatedAt,
        beforeValue,
        proposedValue,
      }),
      reason: input.reason,
      sourceRevisionId: revision.id,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + PROPOSAL_TTL_MS),
    };

    await this.dependencies.governance.createProposal({
      proposal,
      requestId: context.requestId,
    });

    return proposal;
  }

  async proposePriceRollback(
    context: RequestContext,
    input: ProposeRollbackInput
  ): Promise<ProductPriceProposal> {
    await this.requireCapability(context, "product.rollback", input.revisionId);
    this.validateReason(input.reason);
    const revision = await this.dependencies.governance.findRevision(
      input.revisionId
    );
    if (!revision) {
      throw new ApplicationError(
        "revision_not_found",
        `Revision ${input.revisionId} was not found`
      );
    }
    if (
      (revision.kind !== "price_update" &&
        revision.kind !== "price_rollback") ||
      !revision.variantId ||
      !revision.priceId ||
      !revision.currencyCode
    ) {
      throw new ApplicationError(
        "revision_kind_mismatch",
        "The revision is not a price change"
      );
    }

    const target = await this.dependencies.products.findVariantPrice({
      productId: revision.productId,
      variantId: revision.variantId,
      priceId: revision.priceId,
      currencyCode: revision.currencyCode,
    });
    if (!target) {
      throw new ApplicationError(
        "price_not_found",
        "The selected DYLLU variant price was not found"
      );
    }
    const proposedAmount = Number(revision.beforeValue);
    if (
      !Number.isSafeInteger(proposedAmount) ||
      proposedAmount < 1 ||
      proposedAmount > 100_000_000
    ) {
      throw new ApplicationError(
        "invalid_revision_price",
        "The historical price cannot be restored safely"
      );
    }
    if (target.amount === proposedAmount) {
      throw new ApplicationError(
        "unchanged_price",
        "The price already has the selected historical value"
      );
    }

    const createdAt = this.dependencies.clock.now();
    const beforeValue = String(target.amount);
    const proposedValue = String(proposedAmount);
    const proposal: ProductPriceProposal = {
      id: this.dependencies.ids.next("proposal"),
      kind: "price_rollback",
      status: "pending",
      actorId: context.actorId,
      productId: target.productId,
      productTitle: target.productTitle,
      variantId: target.variantId,
      priceId: target.priceId,
      currencyCode: target.currencyCode,
      beforeValue,
      proposedValue,
      targetUpdatedAt: target.updatedAt,
      contentHash: createCatalogChangeHash({
        kind: "price_rollback",
        productId: target.productId,
        variantId: target.variantId,
        priceId: target.priceId,
        currencyCode: target.currencyCode,
        targetUpdatedAt: target.updatedAt,
        beforeValue,
        proposedValue,
      }),
      reason: input.reason,
      sourceRevisionId: revision.id,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + PROPOSAL_TTL_MS),
    };
    await this.dependencies.governance.createProposal({
      proposal,
      requestId: context.requestId,
    });
    return proposal;
  }

  private async requireCapability(
    context: RequestContext,
    capability: Capability,
    targetId: string
  ) {
    const actor = await this.requireActiveActor(context, targetId);
    await this.requireCapabilityForActor(context, actor, capability, targetId);
    return actor;
  }

  private async requireOwnedPendingProposal(
    context: RequestContext,
    proposalId: string
  ) {
    const actor = await this.requireActiveActor(context, proposalId);
    const proposal =
      await this.dependencies.governance.findProposal(proposalId);
    if (!proposal) {
      throw new ApplicationError(
        "proposal_not_found",
        `Proposal ${proposalId} was not found`
      );
    }
    const requiredCapability = this.requiredCapabilityForProposal(proposal);
    await this.requireCapabilityForActor(
      context,
      actor,
      requiredCapability,
      proposal.productId
    );
    if (proposal.actorId !== actor.id) {
      throw new ApplicationError(
        "proposal_owner_mismatch",
        "Only the proposal author can publish or reject it"
      );
    }
    if (proposal.status !== "pending") {
      throw new ApplicationError(
        "proposal_not_pending",
        `Proposal is ${proposal.status}`
      );
    }
    return { actor, proposal };
  }

  private async requireActiveActor(context: RequestContext, targetId: string) {
    const actor = await this.dependencies.users.findActiveUser(context.actorId);
    if (!actor) {
      await this.recordAuthorizationDenied(
        context,
        "active_dyllu_user",
        targetId,
        "actor_not_active"
      );
      throw new ApplicationError(
        "actor_not_active",
        "The authenticated DYLLU user is not active"
      );
    }
    return actor;
  }

  private async requireCapabilityForActor(
    context: RequestContext,
    actor: { id: string },
    capability: Capability,
    targetId: string
  ) {
    const granted = await this.dependencies.capabilities.listForUser(actor.id);
    if (!granted.includes(capability)) {
      await this.recordAuthorizationDenied(
        context,
        capability,
        targetId,
        "capability_denied"
      );
      throw new ApplicationError(
        "capability_denied",
        `Capability ${capability} is required`
      );
    }
  }

  private async recordAuthorizationDenied(
    context: RequestContext,
    capability: Capability | "active_dyllu_user",
    targetId: string,
    reason: "actor_not_active" | "capability_denied"
  ) {
    await this.dependencies.governance.appendEvent(
      this.createEvent({
        name: "authorization.denied",
        context,
        targetId,
        proposalId: null,
        occurredAt: this.dependencies.clock.now(),
        details: { capability, reason },
      })
    );
  }

  private validateDescription(value: string) {
    if (
      value.trim().length === 0 ||
      value.length > MAX_DESCRIPTION_LENGTH ||
      value.includes("\0")
    ) {
      throw new ApplicationError(
        "invalid_description",
        `Description must contain 1-${MAX_DESCRIPTION_LENGTH} safe characters`
      );
    }
  }

  private validateReason(value: string) {
    if (
      value.trim().length < 3 ||
      value.length > MAX_REASON_LENGTH ||
      value.includes("\0")
    ) {
      throw new ApplicationError(
        "invalid_reason",
        `Reason must contain 3-${MAX_REASON_LENGTH} safe characters`
      );
    }
  }

  private async failProposal(
    context: RequestContext,
    proposal: ProductChangeProposal,
    reason: string
  ) {
    await this.dependencies.governance.closeProposal({
      actorId: context.actorId,
      proposalId: proposal.id,
      productId: proposal.productId,
      requestId: context.requestId,
      occurredAt: this.dependencies.clock.now(),
      status: "failed",
      reason,
    });
  }

  private requiredCapabilityForProposal(
    proposal: ProductChangeProposal
  ): Capability {
    if (
      proposal.kind === "description_rollback" ||
      proposal.kind === "price_rollback"
    ) {
      return "product.rollback";
    }
    return proposal.kind === "price_update"
      ? "product_price.update"
      : "product_content.update";
  }

  private createEvent(input: {
    name: AuditEvent["name"];
    context: RequestContext;
    targetId: string;
    proposalId: string | null;
    occurredAt: Date;
    details: AuditEvent["details"];
  }): AuditEvent {
    return {
      id: this.dependencies.ids.next("event"),
      name: input.name,
      actorId: input.context.actorId,
      targetId: input.targetId,
      proposalId: input.proposalId,
      revisionId: null,
      requestId: input.context.requestId,
      details: input.details,
      occurredAt: input.occurredAt,
    };
  }
}
