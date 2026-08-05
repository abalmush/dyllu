import {
  Clock,
  GovernanceStore,
  IdGenerator,
  OrderDirectory,
  OrderListQuery,
  SaleDirectory,
  SaleListQuery,
  OperationGovernanceStore,
  SaleChangeExecutor,
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
  OperationProposal,
  SaleOperationValue,
  SaleDetails,
  OperationKind,
  DailyOrderReport,
  OrderExceptionCode,
  OrderSummary,
  ProductSummary,
  capabilities as availableCapabilities,
} from "../domain/types";
import { ApplicationError } from "./errors";
import { createProductDescriptionHash } from "../domain/product-description-hash";
import { createCatalogChangeHash } from "../domain/catalog-change-hash";
import { createOperationHash } from "../domain/operation-hash";
import { saleOperationValueSchema } from "./sale-operation-schema";
import { createCatalogQualityReport } from "./catalog-quality";

const PROPOSAL_TTL_MS = 30 * 60 * 1000;
const MAX_DESCRIPTION_LENGTH = 20_000;
const MAX_REASON_LENGTH = 500;

export type ProposeDescriptionInput = {
  productId: string;
  proposedDescription: string;
  reason: string;
};

export type ProposeDescriptionBatchInput = {
  items: Array<{
    productId: string;
    proposedDescription: string;
  }>;
  reason: string;
};

export type PublishDescriptionInput = {
  proposalId: string;
  confirmation: ConfirmationReceipt;
};

export type PublishPriceInput = PublishDescriptionInput;
export type PublishSaleChangeInput = PublishDescriptionInput;

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

export type DailyOrderReportInput = {
  localDate: string;
  timeZone: "Europe/Chisinau";
  staleAfterMinutes: number;
  exceptionLimit: number;
};

export type CatalogQualityAuditInput = {
  minimumDescriptionLength: number;
  resultLimit: number;
};

export type ProposeSaleCreateInput = {
  title: string;
  description: string;
  status: "active" | "draft";
  startsAt: string | null;
  endsAt: string | null;
  items: Array<{ variantId: string; saleAmount: number }>;
  reason: string;
};

export type ProposeSaleItemsInput = {
  saleId: string;
  upsert: Array<{ variantId: string; saleAmount: number }>;
  removeVariantIds: string[];
  reason: string;
};

