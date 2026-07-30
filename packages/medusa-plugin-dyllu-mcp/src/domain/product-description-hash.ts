import { createHash } from "node:crypto";

export function createProductDescriptionHash(input: {
  productId: string;
  productUpdatedAt: Date;
  beforeValue: string;
  proposedValue: string;
}) {
  const digest = createHash("sha256")
    .update(input.productId)
    .update("\0")
    .update(input.productUpdatedAt.toISOString())
    .update("\0")
    .update(input.beforeValue)
    .update("\0")
    .update(input.proposedValue)
    .digest("hex");

  return `sha256:${digest}`;
}
