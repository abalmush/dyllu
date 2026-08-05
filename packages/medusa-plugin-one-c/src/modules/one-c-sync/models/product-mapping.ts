import { model } from "@medusajs/framework/utils";

export const OneCProductMapping = model
  .define("dyllu_one_c_product_mapping", {
    id: model.id({ prefix: "onecmap" }).primaryKey(),
    external_id: model.text(),
    medusa_variant_id: model.text(),
    medusa_sku: model.text(),
    actor_id: model.text(),
    active: model.boolean().default(true),
  })
  .indexes([
    {
      name: "IDX_dyllu_one_c_mapping_external",
      on: ["external_id"],
      unique: true,
    },
    {
      name: "IDX_dyllu_one_c_mapping_variant",
      on: ["medusa_variant_id"],
      unique: true,
    },
  ]);