export type ProposeSaleStatusInput = {
  saleId: string;
  action: "activate" | "pause" | "end";
  reason: string;
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
  sales?: SaleDirectory;
  operationGovernance?: OperationGovernanceStore;
  saleExecutor?: SaleChangeExecutor;
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

  async countProducts(context: RequestContext) {
    await this.requireCapability(context, "product.read", "catalog");
    return { count: await this.dependencies.products.count() };
  }

  async auditCatalogQuality(
    context: RequestContext,
    input: CatalogQualityAuditInput
  ) {
    await this.requireCapability(context, "product.read", "catalog-quality");
    if (
      !Number.isSafeInteger(input.minimumDescriptionLength) ||
      input.minimumDescriptionLength < 0 ||
      input.minimumDescriptionLength > 1_000 ||
      !Number.isSafeInteger(input.resultLimit) ||
      input.resultLimit < 1 ||
      input.resultLimit > 200
    ) {
      throw new ApplicationError(
        "invalid_catalog_audit",
        "The catalog quality limits are invalid"
      );
    }

    const products = [];
    const pageSize = 100;
    const maximumProducts = 5_000;
    let expectedCount: number | null = null;
    while (expectedCount === null || products.length < expectedCount) {
      const page = await this.dependencies.products.list({
        limit: pageSize,
        offset: products.length,
      });
      if (!Number.isSafeInteger(page.count) || page.count < 0) {
        throw new ApplicationError(
          "catalog_audit_unstable",
          "The DYLLU catalog audit could not get a stable product count"
        );
      }
      if (page.count > maximumProducts) {
        throw new ApplicationError(
          "catalog_audit_limit_exceeded",
          `The DYLLU catalog audit exceeds ${maximumProducts} products`
        );
      }
      if (expectedCount !== null && page.count !== expectedCount) {
        throw new ApplicationError(
          "catalog_audit_unstable",
          "DYLLU products changed while the catalog audit was generated"
        );
      }
      expectedCount = page.count;
      if (page.products.length === 0 && products.length < expectedCount) {
        throw new ApplicationError(
          "catalog_audit_unstable",
          "The DYLLU catalog audit returned an incomplete page"
        );
      }
      products.push(...page.products);
    }
    if (
      products.length !== expectedCount ||
      new Set(products.map((product) => product.id)).size !== products.length
    ) {
      throw new ApplicationError(
        "catalog_audit_unstable",
        "DYLLU products changed while the catalog audit was generated"
      );
    }
    return createCatalogQualityReport(
      products,
      input.minimumDescriptionLength,
      input.resultLimit
    );
  }

  async listOrders(context: RequestContext, input: OrderListQuery) {
    await this.requireCapability(context, "order.read", input.localDate);
    return this.dependencies.orders.list(input);
  }

  async getDailyOrderReport(
    context: RequestContext,
    input: DailyOrderReportInput
  ): Promise<DailyOrderReport> {
    await this.requireCapability(context, "order.read", input.localDate);
    if (
      !Number.isSafeInteger(input.staleAfterMinutes) ||
      input.staleAfterMinutes < 0 ||
      input.staleAfterMinutes > 10_080 ||
      !Number.isSafeInteger(input.exceptionLimit) ||
      input.exceptionLimit < 1 ||
      input.exceptionLimit > 100
    ) {
      throw new ApplicationError(
        "invalid_order_report",
        "The order report limits are invalid"
      );
    }

    const orders: OrderSummary[] = [];
    const pageSize = 100;
    const maximumOrders = 5_000;
    let expectedCount: number | null = null;
    while (expectedCount === null || orders.length < expectedCount) {
      const page = await this.dependencies.orders.list({
        localDate: input.localDate,
        timeZone: input.timeZone,
        limit: pageSize,
        offset: orders.length,
      });
      if (!Number.isSafeInteger(page.count) || page.count < 0) {
        throw new ApplicationError(
          "order_report_unstable",
          "The DYLLU order report could not get a stable order count"
        );
      }
      if (page.count > maximumOrders) {
        throw new ApplicationError(
          "order_report_limit_exceeded",
          `The DYLLU daily order report exceeds ${maximumOrders} orders`
        );
      }
      if (expectedCount !== null && page.count !== expectedCount) {
        throw new ApplicationError(
          "order_report_unstable",
          "DYLLU orders changed while the daily report was generated"
        );
      }
      expectedCount = page.count;
      if (page.orders.length === 0 && orders.length < expectedCount) {
        throw new ApplicationError(
          "order_report_unstable",
          "The DYLLU order report returned an incomplete page"
        );
      }
      orders.push(...page.orders);
    }
    if (
      orders.length !== expectedCount ||
      new Set(orders.map((order) => order.id)).size !== orders.length
    ) {
      throw new ApplicationError(
        "order_report_unstable",
        "DYLLU orders changed while the daily report was generated"
      );
    }
    return buildDailyOrderReport({
      localDate: input.localDate,
      timeZone: input.timeZone,
      orders,
      now: this.dependencies.clock.now(),
      staleAfterMinutes: input.staleAfterMinutes,
      exceptionLimit: input.exceptionLimit,
    });
  }

  async listSales(context: RequestContext, input: SaleListQuery) {
    await this.requireCapability(context, "sale.read", "sales");
    if (!this.dependencies.sales) {
      throw new ApplicationError(
        "sale_directory_unavailable",
        "DYLLU sale data is unavailable"
      );
    }
    return this.dependencies.sales.list(input);
  }

  async getSale(context: RequestContext, saleId: string) {
    await this.requireCapability(context, "sale.read", saleId);
    if (!this.dependencies.sales) {
      throw new ApplicationError(
        "sale_directory_unavailable",
        "DYLLU sale data is unavailable"
      );
    }
    const sale = await this.dependencies.sales.findById(saleId);
    if (!sale) {
      throw new ApplicationError(
        "sale_not_found",
        `DYLLU sale ${saleId} was not found`
      );
    }
    return sale;
  }

  async proposeSaleCreate(
    context: RequestContext,
    input: ProposeSaleCreateInput
  ): Promise<OperationProposal> {
    await this.requireCapability(context, "sale.update", "sale:new");
    this.validateReason(input.reason);
    const sales = this.dependencies.sales;
    const governance = this.dependencies.operationGovernance;
    if (!sales || !governance) {
      throw new ApplicationError(
        "sale_control_unavailable",
        "DYLLU sale control is unavailable"
      );
    }
    const title = input.title.trim();
    const description = input.description.trim();
    if (title.length < 1 || title.length > 120 || description.length > 500) {
      throw new ApplicationError(
        "invalid_sale",
        "A sale needs a title of 1 to 120 characters and a description of at most 500 characters"
      );
    }
    if (input.items.length < 1 || input.items.length > 100) {
      throw new ApplicationError(
        "invalid_sale_items",
        "A sale proposal must contain 1 to 100 variants"
      );
    }
    const variantIds = input.items.map((item) => item.variantId.trim());
    if (
      variantIds.some((variantId) => !variantId) ||
      new Set(variantIds).size !== variantIds.length
    ) {
      throw new ApplicationError(
        "invalid_sale_items",
        "Each sale variant must be present once"
      );
    }
    const startsAt = parseOptionalDate(input.startsAt);
    const endsAt = parseOptionalDate(input.endsAt);
    if (startsAt && endsAt && startsAt >= endsAt) {
      throw new ApplicationError(
        "invalid_sale_dates",
        "The sale end date must be after its start date"
      );
    }
    const targets = await sales.findVariantTargets(variantIds, "mdl");
    const targetsByVariant = new Map(
      targets.map((target) => [target.variantId, target])
    );
    if (targetsByVariant.size !== variantIds.length) {
      throw new ApplicationError(
        "sale_variant_not_found",
        "Each selected DYLLU variant must have one normal MDL price"
      );
    }
    const requestedByVariant = new Map(
      input.items.map((item) => [item.variantId.trim(), item.saleAmount])
    );
    const items = variantIds
      .map((variantId) => {
        const target = targetsByVariant.get(variantId)!;
        const saleAmount = requestedByVariant.get(variantId)!;
        if (
          !Number.isSafeInteger(saleAmount) ||
          saleAmount < 1 ||
          saleAmount >= target.normalAmount
        ) {
          throw new ApplicationError(
            "invalid_sale_price",
            "Each sale price must be a positive whole MDL amount below the normal price"
          );
        }
        return {
          productId: target.productId,
          productTitle: target.productTitle,
          variantId: target.variantId,
          variantTitle: target.variantTitle,
          sku: target.sku,
          basePriceId: target.basePriceId,
          salePriceId: null,
          normalAmount: target.normalAmount,
          saleAmount,
          currencyCode: target.currencyCode,
          targetUpdatedAt: target.updatedAt.toISOString(),
        };
      })
      .sort((left, right) => left.variantId.localeCompare(right.variantId));
    const overlaps = await sales.findOverlappingActiveSales({
      variantIds,
      startsAt,
      endsAt,
    });
    if (overlaps.length > 0) {
      throw new ApplicationError(
        "sale_overlap",
        `The selected variants already have an overlapping active DYLLU sale: ${[
          ...new Set(overlaps.map((overlap) => overlap.saleId)),
        ].join(", ")}`
      );
    }

    const createdAt = this.dependencies.clock.now();
    const id = this.dependencies.ids.next("operationProposal");
    const targetKey = `sale:new:${id}`;
    const proposedValue: SaleOperationValue = {
      saleId: null,
      title,
      description,
      status: input.status,
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      items,
    };
    const proposal: OperationProposal = {
      id,
      kind: "sale_create",
      status: "pending",
      actorId: context.actorId,
      targetType: "sale",
      targetId: null,
      targetKey,
      beforeValue: {},
      proposedValue,
      targetVersion: null,
      contentHash: createOperationHash({
        kind: "sale_create",
        targetType: "sale",
        targetId: null,
        targetKey,
        targetVersion: null,
        beforeValue: {},
        proposedValue,
      }),
      reason: input.reason.trim(),
      sourceRevisionId: null,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + PROPOSAL_TTL_MS),
    };
    await governance.createProposal({
      proposal,
      requestId: context.requestId,
    });
    return proposal;
  }

  async proposeSaleItems(
    context: RequestContext,
    input: ProposeSaleItemsInput
  ): Promise<OperationProposal> {
    await this.requireCapability(context, "sale.update", input.saleId);
    this.validateReason(input.reason);
    if (
      input.upsert.length + input.removeVariantIds.length < 1 ||
      input.upsert.length + input.removeVariantIds.length > 100
    ) {
      throw new ApplicationError(
        "invalid_sale_items",
        "A sale item proposal must change 1 to 100 variants"
      );
    }
    const upsertIds = input.upsert.map((item) => item.variantId.trim());
    const removeIds = input.removeVariantIds.map((variantId) =>
      variantId.trim()
    );
    const allChangedIds = [...upsertIds, ...removeIds];
    if (
      allChangedIds.some((variantId) => !variantId) ||
      new Set(allChangedIds).size !== allChangedIds.length
    ) {
      throw new ApplicationError(
        "invalid_sale_items",
        "Each changed sale variant must be present once"
      );
    }
    const { sale, snapshot: beforeValue } = await this.loadSaleSnapshot(
      input.saleId
    );
    if (sale.items.some((item) => item.hasRules || item.currencyCode !== "mdl")) {
      throw new ApplicationError(
        "unsupported_sale_item",
        "This DYLLU sale has a price rule that the MCP cannot change"
      );
    }
    const existingByVariant = new Map(
      beforeValue.items.map((item) => [item.variantId, item])
    );
    for (const variantId of removeIds) {
      if (!existingByVariant.delete(variantId)) {
        throw new ApplicationError(
          "sale_variant_not_found",
          `Variant ${variantId} is not in this DYLLU sale`
        );
      }
    }
    const requestedAmountByVariant = new Map(
      input.upsert.map((item) => [item.variantId.trim(), item.saleAmount])
    );
    const proposedVariantIds = [
      ...new Set([...existingByVariant.keys(), ...upsertIds]),
    ];
    if (proposedVariantIds.length > 100) {
      throw new ApplicationError(
        "invalid_sale_items",
        "A governed DYLLU sale can contain at most 100 variants"
      );
    }
    const sales = this.requireSaleDirectory();
    const targets = await sales.findVariantTargets(proposedVariantIds, "mdl");
    const targetsByVariant = new Map(
      targets.map((target) => [target.variantId, target])
    );
    if (targetsByVariant.size !== proposedVariantIds.length) {
      throw new ApplicationError(
        "sale_variant_not_found",
        "Each selected DYLLU variant must have one normal MDL price"
      );
    }
    const proposedItems = proposedVariantIds
      .map((variantId) => {
        const target = targetsByVariant.get(variantId)!;
        const existing = existingByVariant.get(variantId);
        const saleAmount = requestedAmountByVariant.get(variantId);
        const amount = saleAmount ?? existing?.saleAmount;
        if (
          amount === undefined ||
          !Number.isSafeInteger(amount) ||
          amount < 1 ||
          amount >= target.normalAmount
        ) {
          throw new ApplicationError(
            "invalid_sale_price",
            "Each sale price must be a positive whole MDL amount below the normal price"
          );
        }
        return {
          productId: target.productId,
          productTitle: target.productTitle,
          variantId: target.variantId,
          variantTitle: target.variantTitle,
          sku: target.sku,
          basePriceId: target.basePriceId,
          salePriceId: existing?.salePriceId ?? null,
          normalAmount: target.normalAmount,
          saleAmount: amount,
          currencyCode: target.currencyCode,
          targetUpdatedAt: target.updatedAt.toISOString(),
        };
      })
      .sort((left, right) => left.variantId.localeCompare(right.variantId));
    const proposedValue: SaleOperationValue = {
      ...beforeValue,
      items: proposedItems,
    };
    if (JSON.stringify(proposedValue) === JSON.stringify(beforeValue)) {
      throw new ApplicationError(
        "unchanged_sale",
        "The proposed sale items are identical to the current sale"
      );
    }
    const overlaps = await sales.findOverlappingActiveSales({
      variantIds: proposedVariantIds,
      startsAt: sale.startsAt,
      endsAt: sale.endsAt,
      excludeSaleId: sale.id,
    });
    if (overlaps.length > 0) {
      throw new ApplicationError(
        "sale_overlap",
        "A selected variant has another overlapping active DYLLU sale"
      );
    }
    return this.storeSaleOperationProposal(context, {
      kind: "sale_items_update",
      sale,
      beforeValue,
      proposedValue,
      reason: input.reason,
      sourceRevisionId: null,
    });
  }

  async proposeSaleStatus(
    context: RequestContext,
    input: ProposeSaleStatusInput
  ): Promise<OperationProposal> {
    await this.requireCapability(context, "sale.update", input.saleId);
    this.validateReason(input.reason);
    const { sale, snapshot: beforeValue } = await this.loadSaleSnapshot(
      input.saleId
    );
    const proposedValue: SaleOperationValue = {
      ...beforeValue,
      status: input.action === "activate" ? "active" : "draft",
      endsAt:
        input.action === "end"
          ? this.dependencies.clock.now().toISOString()
          : beforeValue.endsAt,
    };
    if (JSON.stringify(proposedValue) === JSON.stringify(beforeValue)) {
      throw new ApplicationError(
        "unchanged_sale",
        "The proposed sale status is identical to the current sale"
      );
    }
    if (input.action === "activate") {
      const overlaps = await this.requireSaleDirectory().findOverlappingActiveSales(
        {
          variantIds: proposedValue.items.map((item) => item.variantId),
          startsAt: sale.startsAt,
          endsAt: sale.endsAt,
          excludeSaleId: sale.id,
        }
      );
      if (overlaps.length > 0) {
        throw new ApplicationError(
          "sale_overlap",
          "A selected variant has another overlapping active DYLLU sale"
        );
      }
    }
    return this.storeSaleOperationProposal(context, {
      kind: "sale_status_update",
      sale,
      beforeValue,
      proposedValue,
      reason: input.reason,
      sourceRevisionId: null,
    });
  }

  async listSaleHistory(
    context: RequestContext,
    saleId: string,
    limit: number
  ) {
    await this.requireCapability(context, "audit.read", saleId);
    if (limit < 1 || limit > 50) {
      throw new ApplicationError(
        "invalid_audit_limit",
        "Sale history limit must be between 1 and 50"
      );
    }
    const governance = this.requireOperationGovernance();
    return governance.listRevisions(`sale:${saleId}`, limit);
  }

  async proposeSaleRollback(
    context: RequestContext,
    input: ProposeRollbackInput
  ): Promise<OperationProposal> {
    await this.requireCapability(context, "sale.rollback", input.revisionId);
    this.validateReason(input.reason);
    const governance = this.requireOperationGovernance();
    const source = await governance.findRevision(input.revisionId);
    if (!source || source.targetType !== "sale") {
      throw new ApplicationError(
        "revision_not_found",
        `Sale revision ${input.revisionId} was not found`
      );
    }
    const { sale, snapshot: beforeValue } = await this.loadSaleSnapshot(
      source.targetId
    );
    let proposedValue: SaleOperationValue;
    const historical = saleOperationValueSchema.safeParse(source.beforeValue);
    if (source.kind === "sale_create" || !historical.success) {
      proposedValue = {
        ...beforeValue,
        status: "draft",
        endsAt: this.dependencies.clock.now().toISOString(),
      };
    } else {
      const desired = historical.data;
      const desiredVariantIds = desired.items.map((item) => item.variantId);
      const targets = await this.requireSaleDirectory().findVariantTargets(
        desiredVariantIds,
        "mdl"
      );
      const targetsByVariant = new Map(
        targets.map((target) => [target.variantId, target])
      );
      const currentByVariant = new Map(
        beforeValue.items.map((item) => [item.variantId, item])
      );
      if (targets.length !== desiredVariantIds.length) {
        throw new ApplicationError(
          "sale_variant_not_found",
          "A variant from this sale revision has no normal MDL price"
        );
      }
      proposedValue = {
        ...desired,
        saleId: sale.id,
        items: desired.items
          .map((item) => {
            const target = targetsByVariant.get(item.variantId)!;
            if (item.saleAmount >= target.normalAmount) {
              throw new ApplicationError(
                "invalid_sale_price",
                "A historical sale price is not below the current normal price"
              );
            }
            return {
              productId: target.productId,
              productTitle: target.productTitle,
              variantId: target.variantId,
              variantTitle: target.variantTitle,
              sku: target.sku,
              basePriceId: target.basePriceId,
              salePriceId:
                currentByVariant.get(item.variantId)?.salePriceId ?? null,
              normalAmount: target.normalAmount,
              saleAmount: item.saleAmount,
              currencyCode: target.currencyCode,
              targetUpdatedAt: target.updatedAt.toISOString(),
            };
          })
          .sort((left, right) => left.variantId.localeCompare(right.variantId)),
      };
    }
    if (JSON.stringify(proposedValue) === JSON.stringify(beforeValue)) {
      throw new ApplicationError(
        "unchanged_sale",
        "The selected revision is identical to the current sale"
      );
    }
    if (proposedValue.status === "active") {
      const overlaps = await this.requireSaleDirectory().findOverlappingActiveSales(
        {
          variantIds: proposedValue.items.map((item) => item.variantId),
          startsAt: proposedValue.startsAt
            ? new Date(proposedValue.startsAt)
            : null,
          endsAt: proposedValue.endsAt
            ? new Date(proposedValue.endsAt)
            : null,
          excludeSaleId: sale.id,
        }
      );
      if (overlaps.length > 0) {
        throw new ApplicationError(
          "sale_overlap",
          "A restored variant has another overlapping active DYLLU sale"
        );
      }
    }
    return this.storeSaleOperationProposal(context, {
      kind: "sale_rollback",
      sale,
      beforeValue,
      proposedValue,
      reason: input.reason,
      sourceRevisionId: source.id,
    });
  }

  async publishSaleChange(
    context: RequestContext,
    input: PublishSaleChangeInput
  ) {
    const actor = await this.requireActiveActor(context, input.proposalId);
    const governance = this.dependencies.operationGovernance;
    const executor = this.dependencies.saleExecutor;
    if (!governance || !executor) {
      throw new ApplicationError(
        "sale_control_unavailable",
        "DYLLU sale control is unavailable"
      );
    }
    const proposal = await governance.findProposal(input.proposalId);
    if (!proposal) {
      throw new ApplicationError(
        "proposal_not_found",
        `Proposal ${input.proposalId} was not found`
      );
    }
    await this.requireCapabilityForActor(
      context,
      actor,
      this.requiredCapabilityForOperation(proposal),
      proposal.targetKey
    );
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
    if (
      proposal.kind !== "sale_create" &&
      proposal.kind !== "sale_items_update" &&
      proposal.kind !== "sale_status_update" &&
      proposal.kind !== "sale_rollback"
    ) {
      throw new ApplicationError(
        "proposal_kind_mismatch",
        "The proposal is not a supported sale change"
      );
    }
    const currentTime = this.dependencies.clock.now();
    if (proposal.expiresAt <= currentTime) {
      await governance.closeProposal({
        actorId: actor.id,
        proposalId: proposal.id,
        targetKey: proposal.targetKey,
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
    try {
      const publish =
        proposal.kind === "sale_create"
          ? executor.publishCreate.bind(executor)
          : executor.publishUpdate.bind(executor);
      return await publish({
        actor,
        proposal,
        requestId: context.requestId,
        confirmedAt: input.confirmation.confirmedAt,
      });
    } catch (error) {
      await governance.closeProposal({
        actorId: actor.id,
        proposalId: proposal.id,
        targetKey: proposal.targetKey,
        requestId: context.requestId,
        occurredAt: this.dependencies.clock.now(),
        status: "failed",
        reason: "sale_publish_failed",
      });
      throw error;
    }
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

  async getOperationProposal(context: RequestContext, proposalId: string) {
    const actor = await this.requireActiveActor(context, proposalId);
    const governance = this.dependencies.operationGovernance;
    if (!governance) {
      throw new ApplicationError(
        "sale_control_unavailable",
        "DYLLU sale control is unavailable"
      );
    }
    const proposal = await governance.findProposal(proposalId);
    if (!proposal) {
      throw new ApplicationError(
        "proposal_not_found",
        `Proposal ${proposalId} was not found`
      );
    }
    const granted = await this.dependencies.capabilities.listForUser(actor.id);
    const requiredCapability = this.requiredCapabilityForOperation(proposal);
    const canAudit = granted.includes("audit.read");
    const canReadOwn =
      proposal.actorId === actor.id && granted.includes(requiredCapability);
    if (!canAudit && !canReadOwn) {
      await this.recordAuthorizationDenied(
        context,
        requiredCapability,
        proposal.targetKey,
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

    const createdAt = this.dependencies.clock.now();
    const proposal = this.buildDescriptionProposal({
      context,
      product,
      proposedDescription: input.proposedDescription,
      reason: input.reason,
      createdAt,
    });

    await this.dependencies.governance.createProposal({
      proposal,
      requestId: context.requestId,
    });

    return proposal;
  }

  async proposeDescriptionBatch(
    context: RequestContext,
    input: ProposeDescriptionBatchInput
  ) {
    await this.requireCapability(
      context,
      "product_content.update",
      "catalog-descriptions"
    );
    this.validateReason(input.reason);
    if (input.items.length < 1 || input.items.length > 20) {
      throw new ApplicationError(
        "invalid_description_batch",
        "A description batch must contain 1 to 20 DYLLU products"
      );
    }
    const productIds = input.items.map((item) => item.productId.trim());
    if (
      productIds.some((productId) => !productId) ||
      new Set(productIds).size !== productIds.length
    ) {
      throw new ApplicationError(
        "invalid_description_batch",
        "Each DYLLU product must be present once in a description batch"
      );
    }
    for (const item of input.items) {
      this.validateDescription(item.proposedDescription);
    }
    const products = await this.dependencies.products.findByIds(productIds);
    const productsById = new Map(
      products.map((product) => [product.id, product])
    );
    if (productsById.size !== productIds.length) {
      throw new ApplicationError(
        "product_not_found",
        "Each selected DYLLU product must exist"
      );
    }
    const createdAt = this.dependencies.clock.now();
    const proposals = input.items.map((item) =>
      this.buildDescriptionProposal({
        context,
        product: productsById.get(item.productId.trim())!,
        proposedDescription: item.proposedDescription,
        reason: input.reason,
        createdAt,
      })
    );
    await this.dependencies.governance.createProposals({
      proposals,
      requestId: context.requestId,
    });
    return { proposals };
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

  private requireSaleDirectory() {
    if (!this.dependencies.sales) {
      throw new ApplicationError(
        "sale_control_unavailable",
        "DYLLU sale control is unavailable"
      );
    }
    return this.dependencies.sales;
  }

  private requireOperationGovernance() {
    if (!this.dependencies.operationGovernance) {
      throw new ApplicationError(
        "sale_control_unavailable",
        "DYLLU sale control is unavailable"
      );
    }
    return this.dependencies.operationGovernance;
  }

  private async loadSaleSnapshot(saleId: string) {
    const sales = this.requireSaleDirectory();
    const sale = await sales.findById(saleId);
    if (!sale) {
      throw new ApplicationError(
        "sale_not_found",
        `DYLLU sale ${saleId} was not found`
      );
    }
    if (sale.items.length > 100) {
      throw new ApplicationError(
        "invalid_sale_items",
        "This DYLLU sale exceeds the governed limit of 100 variants"
      );
    }
    const variantIds = sale.items.map((item) => item.variantId);
    const targets = await sales.findVariantTargets(variantIds, "mdl");
    const targetsByVariant = new Map(
      targets.map((target) => [target.variantId, target])
    );
    if (targetsByVariant.size !== variantIds.length) {
      throw new ApplicationError(
        "sale_variant_not_found",
        "Each DYLLU sale variant must have one normal MDL price"
      );
    }
    const snapshot: SaleOperationValue = {
      saleId: sale.id,
      title: sale.title,
      description: sale.description,
      status: sale.status,
      startsAt: sale.startsAt?.toISOString() ?? null,
      endsAt: sale.endsAt?.toISOString() ?? null,
      items: sale.items
        .map((item) => {
          const target = targetsByVariant.get(item.variantId)!;
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
        })
        .sort((left, right) => left.variantId.localeCompare(right.variantId)),
    };
    return { sale, snapshot };
  }

  private async storeSaleOperationProposal(
    context: RequestContext,
    input: {
      kind: Extract<
        OperationKind,
        "sale_items_update" | "sale_status_update" | "sale_rollback"
      >;
      sale: SaleDetails;
      beforeValue: SaleOperationValue;
      proposedValue: SaleOperationValue;
      reason: string;
      sourceRevisionId: string | null;
    }
  ) {
    const createdAt = this.dependencies.clock.now();
    const id = this.dependencies.ids.next("operationProposal");
    const targetKey = `sale:${input.sale.id}`;
    const targetVersion = input.sale.updatedAt.toISOString();
    const proposal: OperationProposal = {
      id,
      kind: input.kind,
      status: "pending",
      actorId: context.actorId,
      targetType: "sale",
      targetId: input.sale.id,
      targetKey,
      beforeValue: input.beforeValue,
      proposedValue: input.proposedValue,
      targetVersion,
      contentHash: createOperationHash({
        kind: input.kind,
        targetType: "sale",
        targetId: input.sale.id,
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
    await this.requireOperationGovernance().createProposal({
      proposal,
      requestId: context.requestId,
    });
    return proposal;
  }

  private buildDescriptionProposal(input: {
    context: RequestContext;
    product: ProductSummary;
    proposedDescription: string;
    reason: string;
    createdAt: Date;
  }): ProductDescriptionProposal {
    const beforeValue = input.product.description ?? "";
    if (beforeValue === input.proposedDescription) {
      throw new ApplicationError(
        "unchanged_description",
        "The proposed description is identical to the current description"
      );
    }
    return {
      id: this.dependencies.ids.next("proposal"),
      kind: "description_update",
      status: "pending",
      actorId: input.context.actorId,
      productId: input.product.id,
      productTitle: input.product.title,
      variantId: null,
      priceId: null,
      currencyCode: null,
      beforeValue,
      proposedValue: input.proposedDescription,
      targetUpdatedAt: input.product.updatedAt,
      contentHash: createProductDescriptionHash({
        productId: input.product.id,
        productUpdatedAt: input.product.updatedAt,
        beforeValue,
        proposedValue: input.proposedDescription,
      }),
      reason: input.reason.trim(),
      sourceRevisionId: null,
      createdAt: input.createdAt,
      expiresAt: new Date(input.createdAt.getTime() + PROPOSAL_TTL_MS),
    };
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

  private requiredCapabilityForOperation(
    proposal: OperationProposal
  ): Capability {
    if (proposal.kind === "sale_rollback") {
      return "sale.rollback";
    }
    return "sale.update";
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

function parseOptionalDate(value: string | null) {
  if (value === null) {
    return null;
  }
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new ApplicationError(
      "invalid_sale_dates",
      "Sale dates must use an exact ISO 8601 UTC value"
    );
  }
  return parsed;
}

function buildDailyOrderReport(input: {
  localDate: string;
  timeZone: "Europe/Chisinau";
  orders: OrderSummary[];
  now: Date;
  staleAfterMinutes: number;
  exceptionLimit: number;
}): DailyOrderReport {
  const currencyTotals = new Map<
    string,
    { placedAmount: number; canceledAmount: number }
  >();
  const statusCounts: Record<string, number> = {};
  const paymentStatusCounts: Record<string, number> = {};
  const fulfillmentStatusCounts: Record<string, number> = {};
  const exceptions: DailyOrderReport["exceptions"] = [];

  for (const order of input.orders) {
    incrementCount(statusCounts, order.status);
    incrementCount(paymentStatusCounts, order.paymentStatus);
    incrementCount(fulfillmentStatusCounts, order.fulfillmentStatus);
    const totals = currencyTotals.get(order.currencyCode) ?? {
      placedAmount: 0,
      canceledAmount: 0,
    };
    totals.placedAmount += order.total;
    if (order.status === "canceled") {
      totals.canceledAmount += order.total;
    }
    currencyTotals.set(order.currencyCode, totals);

    const codes = getOrderExceptionCodes(
      order,
      input.now,
      input.staleAfterMinutes
    );
    if (codes.length > 0) {
      exceptions.push({ order, codes });
    }
  }

  return {
    localDate: input.localDate,
    timeZone: input.timeZone,
    orderCount: input.orders.length,
    currencyTotals: [...currencyTotals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([currencyCode, totals]) => ({
        currencyCode,
        placedAmount: totals.placedAmount,
        canceledAmount: totals.canceledAmount,
        netAmount: totals.placedAmount - totals.canceledAmount,
      })),
    statusCounts,
    paymentStatusCounts,
    fulfillmentStatusCounts,
    exceptionCount: exceptions.length,
    exceptionsTruncated: exceptions.length > input.exceptionLimit,
    exceptions: exceptions.slice(0, input.exceptionLimit),
  };
}

function incrementCount(counts: Record<string, number>, value: string) {
  counts[value] = (counts[value] ?? 0) + 1;
}

function getOrderExceptionCodes(
  order: OrderSummary,
  now: Date,
  staleAfterMinutes: number
): OrderExceptionCode[] {
  const codes: OrderExceptionCode[] = [];
  const canceledWithPayment = [
    "authorized",
    "partially_authorized",
    "captured",
    "partially_captured",
    "partially_refunded",
  ].includes(order.paymentStatus);
  const paid = ["captured", "partially_captured"].includes(
    order.paymentStatus
  );
  const fulfillmentStarted = ![
    "not_fulfilled",
    "canceled",
  ].includes(order.fulfillmentStatus);
  const notPaid = [
    "not_paid",
    "awaiting",
    "canceled",
    "requires_action",
  ].includes(order.paymentStatus);
  const staleBefore =
    now.getTime() - staleAfterMinutes * 60 * 1000;

  if (
    order.status === "requires_action" ||
    order.paymentStatus === "requires_action"
  ) {
    codes.push("requires_action");
  }
  if (order.status === "canceled" && canceledWithPayment) {
    codes.push("canceled_with_payment");
  }
  if (
    order.status !== "canceled" &&
    paid &&
    order.fulfillmentStatus === "not_fulfilled" &&
    order.createdAt.getTime() <= staleBefore
  ) {
    codes.push("paid_not_fulfilled");
  }
  if (order.status !== "canceled" && fulfillmentStarted && notPaid) {
    codes.push("fulfilled_not_paid");
  }
  if (!order.email) {
    codes.push("missing_customer_email");
  }
  return codes;
}
