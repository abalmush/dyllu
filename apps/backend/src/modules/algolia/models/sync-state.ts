import { model } from "@medusajs/framework/utils";

export const AlgoliaSyncState = model.define("dyllu_algolia_sync_state", {
  id: model.id({ prefix: "algsync" }).primaryKey(),
  last_synced_at: model.dateTime().nullable(),
});
