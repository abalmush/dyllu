import { model } from "@medusajs/framework/utils";

import { capabilities } from "../../../domain/types";

export const DylluMcpCapabilityGrant = model
  .define("dyllu_mcp_capability_grant", {
    id: model.id({ prefix: "mcpgrant" }).primaryKey(),
    user_id: model.text(),
    capability: model.enum([...capabilities]),
    granted_by: model.text(),
  })
  .indexes([
    {
      name: "IDX_dyllu_mcp_grant_user_capability",
      on: ["user_id", "capability"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ]);
