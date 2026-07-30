import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260729193201 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "dyllu_mcp_audit_event" ("id" text not null, "name" text check ("name" in ('proposal.created', 'proposal.superseded', 'proposal.expired', 'proposal.rejected', 'proposal.confirmed', 'proposal.applied', 'proposal.failed', 'capabilities.updated', 'authorization.denied')) not null, "actor_id" text not null, "target_id" text not null, "proposal_id" text null, "revision_id" text null, "request_id" text not null, "details" jsonb not null, "occurred_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dyllu_mcp_audit_event_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_audit_event_deleted_at" ON "dyllu_mcp_audit_event" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_event_target_occurred" ON "dyllu_mcp_audit_event" ("target_id", "occurred_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_event_actor_occurred" ON "dyllu_mcp_audit_event" ("actor_id", "occurred_at") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "dyllu_mcp_capability_grant" ("id" text not null, "user_id" text not null, "capability" text check ("capability" in ('capability.manage', 'product.read', 'product_content.update', 'product_price.update', 'product.rollback', 'homepage_draft.update', 'homepage.publish', 'audit.read')) not null, "granted_by" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dyllu_mcp_capability_grant_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_capability_grant_deleted_at" ON "dyllu_mcp_capability_grant" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dyllu_mcp_grant_user_capability" ON "dyllu_mcp_capability_grant" ("user_id", "capability") WHERE deleted_at IS NULL;`
    );

    this.addSql(
      `create table if not exists "dyllu_mcp_change_proposal" ("id" text not null, "kind" text check ("kind" in ('description_update', 'description_rollback', 'price_update', 'price_rollback')) not null, "status" text check ("status" in ('pending', 'applied', 'expired', 'rejected', 'superseded', 'failed')) not null, "actor_id" text not null, "product_id" text not null, "product_title" text not null, "variant_id" text null, "price_id" text null, "currency_code" text null, "before_value" text not null, "proposed_value" text not null, "target_updated_at" timestamptz not null, "content_hash" text not null, "reason" text not null, "source_revision_id" text null, "expires_at" timestamptz not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dyllu_mcp_change_proposal_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_change_proposal_deleted_at" ON "dyllu_mcp_change_proposal" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_proposal_actor_product" ON "dyllu_mcp_change_proposal" ("actor_id", "product_id", "status") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_proposal_expires_at" ON "dyllu_mcp_change_proposal" ("expires_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dyllu_mcp_proposal_pending_unique" ON "dyllu_mcp_change_proposal" ("actor_id", "product_id") WHERE deleted_at IS NULL AND status = 'pending';`
    );
    this.addSql(`
      alter table "dyllu_mcp_change_proposal"
      add constraint "dyllu_mcp_change_proposal_target_check"
      check (
        (
          kind in ('description_update', 'description_rollback') and
          variant_id is null and price_id is null and currency_code is null
        ) or (
          kind in ('price_update', 'price_rollback') and
          variant_id is not null and price_id is not null and currency_code = 'mdl'
        )
      );
    `);

    this.addSql(
      `create table if not exists "dyllu_mcp_change_revision" ("id" text not null, "proposal_id" text not null, "kind" text check ("kind" in ('description_update', 'description_rollback', 'price_update', 'price_rollback')) not null, "action" text check ("action" in ('update', 'rollback')) not null, "actor_id" text not null, "actor_email" text not null, "actor_name" text not null, "product_id" text not null, "product_title" text not null, "variant_id" text null, "price_id" text null, "currency_code" text null, "before_value" text not null, "after_value" text not null, "source_revision_id" text null, "reason" text not null, "request_id" text not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dyllu_mcp_change_revision_pkey" primary key ("id"));`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_change_revision_deleted_at" ON "dyllu_mcp_change_revision" ("deleted_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_dyllu_mcp_revision_product_created" ON "dyllu_mcp_change_revision" ("product_id", "created_at") WHERE deleted_at IS NULL;`
    );
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_dyllu_mcp_revision_proposal" ON "dyllu_mcp_change_revision" ("proposal_id") WHERE deleted_at IS NULL;`
    );
    this.addSql(`
      alter table "dyllu_mcp_change_revision"
      add constraint "dyllu_mcp_change_revision_target_check"
      check (
        (
          kind in ('description_update', 'description_rollback') and
          variant_id is null and price_id is null and currency_code is null
        ) or (
          kind in ('price_update', 'price_rollback') and
          variant_id is not null and price_id is not null and currency_code = 'mdl'
        )
      );
    `);

    this.addSql(`
      create or replace function dyllu_mcp_reject_audit_mutation()
      returns trigger as $$
      begin
        raise exception 'DYLLU MCP audit records are immutable';
      end;
      $$ language plpgsql;
    `);
    this.addSql(`
      create trigger "TRG_dyllu_mcp_revision_immutable"
      before update or delete on "dyllu_mcp_change_revision"
      for each row execute function dyllu_mcp_reject_audit_mutation();
    `);
    this.addSql(`
      create trigger "TRG_dyllu_mcp_event_immutable"
      before update or delete on "dyllu_mcp_audit_event"
      for each row execute function dyllu_mcp_reject_audit_mutation();
    `);
    this.addSql(`
      create or replace function dyllu_mcp_protect_proposal()
      returns trigger as $$
      begin
        if TG_OP = 'DELETE' then
          raise exception 'DYLLU MCP proposals cannot be deleted';
        end if;
        if
          OLD.id is distinct from NEW.id or
          OLD.kind is distinct from NEW.kind or
          OLD.actor_id is distinct from NEW.actor_id or
          OLD.product_id is distinct from NEW.product_id or
          OLD.product_title is distinct from NEW.product_title or
          OLD.variant_id is distinct from NEW.variant_id or
          OLD.price_id is distinct from NEW.price_id or
          OLD.currency_code is distinct from NEW.currency_code or
          OLD.before_value is distinct from NEW.before_value or
          OLD.proposed_value is distinct from NEW.proposed_value or
          OLD.target_updated_at is distinct from NEW.target_updated_at or
          OLD.content_hash is distinct from NEW.content_hash or
          OLD.reason is distinct from NEW.reason or
          OLD.source_revision_id is distinct from NEW.source_revision_id or
          OLD.expires_at is distinct from NEW.expires_at or
          OLD.created_at is distinct from NEW.created_at or
          OLD.deleted_at is distinct from NEW.deleted_at
        then
          raise exception 'DYLLU MCP proposal content is immutable';
        end if;
        return NEW;
      end;
      $$ language plpgsql;
    `);
    this.addSql(`
      create trigger "TRG_dyllu_mcp_proposal_content_immutable"
      before update or delete on "dyllu_mcp_change_proposal"
      for each row execute function dyllu_mcp_protect_proposal();
    `);
  }

  override async down(): Promise<void> {
    this.addSql(
      'drop trigger if exists "TRG_dyllu_mcp_proposal_content_immutable" on "dyllu_mcp_change_proposal";'
    );
    this.addSql(
      'drop trigger if exists "TRG_dyllu_mcp_event_immutable" on "dyllu_mcp_audit_event";'
    );
    this.addSql(
      'drop trigger if exists "TRG_dyllu_mcp_revision_immutable" on "dyllu_mcp_change_revision";'
    );
    this.addSql("drop function if exists dyllu_mcp_reject_audit_mutation();");
    this.addSql("drop function if exists dyllu_mcp_protect_proposal();");

    this.addSql(`drop table if exists "dyllu_mcp_audit_event" cascade;`);

    this.addSql(`drop table if exists "dyllu_mcp_capability_grant" cascade;`);

    this.addSql(`drop table if exists "dyllu_mcp_change_proposal" cascade;`);

    this.addSql(`drop table if exists "dyllu_mcp_change_revision" cascade;`);
  }
}
