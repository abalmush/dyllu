export const capabilities = [
  "capability.manage",
  "order.read",
  "product.read",
  "product_content.update",
  "product_price.update",
  "product.rollback",
  "homepage_draft.update",
  "homepage.publish",
  "audit.read",
  "one_c_sync.read",
  "one_c_sync.refresh",
] as const;

export type Capability = (typeof capabilities)[number];

export type Actor = {
  id: string;
  email: string;
  name: string;
};

export type RequestContext = {
  actorId: string;
  requestId: string;
};

export type OrderSummary = {
  id: string;
  displayId: number;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  email: string | null;
  customerId: string | null;
  currencyCode: string;
  total: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderAddress = {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  countryCode: string | null;
};

export type OrderLineItem = {
  id: string;
  title: string;
  variantId: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type OrderDetails = OrderSummary & {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  canceledAt: Date | null;
  shippingAddress: OrderAddress | null;
  billingAddress: OrderAddress | null;
  items: OrderLineItem[];
  shippingMethods: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
};

export type ProductSummary = {
  id: string;
  title: string;
  handle: string;
  status: string;
  description: string | null;
  updatedAt: Date;
  variants: ProductVariantSummary[];
};

export type ProductVariantPriceSummary = {
  id: string;
  amount: number;
  currencyCode: string;
  updatedAt: Date;
};

export type ProductVariantSummary = {
  id: string;
  title: string;
  sku: string | null;
  updatedAt: Date;
  prices: ProductVariantPriceSummary[];
};

export type ProductPriceTarget = {
  productId: string;
  productTitle: string;
  variantId: string;
  variantTitle: string;
  sku: string | null;
  priceId: string;
  amount: number;
  currencyCode: string;
  updatedAt: Date;
};

export const proposalStatuses = [
  "pending",
  "applied",
  "expired",
  "rejected",
  "superseded",
  "failed",
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number];

export const proposalKinds = [
  "description_update",
  "description_rollback",
  "price_update",
  "price_rollback",
] as const;

export type ProposalKind = (typeof proposalKinds)[number];

type BaseProductChangeProposal = {
  id: string;
  status: ProposalStatus;
  actorId: string;
  productId: string;
  productTitle: string;
  variantId: string | null;
  priceId: string | null;
  currencyCode: string | null;
  beforeValue: string;
  proposedValue: string;
  targetUpdatedAt: Date;
  contentHash: string;
  reason: string;
  sourceRevisionId: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export type ProductDescriptionProposal = BaseProductChangeProposal & {
  kind: "description_update" | "description_rollback";
  variantId: null;
  priceId: null;
  currencyCode: null;
};

export type ProductPriceProposal = BaseProductChangeProposal & {
  kind: "price_update" | "price_rollback";
  variantId: string;
  priceId: string;
  currencyCode: string;
};

export type ProductChangeProposal =
  | ProductDescriptionProposal
  | ProductPriceProposal;

export const revisionActions = ["update", "rollback"] as const;

export type RevisionAction = (typeof revisionActions)[number];

type BaseProductChangeRevision = {
  id: string;
  proposalId: string;
  action: RevisionAction;
  actor: Actor;
  productId: string;
  productTitle: string;
  variantId: string | null;
  priceId: string | null;
  currencyCode: string | null;
  beforeValue: string;
  afterValue: string;
  sourceRevisionId: string | null;
  reason: string;
  requestId: string;
  createdAt: Date;
};

export type ProductDescriptionRevision = BaseProductChangeRevision & {
  kind: "description_update" | "description_rollback";
  variantId: null;
  priceId: null;
  currencyCode: null;
};

export type ProductPriceRevision = BaseProductChangeRevision & {
  kind: "price_update" | "price_rollback";
  variantId: string;
  priceId: string;
  currencyCode: string;
};

export type ProductChangeRevision =
  | ProductDescriptionRevision
  | ProductPriceRevision;

export type ConfirmationReceipt = {
  action: "accept";
  proposalId: string;
  contentHash: string;
  confirmedAt: Date;
};

export const auditEventNames = [
  "proposal.created",
  "proposal.superseded",
  "proposal.expired",
  "proposal.rejected",
  "proposal.confirmed",
  "proposal.applied",
  "proposal.failed",
  "capabilities.updated",
  "authorization.denied",
] as const;

export type AuditEventName = (typeof auditEventNames)[number];

export type AuditEvent = {
  id: string;
  name: AuditEventName;
  actorId: string;
  targetId: string;
  proposalId: string | null;
  revisionId: string | null;
  requestId: string;
  details: Record<string, string | number | boolean | null>;
  occurredAt: Date;
};
