export type ApplicationErrorCode =
  | "actor_not_active"
  | "capability_denied"
  | "product_not_found"
  | "proposal_not_found"
  | "revision_not_found"
  | "invalid_description"
  | "invalid_price"
  | "invalid_revision_price"
  | "invalid_reason"
  | "invalid_audit_limit"
  | "invalid_order_date"
  | "order_not_found"
  | "unchanged_description"
  | "unchanged_price"
  | "price_not_found"
  | "proposal_not_pending"
  | "proposal_expired"
  | "proposal_owner_mismatch"
  | "proposal_kind_mismatch"
  | "revision_kind_mismatch"
  | "confirmation_mismatch"
  | "stale_product"
  | "stale_price";

export class ApplicationError extends Error {
  constructor(
    public readonly code: ApplicationErrorCode,
    message: string
  ) {
    super(message);
    this.name = "ApplicationError";
  }
}
