import { model } from "@medusajs/framework/utils";

import { proposalKinds, revisionActions } from "../../../domain/types";

export const DylluMcpChangeRevision = model
  .define("dyllu_mcp_change_revision", {
    id: model.id({ prefix: "mcprev" }).primaryKey(),
    proposal_id: model.text(),
    kind: model.enum([...proposalKinds]),
    action: model.enum([...revisionActions]),
    actor_id: model.text(),
    actor_email: model.text(),
    actor_name: model.text(),
    product_id: model.text(),
    product_title: model.text(),
    variant_id: model.text().nullable(),
    price_id: model.text().nullable(),
    currency_code: model.text().nullable(),
    before_value: model.text(),
    after_value: model.text(),
    source_revision_id: model.text().nullable(),
    reason: model.text(),
    request_id: model.text(),
  })
  .indexes([
    {
      name: "IDX_dyllu_mcp_revision_product_created",
      on: ["product_id", "created_at"],
      unique: false,
    },
    {
      name: "IDX_dyllu_mcp_revision_proposal",
      on: ["proposal_id"],
      unique: true,
    },
  ]);
