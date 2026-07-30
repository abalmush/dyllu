import {
  Actor,
  AuditEvent,
  Capability,
  ProductChangeProposal,
  ProductChangeRevision,
  ProductDescriptionProposal,
  ProductDescriptionRevision,
  ProductPriceProposal,
  ProductPriceRevision,
  ProductPriceTarget,
  ProductSummary,
} from "../domain/types";

export type ProductSearch = {
  query: string;
  limit: number;
};

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

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  next(prefix: "proposal" | "revision" | "event"): string;
}
