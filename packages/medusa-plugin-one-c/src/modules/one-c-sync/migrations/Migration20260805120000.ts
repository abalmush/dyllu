import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260805120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "dyllu_one_c_sync_run" (
        "id" text not null,
        "trigger" text check ("trigger" in ('manual', 'mcp')) not null,
        "status" text check ("status" in ('fetching', 'ready', 'failed')) not null,
        "actor_id" text not null,
        "request_id" text not null,
        "transport_trusted" boolean not null default false,
        "outbound_ip" text null,
        "counts" jsonb null,
        "error_code" text null,
        "error_message" text null,
        "started_at" timestamptz not null,
        "completed_at" timestamptz null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_one_c_sync_run_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_sync_run_deleted_at" ON "dyllu_one_c_sync_run" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_run_started" ON "dyllu_one_c_sync_run" ("started_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_run_status" ON "dyllu_one_c_sync_run" ("status", "started_at") WHERE deleted_at IS NULL;`
    );

    this.addSql(`
      create table if not exists "dyllu_one_c_feed_snapshot" (
        "id" text not null,
        "run_id" text not null,
        "endpoint" text check ("endpoint" in ('product_batches', 'products', 'categories', 'brands', 'promo')) not null,
        "batch" integer null,
        "url" text not null,
        "response_hash" text not null,
        "raw_body" text not null,
        "status_code" integer not null,
        "elapsed_ms" integer not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_one_c_feed_snapshot_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_feed_snapshot_deleted_at" ON "dyllu_one_c_feed_snapshot" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_snapshot_run" ON "dyllu_one_c_feed_snapshot" ("run_id", "endpoint", "batch") WHERE deleted_at IS NULL;`
    );

    this.addSql(`
      create table if not exists "dyllu_one_c_sync_item" (
        "id" text not null,
        "run_id" text not null,
        "external_id" text not null,
        "sku" text not null,
        "name" text not null,
        "mapping_status" text check ("mapping_status" in ('matched', 'missing_medusa', 'ambiguous', 'excluded')) not null,
        "preparation_status" text check ("preparation_status" in ('unreviewed', 'needs_data', 'ready_to_create', 'not_planned', 'created')) not null,
        "medusa_product_id" text null,
        "medusa_variant_id" text null,
        "medusa_product_title" text null,
        "source" jsonb not null,
        "normalized" jsonb not null,
        "differences" jsonb not null,
        "hidden" boolean not null default false,
        "deleted" boolean not null default false,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_one_c_sync_item_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_sync_item_deleted_at" ON "dyllu_one_c_sync_item" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_item_run_status" ON "dyllu_one_c_sync_item" ("run_id", "mapping_status") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_item_run_sku" ON "dyllu_one_c_sync_item" ("run_id", "sku") WHERE deleted_at IS NULL;`
    );

    this.addSql(`
      create table if not exists "dyllu_one_c_sync_event" (
        "id" text not null,
        "run_id" text not null,
        "actor_id" text not null,
        "type" text check ("type" in ('export')) not null,
        "details" jsonb not null,
        "occurred_at" timestamptz not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_one_c_sync_event_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_sync_event_deleted_at" ON "dyllu_one_c_sync_event" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_event_run" ON "dyllu_one_c_sync_event" ("run_id", "occurred_at") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dyllu_one_c_sync_event" cascade;`);
    this.addSql(`drop table if exists "dyllu_one_c_sync_item" cascade;`);
    this.addSql(`drop table if exists "dyllu_one_c_feed_snapshot" cascade;`);
    this.addSql(`drop table if exists "dyllu_one_c_sync_run" cascade;`);
  }
}
