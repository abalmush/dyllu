import { model } from "@medusajs/framework/utils";

export const OneCAppliedChange = model
  .define("dyllu_one_c_applied_change", {
    id: model.id({ prefix: "onecapplied" }).primaryKey(),
    run_id: model.text(),
    sync_item_id: model.text(),
    medusa_variant_id: model.text(),
    field: model.enum(["regular_price_mdl", "sale_price_mdl", "balance"]),
    before: model.json().nullable(),
    after: model.json().nullable(),
    actor_id: model.text(),
    applied_at: model.dateTime(),
    status: model.enum(["applied", "flagged", "failed"]),
    error_message: model.text().nullable(),
  })
  .indexes([
    {
      name: "IDX_dyllu_one_c_applied_item",
      on: ["sync_item_id", "field"],
      unique: false,
    },
    {
      name: "IDX_dyllu_one_c_applied_run",
      on: ["run_id"],
      unique: false,
    },
  ]);
