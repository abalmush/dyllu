import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260805120000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      create table if not exists "dyllu_mcp_operation_proposal" (
        "id" text not null,
        "kind" text check ("kind" in (
          'sale_create',
          'sale_items_update',
          'sale_status_update',
          'sale_rollback',
          'category_assignment_update',
          'category_assignment_rollback',
          'promotion_status_update',
          'promotion_status_rollback',
          'return_request_create',
          'return_cancel'
        )) not null,
        "status" text check ("status" in (
          'pending', 'applied', 'expired', 'rejected', 'superseded', 'failed'
        )) not null,
        "actor_id" text not null,
        "target_type" text check ("target_type" in (
          'sale',
          'product_category',
          'promotion',
          'return'
        )) not null,
        "target_id" text null,
        "target_key" text not null,
        "before_value" jsonb not null,
        "proposed_value" jsonb not null,
        "target_version" text null,
        "content_hash" text not null,
        "reason" text not null,
        "source_revision_id" text null,
        "expires_at" timestamptz not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_mcp_operation_proposal_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      create index if not exists "IDX_dyllu_mcp_operation_proposal_deleted_at"
      on "dyllu_mcp_operation_proposal" ("deleted_at") where deleted_at is null;
    `);
    this.addSql(`
      create index if not exists "IDX_dyllu_mcp_operation_proposal_actor_target"
      on "dyllu_mcp_operation_proposal" ("actor_id", "target_key", "status")
      where deleted_at is null;
    `);
    this.addSql(`
      create index if not exists "IDX_dyllu_mcp_operation_proposal_expires_at"
      on "dyllu_mcp_operation_proposal" ("expires_at") where deleted_at is null;
    `);
    this.addSql(`
      create unique index if not exists "IDX_dyllu_mcp_operation_proposal_pending_unique"
      on "dyllu_mcp_operation_proposal" ("actor_id", "target_key")
      where deleted_at is null and status = 'pending';
    `);

    this.addSql(`
      create table if not exists "dyllu_mcp_operation_revision" (
        "id" text not null,
        "proposal_id" text not null,
        "kind" text check ("kind" in (
          'sale_create',
          'sale_items_update',
          'sale_status_update',
          'sale_rollback',
          'category_assignment_update',
          'category_assignment_rollback',
          'promotion_status_update',
          'promotion_status_rollback',
          'return_request_create',
          'return_cancel'
        )) not null,
        "action" text check ("action" in ('update', 'rollback')) not null,
        "actor_id" text not null,
        "actor_email" text not null,
        "actor_name" text not null,
        "target_type" text check ("target_type" in (
          'sale',
          'product_category',
          'promotion',
          'return'
        )) not null,
        "target_id" text not null,
        "target_key" text not null,
        "before_value" jsonb not null,
        "after_value" jsonb not null,
        "source_revision_id" text null,
        "reason" text not null,
        "request_id" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "dyllu_mcp_operation_revision_pkey" primary key ("id")
      );
    `);
    this.addSql(`
      create index if not exists "IDX_dyllu_mcp_operation_revision_deleted_at"
      on "dyllu_mcp_operation_revision" ("deleted_at") where deleted_at is null;
    `);
    this.addSql(`
      create index if not exists "IDX_dyllu_mcp_operation_revision_target_created"
      on "dyllu_mcp_operation_revision" ("target_key", "created_at")
      where deleted_at is null;
    `);
    this.addSql(`
      create unique index if not exists "IDX_dyllu_mcp_operation_revision_proposal"
      on "dyllu_mcp_operation_revision" ("proposal_id") where deleted_at is null;
    `);

    this.addSql(`
      create or replace function dyllu_mcp_protect_operation_proposal()
      returns trigger as $$
      begin
        if TG_OP = 'DELETE' then
          raise exception 'DYLLU MCP operation proposals cannot be deleted';
        end if;
        if
          OLD.id is distinct from NEW.id or
          OLD.kind is distinct from NEW.kind or
          OLD.actor_id is distinct from NEW.actor_id or
          OLD.target_type is distinct from NEW.target_type or
          OLD.target_id is distinct from NEW.target_id or
          OLD.target_key is distinct from NEW.target_key or
          OLD.before_value is distinct from NEW.before_value or
          OLD.proposed_value is distinct from NEW.proposed_value or
          OLD.target_version is distinct from NEW.target_version or
          OLD.content_hash is distinct from NEW.content_hash or
          OLD.reason is distinct from NEW.reason or
          OLD.source_revision_id is distinct from NEW.source_revision_id or
          OLD.expires_at is distinct from NEW.expires_at or
          OLD.created_at is distinct from NEW.created_at or
          OLD.deleted_at is distinct from NEW.deleted_at
        then
          raise exception 'DYLLU MCP operation proposal content is immutable';
        end if;
        return NEW;
      end;
      $$ language plpgsql;
    `);
    this.addSql(`
      create trigger "TRG_dyllu_mcp_operation_proposal_content_immutable"
      before update or delete on "dyllu_mcp_operation_proposal"
      for each row execute function dyllu_mcp_protect_operation_proposal();
    `);
    this.addSql(`
      create trigger "TRG_dyllu_mcp_operation_revision_immutable"
      before update or delete on "dyllu_mcp_operation_revision"
      for each row execute function dyllu_mcp_reject_audit_mutation();
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      drop trigger if exists "TRG_dyllu_mcp_operation_proposal_content_immutable"
      on "dyllu_mcp_operation_proposal";
    `);
    this.addSql(`
      drop trigger if exists "TRG_dyllu_mcp_operation_revision_immutable"
      on "dyllu_mcp_operation_revision";
    `);
    this.addSql(
      `drop function if exists dyllu_mcp_protect_operation_proposal();`
    );
    this.addSql(`drop table if exists "dyllu_mcp_operation_revision" cascade;`);
    this.addSql(`drop table if exists "dyllu_mcp_operation_proposal" cascade;`);
  }
}
