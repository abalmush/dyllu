import { Client } from "pg";

import { Migration20260729193201 } from "../migrations/Migration20260729193201";
import { Migration20260802130000 } from "../migrations/Migration20260802130000";
import { Migration20260805120000 } from "../migrations/Migration20260805120000";

const databaseUrl = process.env.MCP_MIGRATION_DATABASE_URL;

describe("DYLLU MCP governance migrations", () => {
  if (!databaseUrl) {
    it("requires MCP_MIGRATION_DATABASE_URL", () => {
      throw new Error("MCP_MIGRATION_DATABASE_URL is required");
    });
    return;
  }

  const client = new Client({ connectionString: databaseUrl });

  beforeAll(async () => {
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("upgrades existing governance data and enforces immutable operation records", async () => {
    await runUp(client, new Migration20260729193201(undefined!, undefined!));
    await runUp(client, new Migration20260802130000(undefined!, undefined!));
    await client.query(`
      insert into dyllu_mcp_capability_grant
        (id, user_id, capability, granted_by)
      values
        ('grant_existing', 'user_existing', 'product.read', 'user_admin');
    `);

    const migration = new Migration20260805120000(undefined!, undefined!);
    await runUp(client, migration);

    await client.query(`
      insert into dyllu_mcp_capability_grant
        (id, user_id, capability, granted_by)
      values
        ('grant_sale', 'user_existing', 'sale.update', 'user_admin');
    `);
    await client.query(`
      insert into dyllu_mcp_operation_proposal
        (id, kind, status, actor_id, target_type, target_id, target_key,
         before_value, proposed_value, target_version, content_hash, reason,
         source_revision_id, expires_at)
      values
        ('mcpop_test', 'sale_create', 'pending', 'user_existing', 'sale', null,
         'sale:new:mcpop_test', '{}'::jsonb, '{"title":"Test"}'::jsonb,
         null, 'sha256:test', 'Create a test sale', null, now() + interval '30 minutes');
    `);
    await client.query(`
      insert into dyllu_mcp_operation_revision
        (id, proposal_id, kind, action, actor_id, actor_email, actor_name,
         target_type, target_id, target_key, before_value, after_value,
         source_revision_id, reason, request_id)
      values
        ('mcporev_test', 'mcpop_test', 'sale_create', 'update', 'user_existing',
         'manager@dyllu.md', 'Manager', 'sale', 'plist_test', 'sale:plist_test',
         '{}'::jsonb, '{"title":"Test"}'::jsonb, null, 'Create a test sale',
         'request_test');
    `);

    const existingGrant = await client.query(
      "select capability from dyllu_mcp_capability_grant where id = 'grant_existing'"
    );
    expect(existingGrant.rows).toEqual([{ capability: "product.read" }]);
    await expect(
      client.query(
        "update dyllu_mcp_operation_proposal set reason = 'Changed' where id = 'mcpop_test'"
      )
    ).rejects.toThrow(/proposal content is immutable/i);
    await expect(
      client.query(
        "delete from dyllu_mcp_operation_revision where id = 'mcporev_test'"
      )
    ).rejects.toThrow(/audit records are immutable/i);

    migration.reset();
    await migration.down();
    await runQueries(client, migration.getQueries());
    const removedTables = await client.query(`
      select
        to_regclass('dyllu_mcp_operation_proposal') as proposal,
        to_regclass('dyllu_mcp_operation_revision') as revision;
    `);
    expect(removedTables.rows).toEqual([{ proposal: null, revision: null }]);
    await expect(
      client.query(`
        insert into dyllu_mcp_capability_grant
          (id, user_id, capability, granted_by)
        values
          ('grant_sale_after_down', 'user_existing', 'sale.update', 'user_admin');
      `)
    ).rejects.toThrow(/capability_check/i);
  });
});

async function runUp(
  client: Client,
  migration: { up(): Promise<void> | void; getQueries(): unknown[] }
) {
  await migration.up();
  await runQueries(client, migration.getQueries());
}

async function runQueries(client: Client, queries: unknown[]) {
  for (const query of queries) {
    if (typeof query !== "string") {
      throw new Error("Migration integration tests require SQL strings");
    }
    await client.query(query);
  }
}
