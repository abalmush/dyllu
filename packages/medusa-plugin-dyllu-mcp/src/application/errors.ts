export type ApplicationErrorCode =
  | "actor_not_active"
  | "capability_denied"
  | "product_not_found"
  | "invalid_catalog_audit"
  | "catalog_audit_limit_exceeded"
  | "catalog_audit_unstable"
  | "proposal_not_found"
  | "revision_not_found"
  | "invalid_description"
  | "invalid_description_batch"
  | "invalid_price"
  | "invalid_revision_price"
  | "invalid_reason"
  | "invalid_audit_limit"
  | "invalid_order_date"
  | "invalid_order_report"
  | "order_report_limit_exceeded"
  | "order_report_unstable"
  | "order_not_found"
  | "sale_directory_unavailable"
  | "sale_not_found"
  | "sale_data_invalid"
  | "sale_overlap_limit_exceeded"
  | "sale_control_unavailable"
  | "invalid_sale"
  | "invalid_sale_items"
  | "invalid_sale_dates"
  | "invalid_sale_price"
  | "sale_variant_not_found"
  | "sale_overlap"
  | "unsupported_sale_item"
  | "unchanged_sale"
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
