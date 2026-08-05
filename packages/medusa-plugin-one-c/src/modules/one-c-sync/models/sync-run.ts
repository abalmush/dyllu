import { model } from "@medusajs/framework/utils";

export const OneCSyncRun = model
  .define("dyllu_one_c_sync_run", {
    id: model.id({ prefix: "onecrun" }).primaryKey(),
    trigger: model.enum(["manual", "mcp"]),
    status: model.enum(["fetching", "ready", "failed"]),
    actor_id: model.text(),
    request_id: model.text(),
    transport_trusted: model.boolean().default(false),
    outbound_ip: model.text().nullable(),
    counts: model.json().nullable(),
    error_code: model.text().nullable(),
    error_message: model.text().nullable(),
    started_at: model.dateTime(),
    completed_at: model.dateTime().nullable(),
  })
  .indexes([
    {
      name: "IDX_dyllu_one_c_run_started",
      on: ["started_at"],
      unique: false,
    },
    {
      name: "IDX_dyllu_one_c_run_status",
      on: ["status", "started_at"],
      unique: false,
    },
  ]);
