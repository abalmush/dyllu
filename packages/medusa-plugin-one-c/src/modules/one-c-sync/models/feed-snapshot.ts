import { model } from "@medusajs/framework/utils";

export const OneCFeedSnapshot = model
  .define("dyllu_one_c_feed_snapshot", {
    id: model.id({ prefix: "onecsnap" }).primaryKey(),
    run_id: model.text(),
    endpoint: model.enum([
      "product_batches",
      "products",
      "categories",
      "brands",
      "promo",
    ]),
    batch: model.number().nullable(),
    url: model.text(),
    response_hash: model.text(),
    raw_body: model.text(),
    status_code: model.number(),
    elapsed_ms: model.number(),
  })
  .indexes([
    {
      name: "IDX_dyllu_one_c_snapshot_run",
      on: ["run_id", "endpoint", "batch"],
      unique: false,
    },
  ]);
