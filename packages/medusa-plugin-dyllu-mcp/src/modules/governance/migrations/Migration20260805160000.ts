import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260805160000 extends Migration {
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
        'sale.read',
        'sale.update',
        'sale.rollback',
        'inventory.read',
        'merchandising.read',
        'merchandising.update',
        'merchandising.rollback',
        'promotion.read',
        'promotion.update',
        'promotion.rollback',
        'return.read',
        'return.create',
        'return.cancel',
        'product_content.update',
        'product_price.update',
        'product.rollback',
        'homepage_draft.update',
        'homepage.publish',
        'audit.read',
        'one_c_sync.read',
        'one_c_sync.refresh'
      ));
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      delete from "dyllu_mcp_capability_grant"
      where "capability" in (
        'sale.read', 'sale.update', 'sale.rollback', 'inventory.read',
        'merchandising.read', 'merchandising.update', 'merchandising.rollback',
        'promotion.read', 'promotion.update', 'promotion.rollback',
        'return.read', 'return.create', 'return.cancel'
      );
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
        'order.read',
        'product.read',
        'product_content.update',
        'product_price.update',
        'product.rollback',
        'homepage_draft.update',
        'homepage.publish',
        'audit.read',
        'one_c_sync.read',
        'one_c_sync.refresh'
      ));
    `);
  }
}
