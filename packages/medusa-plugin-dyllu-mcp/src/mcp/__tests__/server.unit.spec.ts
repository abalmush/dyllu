import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { ProductChangeApplication } from "../../application/product-change-application";
import { createDylluMcpServer } from "../server";

describe("DYLLU MCP server", () => {
  it("uses the confirmed mapping for an exact DYLLU SKU", async () => {
    const application = {
      getMappedOneCProduct: jest.fn().mockResolvedValue({
        items: [{ sku: "DTPB1952", balance: 5 }],
        count: 1,
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_one_c_mapping" }),
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
      await client.callTool({
        name: "get_mapped_one_c_product",
        arguments: { sku: "DTPB1952" },
      });

      expect(application.getMappedOneCProduct).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_one_c_mapping" },
        "DTPB1952"
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("reads stored 1C mismatches without receiving fresh data", async () => {
    const application = {
      listOneCComparisons: jest.fn().mockResolvedValue({ items: [], count: 0 }),
      receiveOneCCatalog: jest.fn(),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_one_c_read" }),
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
      await client.callTool({
        name: "list_one_c_product_mismatches",
        arguments: { mapping_status: "missing_dyllu", limit: 20, offset: 0 },
      });

      expect(application.listOneCComparisons).toHaveBeenCalled();
      expect(application.receiveOneCCatalog).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("reads stored 1C sale prices without receiving fresh data", async () => {
    const application = {
      listOneCSales: jest.fn().mockResolvedValue({ items: [], count: 0 }),
      receiveOneCCatalog: jest.fn(),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_one_c_sales" }),
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
      await client.callTool({
        name: "list_one_c_sales",
        arguments: { limit: 20, offset: 0 },
      });

      expect(application.listOneCSales).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_one_c_sales" },
        { limit: 20, offset: 0 }
      );
      expect(application.receiveOneCCatalog).not.toHaveBeenCalled();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("receives fresh 1C data only through the explicit receive tool", async () => {
    const application = {
      receiveOneCCatalog: jest.fn().mockResolvedValue({
        id: "onecrun_test",
        status: "ready",
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_one_c_receive" }),
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
      await client.callTool({ name: "receive_one_c_catalog", arguments: {} });

      expect(application.receiveOneCCatalog).toHaveBeenCalledWith({
        actorId: "user_test",
        requestId: "request_one_c_receive",
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("uses only DYLLU terminology in manager-visible tool metadata", async () => {
    const server = createDylluMcpServer(
      {} as ProductChangeApplication,
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
      const tools = await client.listTools();
      expect(JSON.stringify(tools)).not.toMatch(/medusa/i);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("returns the exact DYLLU product count", async () => {
    const application = {
      countProducts: jest.fn().mockResolvedValue({ count: 137 }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_product_count" }),
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
      const result = await client.callTool({
        name: "count_products",
        arguments: {},
      });

      expect(result.isError).not.toBe(true);
      expect(result.content).toEqual([
        { type: "text", text: JSON.stringify({ count: 137 }) },
      ]);
      expect(application.countProducts).toHaveBeenCalledWith({
        actorId: "user_test",
        requestId: "request_product_count",
      });
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("runs a bounded DYLLU catalog quality audit", async () => {
    const application = {
      auditCatalogQuality: jest.fn().mockResolvedValue({
        productCount: 137,
        productsWithIssues: 4,
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_catalog_audit" }),
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
      const result = await client.callTool({
        name: "audit_catalog_quality",
        arguments: {
          minimum_description_length: 100,
          result_limit: 75,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.auditCatalogQuality).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_catalog_audit" },
        { minimumDescriptionLength: 100, resultLimit: 75 }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("creates independent DYLLU description proposals in one batch", async () => {
    const application = {
      proposeDescriptionBatch: jest.fn().mockResolvedValue({
        proposals: [{ id: "proposal_1" }, { id: "proposal_2" }],
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_description_batch" }),
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
      const result = await client.callTool({
        name: "propose_product_description_batch",
        arguments: {
          items: [
            {
              product_id: "prod_one",
              proposed_description: "First corrected description",
            },
            {
              product_id: "prod_two",
              proposed_description: "Second corrected description",
            },
          ],
          reason: "Correct incomplete descriptions",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.proposeDescriptionBatch).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_description_batch" },
        {
          items: [
            {
              productId: "prod_one",
              proposedDescription: "First corrected description",
            },
            {
              productId: "prod_two",
              proposedDescription: "Second corrected description",
            },
          ],
          reason: "Correct incomplete descriptions",
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("returns a bounded DYLLU inventory exception report", async () => {
    const application = {
      getInventoryExceptions: jest.fn().mockResolvedValue({
        managedVariantCount: 50,
        variantsWithExceptions: 4,
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_inventory" }),
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
      const result = await client.callTool({
        name: "get_inventory_exceptions",
        arguments: {
          low_stock_threshold: 7,
          result_limit: 80,
          published_only: true,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.getInventoryExceptions).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_inventory" },
        { lowStockThreshold: 7, resultLimit: 80, publishedOnly: true }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("lists DYLLU sales with bounded pagination", async () => {
    const application = {
      listSales: jest.fn().mockResolvedValue({ sales: [], count: 0 }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_sales" }),
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
      const result = await client.callTool({
        name: "list_sales",
        arguments: { status: "active", limit: 20, offset: 0 },
      });

      expect(result.isError).not.toBe(true);
      expect(application.listSales).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_sales" },
        { status: "active", limit: 20, offset: 0 }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("creates a reviewable DYLLU category assignment proposal", async () => {
    const application = {
      proposeProductCategoryAssignments: jest.fn().mockResolvedValue({
        id: "operationProposal_1",
        contentHash: "sha256:test",
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_category" }),
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
      const result = await client.callTool({
        name: "propose_product_category_assignments",
        arguments: {
          category_id: "pcat_tools",
          add_product_ids: ["prod_drill"],
          remove_product_ids: ["prod_hammer"],
          reason: "Move the selected products",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(
        application.proposeProductCategoryAssignments
      ).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_category" },
        {
          categoryId: "pcat_tools",
          addProductIds: ["prod_drill"],
          removeProductIds: ["prod_hammer"],
          reason: "Move the selected products",
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("creates a reviewable DYLLU promotion status proposal", async () => {
    const application = {
      proposePromotionStatus: jest.fn().mockResolvedValue({
        id: "operationProposal_promotion",
        contentHash: "sha256:test",
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_promotion" }),
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
      const result = await client.callTool({
        name: "propose_promotion_status",
        arguments: {
          promotion_id: "promo_august",
          status: "active",
          reason: "Start the approved campaign",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.proposePromotionStatus).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_promotion" },
        {
          promotionId: "promo_august",
          status: "active",
          reason: "Start the approved campaign",
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("creates a reviewable DYLLU return request proposal", async () => {
    const application = {
      proposeReturnRequest: jest.fn().mockResolvedValue({
        id: "operationProposal_return",
        contentHash: "sha256:test",
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_return" }),
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
      const result = await client.callTool({
        name: "propose_return_request",
        arguments: {
          order_reference: "42",
          items: [
            {
              item_id: "item_drill",
              quantity: 1,
              reason_id: null,
              note: "Unused item",
            },
          ],
          note: "Customer return request",
          reason: "Customer requested a return",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.proposeReturnRequest).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_return" },
        {
          orderReference: "42",
          items: [
            {
              itemId: "item_drill",
              quantity: 1,
              reasonId: null,
              note: "Unused item",
            },
          ],
          note: "Customer return request",
          reason: "Customer requested a return",
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("gets one DYLLU sale with its exact items", async () => {
    const application = {
      getSale: jest.fn().mockResolvedValue({ id: "plist_summer", items: [] }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_sale" }),
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
      const result = await client.callTool({
        name: "get_sale",
        arguments: { sale_id: "plist_summer" },
      });

      expect(result.isError).not.toBe(true);
      expect(application.getSale).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_sale" },
        "plist_summer"
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("creates a sale proposal without publishing it", async () => {
    const application = {
      proposeSaleCreate: jest.fn().mockResolvedValue({
        id: "mcpop_test",
        status: "pending",
        contentHash: `sha256:${"b".repeat(64)}`,
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_sale_proposal" }),
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
      const result = await client.callTool({
        name: "propose_sale_create",
        arguments: {
          title: "August sale",
          description: "Selected tools",
          status: "draft",
          starts_at: "2026-08-01T00:00:00.000Z",
          ends_at: "2026-08-31T23:59:59.000Z",
          items: [{ variant_id: "variant_tools", sale_amount: 299 }],
          reason: "Prepare the August sale",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.proposeSaleCreate).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_sale_proposal" },
        {
          title: "August sale",
          description: "Selected tools",
          status: "draft",
          startsAt: "2026-08-01T00:00:00.000Z",
          endsAt: "2026-08-31T23:59:59.000Z",
          items: [{ variantId: "variant_tools", saleAmount: 299 }],
          reason: "Prepare the August sale",
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("publishes only an exact confirmed sale proposal", async () => {
    const application = {
      publishSaleChange: jest.fn().mockResolvedValue({
        id: "mcporev_test",
        targetId: "plist_summer",
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_sale_publish" }),
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
      const contentHash = `sha256:${"c".repeat(64)}`;
      const result = await client.callTool({
        name: "publish_sale_change",
        arguments: {
          proposal_id: "mcpop_test",
          confirmed_content_hash: contentHash,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.publishSaleChange).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_sale_publish" },
        {
          proposalId: "mcpop_test",
          confirmation: {
            action: "accept",
            proposalId: "mcpop_test",
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

  it("lists DYLLU orders for an exact calendar date", async () => {
    const application = {
      listOrders: jest.fn().mockResolvedValue({ orders: [], count: 0 }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_orders" }),
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
      const result = await client.callTool({
        name: "list_orders",
        arguments: {
          date: "2026-08-02",
          status: "pending",
          limit: 20,
          offset: 0,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.listOrders).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_orders" },
        {
          localDate: "2026-08-02",
          timeZone: "Europe/Chisinau",
          status: "pending",
          limit: 20,
          offset: 0,
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("returns a daily DYLLU order report", async () => {
    const application = {
      getDailyOrderReport: jest.fn().mockResolvedValue({
        localDate: "2026-08-02",
        orderCount: 3,
        exceptionCount: 1,
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_order_report" }),
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
      const result = await client.callTool({
        name: "get_daily_order_report",
        arguments: {
          date: "2026-08-02",
          stale_after_minutes: 180,
          exception_limit: 25,
        },
      });

      expect(result.isError).not.toBe(true);
      expect(application.getDailyOrderReport).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_order_report" },
        {
          localDate: "2026-08-02",
          timeZone: "Europe/Chisinau",
          staleAfterMinutes: 180,
          exceptionLimit: 25,
        }
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("gets complete DYLLU order information by order reference", async () => {
    const application = {
      getOrder: jest.fn().mockResolvedValue({
        id: "order_42",
        displayId: 42,
      }),
    } as unknown as ProductChangeApplication;
    const server = createDylluMcpServer(
      application,
      () => ({ actorId: "user_test", requestId: "request_order" }),
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
      const result = await client.callTool({
        name: "get_order",
        arguments: { order_reference: "#42" },
      });

      expect(result.isError).not.toBe(true);
      expect(application.getOrder).toHaveBeenCalledWith(
        { actorId: "user_test", requestId: "request_order" },
        "#42"
      );
    } finally {
      await client.close();
      await server.close();
    }
  });

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
