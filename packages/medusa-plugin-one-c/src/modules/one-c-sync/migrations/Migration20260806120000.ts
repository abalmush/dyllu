import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260806120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "dyllu_one_c_applied_change" (
        "id" text not null,
        "run_id" text not null,
        "sync_item_id" text not null,
        "medusa_variant_id" text not null,
        "field" text check ("field" in ('regular_price_mdl', 'sale_price_mdl', 'balance')) not null,
        "before" jsonb null,
        "after" jsonb null,
        "actor_id" text not null,
        "applied_at" timestamptz not null,
        "status" text check ("status" in ('applied', 'flagged', 'failed')) not null,
        "error_message" text null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_one_c_applied_change_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_applied_change_deleted_at" ON "dyllu_one_c_applied_change" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_applied_item" ON "dyllu_one_c_applied_change" ("sync_item_id", "field") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_applied_run" ON "dyllu_one_c_applied_change" ("run_id") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dyllu_one_c_applied_change" cascade;`);
  }
}
