import {
  Actor,
  AuditEvent,
  Capability,
  OrderDetails,
  OrderSummary,
  ProductChangeProposal,
  ProductChangeRevision,
  ProductDescriptionProposal,
  ProductDescriptionRevision,
  ProductPriceProposal,
  ProductPriceRevision,
  ProductPriceTarget,
  ProductSummary,
  SaleStatus,
  SaleSummary,
  SaleDetails,
  SaleVariantTarget,
  OperationProposal,
  OperationRevision,
  InventoryVariantSnapshot,
  ProductCategoryDetails,
  ProductCategorySummary,
  ProductCategoryTarget,
  PromotionDetails,
  PromotionStatus,
  ReturnDetails,
  ReturnOrderTarget,
  ReturnStatus,
} from "../domain/types";
import type { OneCSyncAccess } from "@dyllu/medusa-plugin-one-c/contracts";

export type ProductSearch = {
  query: string;
  limit: number;
};

export type OrderListQuery = {
  localDate: string;
  timeZone: "Europe/Chisinau";
  status?: string;
  limit: number;
  offset: number;
};

export interface OrderDirectory {
  list(input: OrderListQuery): Promise<{
    orders: OrderSummary[];
    count: number;
  }>;
  findByReference(reference: string): Promise<OrderDetails | null>;
}

export interface InventoryDirectory {
  list(input: { limit: number; offset: number }): Promise<{
    variants: InventoryVariantSnapshot[];
    count: number;
  }>;
}

export interface MerchandisingDirectory {
  listCategories(input: { limit: number; offset: number }): Promise<{
    categories: ProductCategorySummary[];
    count: number;
  }>;
  findCategoryById(categoryId: string): Promise<ProductCategoryDetails | null>;
  listCategoryProducts(
    categoryId: string,
    input: { limit: number; offset: number }
  ): Promise<{
    products: ProductCategoryDetails["products"];
    count: number;
  }>;
  findProductTargets(
    productIds: string[],
    categoryId: string
  ): Promise<ProductCategoryTarget[]>;
}

export interface PromotionDirectory {
  list(input: {
    status?: PromotionStatus;
    limit: number;
    offset: number;
  }): Promise<{ promotions: PromotionDetails[]; count: number }>;
  findById(promotionId: string): Promise<PromotionDetails | null>;
}

export interface ReturnDirectory {
  list(input: {
    status?: ReturnStatus;
    limit: number;
    offset: number;
  }): Promise<{ returns: ReturnDetails[]; count: number }>;
  findById(returnId: string): Promise<ReturnDetails | null>;
  findOrderTarget(reference: string): Promise<ReturnOrderTarget | null>;
  listForOrder(orderId: string): Promise<ReturnDetails[]>;
}

export type SaleListQuery = {
  status?: SaleStatus;
  limit: number;
  offset: number;
};

export interface SaleDirectory {
  list(input: SaleListQuery): Promise<{
    sales: SaleSummary[];
    count: number;
  }>;
  findById(saleId: string): Promise<SaleDetails | null>;
  findVariantTargets(
    variantIds: string[],
    currencyCode: "mdl"
  ): Promise<SaleVariantTarget[]>;
  findOverlappingActiveSales(input: {
    variantIds: string[];
    startsAt: Date | null;
    endsAt: Date | null;
    excludeSaleId?: string;
  }): Promise<Array<{ saleId: string; variantId: string }>>;
}

export interface OperationGovernanceStore {
  createProposal(input: {
    proposal: OperationProposal;
    requestId: string;
  }): Promise<void>;
  findProposal(proposalId: string): Promise<OperationProposal | null>;
  findRevision(revisionId: string): Promise<OperationRevision | null>;
  listRevisions(targetKey: string, limit: number): Promise<OperationRevision[]>;
  closeProposal(input: {
    actorId: string;
    proposalId: string;
    targetKey: string;
    requestId: string;
    occurredAt: Date;
    status: "expired" | "failed" | "rejected";
    reason: string;
  }): Promise<void>;
}

export interface UserDirectory {
  findActiveUser(userId: string): Promise<Actor | null>;
}

export interface CapabilityStore {
  listForUser(userId: string): Promise<Capability[]>;
  replaceForUser(input: {
    actorId: string;
    userId: string;
    capabilities: Capability[];
    requestId: string;
    occurredAt: Date;
  }): Promise<void>;
}

export interface ProductCatalog {
  count(): Promise<number>;
  list(input: { limit: number; offset: number }): Promise<{
    products: ProductSummary[];
    count: number;
  }>;
  findByIds(productIds: string[]): Promise<ProductSummary[]>;
  findById(productId: string): Promise<ProductSummary | null>;
  findVariantPrice(input: {
    productId: string;
    variantId: string;
    priceId: string;
    currencyCode: string;
  }): Promise<ProductPriceTarget | null>;
  search(input: ProductSearch): Promise<ProductSummary[]>;
}

export interface GovernanceStore {
  createProposal(input: {
    proposal: ProductChangeProposal;
    requestId: string;
  }): Promise<void>;
  createProposals(input: {
    proposals: ProductChangeProposal[];
    requestId: string;
  }): Promise<void>;
  findProposal(proposalId: string): Promise<ProductChangeProposal | null>;
  findRevision(revisionId: string): Promise<ProductChangeRevision | null>;
  listRevisions(
    productId: string,
    limit: number
  ): Promise<ProductChangeRevision[]>;
  listEvents(input: {
    actorId?: string;
    targetId?: string;
    limit: number;
  }): Promise<AuditEvent[]>;
  closeProposal(input: {
    actorId: string;
    proposalId: string;
    productId: string;
    requestId: string;
    occurredAt: Date;
    status: "expired" | "failed" | "rejected";
    reason: string;
  }): Promise<void>;
  appendEvent(event: AuditEvent): Promise<void>;
}

export interface ProductChangeExecutor {
  publishDescription(input: {
    actor: Actor;
    proposal: ProductDescriptionProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<ProductDescriptionRevision>;
  publishPrice(input: {
    actor: Actor;
    proposal: ProductPriceProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<ProductPriceRevision>;
}

export interface SaleChangeExecutor {
  publishCreate(input: {
    actor: Actor;
    proposal: OperationProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<OperationRevision>;
  publishUpdate(input: {
    actor: Actor;
    proposal: OperationProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<OperationRevision>;
}

export interface MerchandisingChangeExecutor {
  publishCategoryAssignments(input: {
    actor: Actor;
    proposal: OperationProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<OperationRevision>;
}

export interface PromotionChangeExecutor {
  publishStatus(input: {
    actor: Actor;
    proposal: OperationProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<OperationRevision>;
}

export interface ReturnChangeExecutor {
  publishCreate(input: {
    actor: Actor;
    proposal: OperationProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<OperationRevision>;
  publishCancel(input: {
    actor: Actor;
    proposal: OperationProposal;
    requestId: string;
    confirmedAt: Date;
  }): Promise<OperationRevision>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(
    prefix:
      | "proposal"
      | "revision"
      | "operationProposal"
      | "operationRevision"
      | "event"
  ): string;
}

export type OneCSyncDirectory = OneCSyncAccess;
