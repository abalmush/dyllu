import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { ProductChangeApplication } from "../../application/product-change-application";
import { createDylluMcpServer } from "../server";

describe("DYLLU MCP server", () => {
  it("publishes through clients that do not support MCP elicitation", async () => {
    const application = {
      publishPrice: jest.fn().mockResolvedValue({ id: "revision_test" }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_test" }),
      { error: jest.fn() }
    );
    const client = new Client(
      { name: "dyllu-mcp-test", version: "1.0.0" },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const contentHash = `sha256:${"a".repeat(64)}`;
      const result = await client.callTool({
        name: "publish_product_price",
        arguments: {
          proposal_id: "proposal_test",
          confirmed_content_hash: contentHash,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.publishPrice).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_test" },
        {
          proposalId: "proposal_test",
          confirmation: {
            action: "accept",
            proposalId: "proposal_test",
            contentHash,
            confirmedAt: expect.any(Date),
          },
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("logs unexpected tool failures with request context", async () => {
    const failure = new Error("catalog query failed");
    const application = {
      searchProducts: jest.fn().mockRejectedValue(failure),
    } as unknown as ProductChangeApplication;
    const logger = { error: jest.fn() };
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_test" }),
      logger,
      ["mcp:connect"]
    );
    const client = new Client(
      { name: "dyllu-mcp-test", version: "1.0.0" },
      { capabilities: {} }
    );
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    try {
      const result = await client.callTool({
        name: "search_products",
        arguments: { query: "drill", limit: 10 },
      });

      expect(result).toMatchObject({
        isError: true,
        content: [
          {
            type: "text",
            text: JSON.stringify({
              code: "internal_error",
              message: "The DYLLU MCP operation failed",
            }),
          },
        ],
      });
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(JSON.parse(logger.error.mock.calls[0]![0])).toMatchObject({
        event: "dyllu_mcp.tool.failed",
        request_id: "request_test",
        actor_id: "user_test",
        tool: "search_products",
        error_name: "Error",
        error_message: "catalog query failed",
      });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
