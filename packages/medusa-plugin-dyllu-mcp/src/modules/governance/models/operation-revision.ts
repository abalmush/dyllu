import { model } from "@medusajs/framework/utils";

import {
  operationKinds,
  operationTargetTypes,
  revisionActions,
} from "../../../domain/types";

export const DylluMcpOperationRevision = model
  .define("dyllu_mcp_operation_revision", {
    id: model.id({ prefix: "mcporev" }).primaryKey(),
    proposal_id: model.text(),
    kind: model.enum([...operationKinds]),
    action: model.enum([...revisionActions]),
    actor_id: model.text(),
    actor_email: model.text(),
    actor_name: model.text(),
    target_type: model.enum([...operationTargetTypes]),
    target_id: model.text(),
    target_key: model.text(),
    before_value: model.json(),
    after_value: model.json(),
    source_revision_id: model.text().nullable(),
    reason: model.text(),
    request_id: model.text(),
  })
  .indexes([
    {
      name: "IDX_dyllu_mcp_operation_revision_target_created",
      on: ["target_key", "created_at"],
      unique: false,
    },
    {
      name: "IDX_dyllu_mcp_operation_revision_proposal",
      on: ["proposal_id"],
      unique: true,
    },
  ]);
