import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260805170000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "dyllu_one_c_product_mapping" (
        "id" text not null,
        "external_id" text not null,
        "medusa_variant_id" text not null,
        "medusa_sku" text not null,
        "actor_id" text not null,
        "active" boolean not null default true,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_one_c_product_mapping_pkey" primary key ("id")
      );
    `);
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dyllu_one_c_mapping_external" ON "dyllu_one_c_product_mapping" ("external_id");`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dyllu_one_c_mapping_variant" ON "dyllu_one_c_product_mapping" ("medusa_variant_id");`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_one_c_product_mapping_deleted_at" ON "dyllu_one_c_product_mapping" ("deleted_at") WHERE deleted_at IS NULL;`
    );
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dyllu_one_c_product_mapping" cascade;`);
  }
}
