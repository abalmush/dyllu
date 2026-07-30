import { model } from "@medusajs/framework/utils";

import { proposalKinds, proposalStatuses } from "../../../domain/types";

export const DylluMcpChangeProposal = model
  .define("dyllu_mcp_change_proposal", {
    id: model.id({ prefix: "mcpprop" }).primaryKey(),
    kind: model.enum([...proposalKinds]),
    status: model.enum([...proposalStatuses]),
    actor_id: model.text(),
    product_id: model.text(),
    product_title: model.text(),
    variant_id: model.text().nullable(),
    price_id: model.text().nullable(),
    currency_code: model.text().nullable(),
    before_value: model.text(),
    proposed_value: model.text(),
    target_updated_at: model.dateTime(),
    content_hash: model.text(),
    reason: model.text(),
    source_revision_id: model.text().nullable(),
    expires_at: model.dateTime(),
  })
  .indexes([
    {
      name: "IDX_dyllu_mcp_proposal_actor_product",
      on: ["actor_id", "product_id", "status"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_dyllu_mcp_proposal_expires_at",
      on: ["expires_at"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_dyllu_mcp_proposal_pending_unique",
      on: ["actor_id", "product_id"],
      unique: true,
      where: "deleted_at IS NULL AND status = 'pending'",
    },
  ]);
