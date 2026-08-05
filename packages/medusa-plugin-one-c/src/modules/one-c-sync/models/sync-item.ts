import { model } from "@medusajs/framework/utils";

export const OneCSyncItem = model
  .define("dyllu_one_c_sync_item", {
    id: model.id({ prefix: "onecitem" }).primaryKey(),
    run_id: model.text(),
    external_id: model.text(),
    sku: model.text(),
    name: model.text(),
    mapping_status: model.enum([
      "matched",
      "missing_medusa",
      "ambiguous",
      "excluded",
    ]),
    preparation_status: model.enum([
      "unreviewed",
      "needs_data",
      "ready_to_create",
      "not_planned",
      "created",
    ]),
    medusa_product_id: model.text().nullable(),
    medusa_variant_id: model.text().nullable(),
    medusa_product_title: model.text().nullable(),
    source: model.json(),
    normalized: model.json(),
    differences: model.json(),
    hidden: model.boolean().default(false),
    deleted: model.boolean().default(false),
  })
  .indexes([
    {
      name: "IDX_dyllu_one_c_item_run_status",
      on: ["run_id", "mapping_status"],
      unique: false,
    },
    {
      name: "IDX_dyllu_one_c_item_run_sku",
      on: ["run_id", "sku"],
      unique: false,
    },
  ]);
