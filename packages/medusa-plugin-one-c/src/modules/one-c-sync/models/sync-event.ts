import { model } from "@medusajs/framework/utils";

export const OneCSyncEvent = model
  .define("dyllu_one_c_sync_event", {
    id: model.id({ prefix: "onecevent" }).primaryKey(),
    run_id: model.text(),
    actor_id: model.text(),
    type: model.enum(["export"]),
    details: model.json(),
    occurred_at: model.dateTime(),
  })
  .indexes([
    {
      name: "IDX_dyllu_one_c_event_run",
      on: ["run_id", "occurred_at"],
      unique: false,
    },
  ]);
