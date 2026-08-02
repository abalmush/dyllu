import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260802130000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "dyllu_mcp_capability_grant"
      drop constraint if exists "dyllu_mcp_capability_grant_capability_check";
    `);
    this.addSql(`
      alter table "dyllu_mcp_capability_grant"
      add constraint "dyllu_mcp_capability_grant_capability_check"
      check ("capability" in (
        'capability.manage',
        'order.read',
        'product.read',
        'product_content.update',
        'product_price.update',
        'product.rollback',
        'homepage_draft.update',
        'homepage.publish',
        'audit.read'
      ));
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      delete from "dyllu_mcp_capability_grant"
      where "capability" = 'order.read';
    `);
    this.addSql(`
      alter table "dyllu_mcp_capability_grant"
      drop constraint if exists "dyllu_mcp_capability_grant_capability_check";
    `);
    this.addSql(`
      alter table "dyllu_mcp_capability_grant"
      add constraint "dyllu_mcp_capability_grant_capability_check"
      check ("capability" in (
        'capability.manage',
        'product.read',
        'product_content.update',
        'product_price.update',
        'product.rollback',
        'homepage_draft.update',
        'homepage.publish',
        'audit.read'
      ));
    `);
  }
}
