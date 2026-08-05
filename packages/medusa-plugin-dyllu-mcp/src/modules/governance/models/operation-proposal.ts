import { model } from "@medusajs/framework/utils";

import {
  operationKinds,
  operationTargetTypes,
  proposalStatuses,
} from "../../../domain/types";

export const DylluMcpOperationProposal = model
  .define("dyllu_mcp_operation_proposal", {
    id: model.id({ prefix: "mcpop" }).primaryKey(),
    kind: model.enum([...operationKinds]),
    status: model.enum([...proposalStatuses]),
    actor_id: model.text(),
    target_type: model.enum([...operationTargetTypes]),
    target_id: model.text().nullable(),
    target_key: model.text(),
    before_value: model.json(),
    proposed_value: model.json(),
    target_version: model.text().nullable(),
    content_hash: model.text(),
    reason: model.text(),
    source_revision_id: model.text().nullable(),
    expires_at: model.dateTime(),
  })
  .indexes([
    {
      name: "IDX_dyllu_mcp_operation_proposal_actor_target",
      on: ["actor_id", "target_key", "status"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_dyllu_mcp_operation_proposal_expires_at",
      on: ["expires_at"],
      unique: false,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_dyllu_mcp_operation_proposal_pending_unique",
      on: ["actor_id", "target_key"],
      unique: true,
      where: "deleted_at IS NULL AND status = 'pending'",
    },
  ]);
