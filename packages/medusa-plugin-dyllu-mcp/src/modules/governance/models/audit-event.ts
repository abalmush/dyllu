import { model } from "@medusajs/framework/utils";

import { auditEventNames } from "../../../domain/types";

export const DylluMcpAuditEvent = model
  .define("dyllu_mcp_audit_event", {
    id: model.id({ prefix: "mcpevt" }).primaryKey(),
    name: model.enum([...auditEventNames]),
    actor_id: model.text(),
    target_id: model.text(),
    proposal_id: model.text().nullable(),
    revision_id: model.text().nullable(),
    request_id: model.text(),
    details: model.json(),
    occurred_at: model.dateTime(),
  })
  .indexes([
    {
      name: "IDX_dyllu_mcp_event_target_occurred",
      on: ["target_id", "occurred_at"],
      unique: false,
    },
    {
      name: "IDX_dyllu_mcp_event_actor_occurred",
      on: ["actor_id", "occurred_at"],
      unique: false,
    },
  ]);
