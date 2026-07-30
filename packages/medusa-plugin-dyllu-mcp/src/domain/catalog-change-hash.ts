import { createHash } from "node:crypto";

import { ProposalKind } from "./types";

export function createCatalogChangeHash(input: {
  kind: ProposalKind;
  productId: string;
  variantId: string | null;
  priceId: string | null;
  currencyCode: string | null;
  targetUpdatedAt: Date;
  beforeValue: string;
  proposedValue: string;
}) {
  const fields = [
    input.kind,
    input.productId,
    input.variantId ?? "",
    input.priceId ?? "",
    input.currencyCode ?? "",
    input.targetUpdatedAt.toISOString(),
    input.beforeValue,
    input.proposedValue,
  ];
  const digest = createHash("sha256").update(fields.join("\0")).digest("hex");
  return `sha256:${digest}`;
}
