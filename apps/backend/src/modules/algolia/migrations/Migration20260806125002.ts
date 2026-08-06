import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260806125002 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "dyllu_algolia_sync_state" ("id" text not null, "last_synced_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dyllu_algolia_sync_state_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dyllu_algolia_sync_state_deleted_at" ON "dyllu_algolia_sync_state" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dyllu_algolia_sync_state" cascade;`);
  }

}
