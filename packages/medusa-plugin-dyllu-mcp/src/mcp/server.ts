import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "@medusajs/framework/zod";

import { ApplicationError } from "../application/errors";
import { ProductChangeApplication } from "../application/product-change-application";
import { RequestContext } from "../domain/types";

const productIdSchema = z.string().trim().min(1).max(100);
const proposalIdSchema = z.string().trim().min(1).max(100);
const revisionIdSchema = z.string().trim().min(1).max(100);
const orderReferenceSchema = z.string().trim().min(1).max(100);
const contentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);
const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const orderStatusSchema = z.enum([
  "pending",
  "completed",
  "archived",
  "canceled",
  "requires_action",
]);
const saleStatusSchema = z.enum(["active", "draft"]);
const categoryIdSchema = z.string().trim().min(1).max(100);
const promotionIdSchema = z.string().trim().min(1).max(100);
const promotionStatusSchema = z.enum(["draft", "active", "inactive"]);
const returnIdSchema = z.string().trim().min(1).max(100);
const returnStatusSchema = z.enum([
  "requested",
  "received",
  "partially_received",
  "canceled",
]);
const oneCMappingStatusSchema = z.enum([
  "missing_dyllu",
  "matched",
  "ambiguous",
  "excluded",
]);

export function createDylluMcpServer(
  application: ProductChangeApplication,
  getContext: () => RequestContext,
  logger: { error(message: string): void },
  securityScopes: string[] = ["mcp:connect"]
) {
  const execute = <T>(tool: string, operation: () => Promise<T>) =>
    executeTool(operation, (error) => {
      const context = getContext();
      logger.error(
        JSON.stringify({
          event: "dyllu_mcp.tool.failed",
          request_id: context.requestId,
          actor_id: context.actorId,
          tool,
          ...describeError(error),
        })
      );
    });
  const oauthToolMeta = {
    securitySchemes: [
      {
        type: "oauth2",
        scopes: [...securityScopes],
      },
    ],
  };
  const server = new McpServer(
    {
      name: "dyllu-admin",
      version: "0.1.0",
    },
    {
      instructions: [
        "Never say the word Medusa to the manager, in any context, even to explain how something works internally. Always call the platform the DYLLU Website.",
        "Use search_products and get_product before proposing a change.",
        "Use count_products for the exact DYLLU catalog total.",
        "Use audit_catalog_quality to find missing or weak DYLLU product data before proposing corrections.",
        "Use propose_product_description_batch for up to 20 corrections, then show every independent proposal before any publish call.",
        "Use propose_product_price_batch for up to 100 base-price corrections in one call instead of one propose_product_price call per variant, then show every independent proposal before any publish call.",
        "Use get_inventory_exceptions to find missing, low, negative, or inconsistent DYLLU stock data.",
        "Use list_product_categories and get_product_category before proposing a DYLLU category assignment change.",
        "Use list_promotions and get_promotion before proposing a DYLLU promotion status change.",
        "Use get_order, list_returns, and get_return before proposing a DYLLU return request or cancellation.",
        "Use list_sales and get_sale before proposing a DYLLU sale change.",
        "Every 1C question uses the latest stored snapshot: get_one_c_sync_status, list_one_c_product_mismatches, get_mapped_one_c_product, and list_one_c_sales all read stored data only and never contact 1C.",
        "Never call receive_one_c_catalog as a side effect of another request, and never call it automatically. Call it only when the manager's own words explicitly ask for a fresh 1C receive, refresh, or new snapshot (for example: create a new 1C snapshot, refresh the 1C feed, get fresh 1C data).",
        "Use get_mapped_one_c_product for 1C price or balance questions about a DYLLU SKU. Never infer a mapping from a product name.",
        "Use list_one_c_sales to find stored 1C promotion prices, validity dates, mapped DYLLU variant IDs, and the DYLLU Website's current base price for each variant (dyllu_base_price_mdl, sale_valid). A sale_valid of false means the base price is stale and must be corrected with propose_product_price before that variant can go on sale.",
        "Use list_orders for a specific DYLLU calendar date and get_order for complete order information.",
        "Use get_daily_order_report for exact order totals, status groups, and exceptions for one DYLLU calendar date.",
        "Interpret today, yesterday and calendar dates in Europe/Chisinau.",
        "Proposal tools never mutate public DYLLU catalog data.",
        "Show the complete before/after proposal to the manager.",
        "Call publish_product_description only after the manager asks to publish.",
        "Call publish_product_price only after the manager asks to publish the exact price proposal.",
        "Call publish_sale_change only after the manager asks to publish the exact sale proposal.",
        "Call publish_merchandising_change only after the manager asks to publish the exact category proposal.",
        "Call publish_promotion_change only after the manager asks to publish the exact promotion proposal.",
        "Call publish_return_change only after the manager asks to publish the exact return proposal.",
        "Only call a publish tool after the manager explicitly confirms the exact proposal.",
        "Pass the exact stored content_hash as confirmed_content_hash when publishing.",
        "Rollback creates a new proposal and never removes audit history.",
        "Never invent DYLLU product facts, prices, specifications or warranty terms.",
        "Preserve verified facts unless the manager provides a verified replacement.",
        "Ask the manager when required DYLLU product information is uncertain.",
      ].join(" "),
    }
  );

  server.registerTool(
    "get_my_access",
    {
      title: "Get my DYLLU access",
      description:
        "Return the authenticated DYLLU manager and exact MCP capabilities.",
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    () => execute("get_my_access", () => application.getMyAccess(getContext()))
  );

  server.registerTool(
    "search_products",
    {
      title: "Search DYLLU products",
      description:
        "Search a bounded DYLLU product projection before proposing changes.",
      inputSchema: z
        .object({
          query: z.string().trim().min(2).max(100),
          limit: z.number().int().min(1).max(20).default(10),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("search_products", () =>
        application.searchProducts(getContext(), {
          query: input.query,
          limit: input.limit,
        })
      )
  );

  server.registerTool(
    "count_products",
    {
      title: "Count DYLLU products",
      description: "Return the exact number of products in the DYLLU catalog.",
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    () =>
      execute("count_products", () => application.countProducts(getContext()))
  );

  server.registerTool(
    "audit_catalog_quality",
    {
      title: "Audit DYLLU catalog quality",
      description:
        "Scan the complete bounded DYLLU catalog for missing titles, handles, descriptions, images, variants, SKUs, duplicate SKUs, and invalid normal MDL prices.",
      inputSchema: z
        .object({
          minimum_description_length: z
            .number()
            .int()
            .min(0)
            .max(1_000)
            .default(80),
          result_limit: z.number().int().min(1).max(200).default(50),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("audit_catalog_quality", () =>
        application.auditCatalogQuality(getContext(), {
          minimumDescriptionLength: input.minimum_description_length,
          resultLimit: input.result_limit,
        })
      )
  );

  server.registerTool(
    "get_one_c_sync_status",
    {
      title: "Get stored 1C sync status",
      description:
        "Return the latest stored 1C sync status and feed summary. This does not call 1C.",
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    () =>
      execute("get_one_c_sync_status", () =>
        application.getOneCSyncStatus(getContext())
      )
  );

  server.registerTool(
    "get_mapped_one_c_product",
    {
      title: "Get confirmed 1C product data",
      description:
        "Return stored 1C data only for an exact DYLLU SKU with a confirmed private 1C mapping. This does not call 1C. An empty result means that the SKU has no confirmed mapping in the latest snapshot.",
      inputSchema: z
        .object({
          sku: z.string().trim().min(1).max(100),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("get_mapped_one_c_product", () =>
        application.getMappedOneCProduct(getContext(), input.sku)
      )
  );

  server.registerTool(
    "list_one_c_product_mismatches",
    {
      title: "List stored 1C product comparisons",
      description:
        "List products from a stored 1C snapshot by DYLLU match result. This does not call 1C.",
      inputSchema: z
        .object({
          run_id: z.string().trim().min(1).max(100).optional(),
          mapping_status: oneCMappingStatusSchema.default("missing_dyllu"),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_one_c_product_mismatches", () =>
        application.listOneCComparisons(getContext(), {
          ...(input.run_id ? { runId: input.run_id } : {}),
          mappingStatus:
            input.mapping_status === "missing_dyllu"
              ? "missing_medusa"
              : input.mapping_status,
          limit: input.limit,
          offset: input.offset,
        })
      )
  );

  server.registerTool(
    "list_one_c_sales",
    {
      title: "List stored 1C sale prices",
      description:
        "List products from a stored 1C snapshot that currently have a 1C promotion price, with the mapped DYLLU variant ID, regular and sale MDL prices, validity dates, mapping status, the DYLLU Website's current base price, and whether the sale price is valid against it. Always reads the latest stored snapshot; never contacts 1C. Use before propose_sale_create.",
      inputSchema: z
        .object({
          run_id: z.string().trim().min(1).max(100).optional(),
          limit: z.number().int().min(1).max(100).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_one_c_sales", () =>
        application.listOneCSales(getContext(), {
          ...(input.run_id ? { runId: input.run_id } : {}),
          limit: input.limit,
          offset: input.offset,
        })
      )
  );

  server.registerTool(
    "receive_one_c_catalog",
    {
      title: "Receive fresh 1C catalog data",
      description:
        "Make a new read-only call to the fixed 1C feed and store a comparison snapshot. This does not change DYLLU products or prices. Call this only when the manager explicitly asks for fresh 1C data, a refresh, or a new snapshot. Never call it automatically or as a side effect of any other request.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
      _meta: oauthToolMeta,
    },
    () =>
      execute("receive_one_c_catalog", () =>
        application.receiveOneCCatalog(getContext())
      )
  );

  server.registerTool(
    "get_inventory_exceptions",
    {
      title: "Get DYLLU inventory exceptions",
      description:
        "Scan bounded DYLLU variant inventory for missing links, missing location levels, low stock, no stock, negative availability, and reservations above stock.",
      inputSchema: z
        .object({
          low_stock_threshold: z
            .number()
            .int()
            .min(0)
            .max(1_000_000)
            .default(5),
          result_limit: z.number().int().min(1).max(200).default(50),
          published_only: z.boolean().default(true),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("get_inventory_exceptions", () =>
        application.getInventoryExceptions(getContext(), {
          lowStockThreshold: input.low_stock_threshold,
          resultLimit: input.result_limit,
          publishedOnly: input.published_only,
        })
      )
  );

  server.registerTool(
    "list_product_categories",
    {
      title: "List DYLLU product categories",
      description:
        "List bounded DYLLU product categories in storefront navigation order.",
      inputSchema: z
        .object({
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_product_categories", () =>
        application.listProductCategories(getContext(), input)
      )
  );

  server.registerTool(
    "get_product_category",
    {
      title: "Get a DYLLU product category",
      description:
        "Return one DYLLU product category and a bounded page of assigned products.",
      inputSchema: z
        .object({
          category_id: categoryIdSchema,
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ category_id: categoryId, limit, offset }) =>
      execute("get_product_category", () =>
        application.getProductCategory(getContext(), categoryId, {
          limit,
          offset,
        })
      )
  );

  server.registerTool(
    "propose_product_category_assignments",
    {
      title: "Propose DYLLU product category assignments",
      description:
        "Store an exact proposal to add or remove up to 100 products in one DYLLU product category. This does not publish anything.",
      inputSchema: z
        .object({
          category_id: categoryIdSchema,
          add_product_ids: z.array(productIdSchema).max(100).default([]),
          remove_product_ids: z.array(productIdSchema).max(100).default([]),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_product_category_assignments", () =>
        application.proposeProductCategoryAssignments(getContext(), {
          categoryId: input.category_id,
          addProductIds: input.add_product_ids,
          removeProductIds: input.remove_product_ids,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "list_product_category_history",
    {
      title: "List DYLLU product category history",
      description:
        "Return immutable DYLLU product category assignment revisions for audit and rollback.",
      inputSchema: z
        .object({
          category_id: categoryIdSchema,
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ category_id: categoryId, limit }) =>
      execute("list_product_category_history", () =>
        application.listProductCategoryHistory(getContext(), categoryId, limit)
      )
  );

  server.registerTool(
    "propose_product_category_rollback",
    {
      title: "Propose a DYLLU product category rollback",
      description:
        "Create a reviewable proposal that restores historical product assignments for one DYLLU product category.",
      inputSchema: z
        .object({
          revision_id: revisionIdSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({ revision_id: revisionId, reason }) =>
      execute("propose_product_category_rollback", () =>
        application.proposeProductCategoryRollback(getContext(), {
          revisionId,
          reason,
        })
      )
  );

  server.registerTool(
    "publish_merchandising_change",
    {
      title: "Publish a DYLLU merchandising change",
      description:
        "Publish an exact stored DYLLU product category proposal after the manager explicitly confirms it.",
      inputSchema: z
        .object({
          proposal_id: proposalIdSchema,
          confirmed_content_hash: contentHashSchema,
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({
      proposal_id: proposalId,
      confirmed_content_hash: confirmedContentHash,
    }) =>
      execute("publish_merchandising_change", async () => {
        const revision = await application.publishMerchandisingChange(
          getContext(),
          {
            proposalId,
            confirmation: {
              action: "accept",
              proposalId,
              contentHash: confirmedContentHash,
              confirmedAt: new Date(),
            },
          }
        );
        return { published: true, revision };
      })
  );

  server.registerTool(
    "list_promotions",
    {
      title: "List DYLLU promotions",
      description: "List bounded DYLLU discount promotions, newest first.",
      inputSchema: z
        .object({
          status: promotionStatusSchema.optional(),
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_promotions", () =>
        application.listPromotions(getContext(), {
          ...(input.status ? { status: input.status } : {}),
          limit: input.limit,
          offset: input.offset,
        })
      )
  );

  server.registerTool(
    "get_promotion",
    {
      title: "Get a DYLLU promotion",
      description:
        "Return one DYLLU promotion with its code, type, status, limits, usage, and campaign link.",
      inputSchema: z.object({ promotion_id: promotionIdSchema }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ promotion_id: promotionId }) =>
      execute("get_promotion", () =>
        application.getPromotion(getContext(), promotionId)
      )
  );

  server.registerTool(
    "propose_promotion_status",
    {
      title: "Propose a DYLLU promotion status change",
      description:
        "Store an exact proposal to activate, pause, or return one DYLLU promotion to draft. This does not publish anything.",
      inputSchema: z
        .object({
          promotion_id: promotionIdSchema,
          status: promotionStatusSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_promotion_status", () =>
        application.proposePromotionStatus(getContext(), {
          promotionId: input.promotion_id,
          status: input.status,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "list_promotion_history",
    {
      title: "List DYLLU promotion history",
      description:
        "Return immutable DYLLU promotion status revisions for audit and rollback.",
      inputSchema: z
        .object({
          promotion_id: promotionIdSchema,
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ promotion_id: promotionId, limit }) =>
      execute("list_promotion_history", () =>
        application.listPromotionHistory(getContext(), promotionId, limit)
      )
  );

  server.registerTool(
    "propose_promotion_rollback",
    {
      title: "Propose a DYLLU promotion rollback",
      description:
        "Create a reviewable proposal that restores a historical DYLLU promotion status.",
      inputSchema: z
        .object({
          revision_id: revisionIdSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({ revision_id: revisionId, reason }) =>
      execute("propose_promotion_rollback", () =>
        application.proposePromotionRollback(getContext(), {
          revisionId,
          reason,
        })
      )
  );

  server.registerTool(
    "publish_promotion_change",
    {
      title: "Publish a DYLLU promotion change",
      description:
        "Publish an exact stored DYLLU promotion proposal after the manager explicitly confirms it.",
      inputSchema: z
        .object({
          proposal_id: proposalIdSchema,
          confirmed_content_hash: contentHashSchema,
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({
      proposal_id: proposalId,
      confirmed_content_hash: confirmedContentHash,
    }) =>
      execute("publish_promotion_change", async () => {
        const revision = await application.publishPromotionChange(
          getContext(),
          {
            proposalId,
            confirmation: {
              action: "accept",
              proposalId,
              contentHash: confirmedContentHash,
              confirmedAt: new Date(),
            },
          }
        );
        return { published: true, revision };
      })
  );

  server.registerTool(
    "list_sales",
    {
      title: "List DYLLU sales",
      description:
        "List bounded DYLLU sale campaigns, newest first. This returns only sale price lists.",
      inputSchema: z
        .object({
          status: saleStatusSchema.optional(),
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_sales", () =>
        application.listSales(getContext(), {
          ...(input.status ? { status: input.status } : {}),
          limit: input.limit,
          offset: input.offset,
        })
      )
  );

  server.registerTool(
    "get_sale",
    {
      title: "Get a DYLLU sale",
      description:
        "Return one DYLLU sale with exact variants, normal MDL prices, and sale MDL prices.",
      inputSchema: z
        .object({ sale_id: z.string().trim().min(1).max(100) })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ sale_id: saleId }) =>
      execute("get_sale", () => application.getSale(getContext(), saleId))
  );

  server.registerTool(
    "propose_sale_create",
    {
      title: "Propose a DYLLU sale",
      description:
        "Store an exact reviewable proposal for a new DYLLU sale. This does not publish anything. Each sale price must be below its normal MDL price.",
      inputSchema: z
        .object({
          title: z.string().trim().min(1).max(120),
          description: z.string().trim().max(500).default(""),
          status: saleStatusSchema.default("draft"),
          starts_at: z.string().datetime().nullable().default(null),
          ends_at: z.string().datetime().nullable().default(null),
          items: z
            .array(
              z
                .object({
                  variant_id: z.string().trim().min(1).max(100),
                  sale_amount: z.number().int().min(1).max(100_000_000),
                })
                .strict()
            )
            .min(1)
            .max(100),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_sale_create", () =>
        application.proposeSaleCreate(getContext(), {
          title: input.title,
          description: input.description,
          status: input.status,
          startsAt: input.starts_at,
          endsAt: input.ends_at,
          items: input.items.map((item) => ({
            variantId: item.variant_id,
            saleAmount: item.sale_amount,
          })),
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "propose_sale_items",
    {
      title: "Propose DYLLU sale item changes",
      description:
        "Store an exact proposal to add, update, or remove variants in one DYLLU sale. This does not publish anything.",
      inputSchema: z
        .object({
          sale_id: z.string().trim().min(1).max(100),
          upsert: z
            .array(
              z
                .object({
                  variant_id: z.string().trim().min(1).max(100),
                  sale_amount: z.number().int().min(1).max(100_000_000),
                })
                .strict()
            )
            .max(100)
            .default([]),
          remove_variant_ids: z
            .array(z.string().trim().min(1).max(100))
            .max(100)
            .default([]),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_sale_items", () =>
        application.proposeSaleItems(getContext(), {
          saleId: input.sale_id,
          upsert: input.upsert.map((item) => ({
            variantId: item.variant_id,
            saleAmount: item.sale_amount,
          })),
          removeVariantIds: input.remove_variant_ids,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "propose_sale_status",
    {
      title: "Propose a DYLLU sale status change",
      description:
        "Store an exact proposal to activate, pause, or end one DYLLU sale. Ending makes the sale draft and sets its end time. This does not publish anything.",
      inputSchema: z
        .object({
          sale_id: z.string().trim().min(1).max(100),
          action: z.enum(["activate", "pause", "end"]),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_sale_status", () =>
        application.proposeSaleStatus(getContext(), {
          saleId: input.sale_id,
          action: input.action,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "list_sale_history",
    {
      title: "List DYLLU sale history",
      description:
        "Return immutable DYLLU sale revisions for audit and rollback.",
      inputSchema: z
        .object({
          sale_id: z.string().trim().min(1).max(100),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ sale_id: saleId, limit }) =>
      execute("list_sale_history", () =>
        application.listSaleHistory(getContext(), saleId, limit)
      )
  );

  server.registerTool(
    "propose_sale_rollback",
    {
      title: "Propose a DYLLU sale rollback",
      description:
        "Create a reviewable proposal that restores one historical DYLLU sale revision. A created sale is safely ended, not deleted.",
      inputSchema: z
        .object({
          revision_id: revisionIdSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({ revision_id: revisionId, reason }) =>
      execute("propose_sale_rollback", () =>
        application.proposeSaleRollback(getContext(), {
          revisionId,
          reason,
        })
      )
  );

  server.registerTool(
    "get_operation_proposal",
    {
      title: "Review a DYLLU operation proposal",
      description:
        "Return the exact stored DYLLU operation proposal, content hash, status, and expiry.",
      inputSchema: z.object({ proposal_id: proposalIdSchema }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ proposal_id: proposalId }) =>
      execute("get_operation_proposal", () =>
        application.getOperationProposal(getContext(), proposalId)
      )
  );

  server.registerTool(
    "publish_sale_change",
    {
      title: "Publish a DYLLU sale change",
      description:
        "Publish an exact stored DYLLU sale proposal after the manager explicitly confirms it. Copy its content_hash into confirmed_content_hash.",
      inputSchema: z
        .object({
          proposal_id: proposalIdSchema,
          confirmed_content_hash: contentHashSchema,
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({
      proposal_id: proposalId,
      confirmed_content_hash: confirmedContentHash,
    }) =>
      execute("publish_sale_change", async () => {
        const revision = await application.publishSaleChange(getContext(), {
          proposalId,
          confirmation: {
            action: "accept",
            proposalId,
            contentHash: confirmedContentHash,
            confirmedAt: new Date(),
          },
        });
        return { published: true, revision };
      })
  );

  server.registerTool(
    "list_returns",
    {
      title: "List DYLLU returns",
      description: "List bounded DYLLU product returns, newest first.",
      inputSchema: z
        .object({
          status: returnStatusSchema.optional(),
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_returns", () =>
        application.listReturns(getContext(), {
          ...(input.status ? { status: input.status } : {}),
          limit: input.limit,
          offset: input.offset,
        })
      )
  );

  server.registerTool(
    "get_return",
    {
      title: "Get a DYLLU return",
      description:
        "Return one DYLLU return with its order, status, quantities, reason IDs, and dates.",
      inputSchema: z.object({ return_id: returnIdSchema }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ return_id: returnId }) =>
      execute("get_return", () => application.getReturn(getContext(), returnId))
  );

  server.registerTool(
    "propose_return_request",
    {
      title: "Propose a DYLLU return request",
      description:
        "Store an exact proposal to create a DYLLU return request for selected order items. This does not issue a refund, receive stock, or publish anything.",
      inputSchema: z
        .object({
          order_reference: orderReferenceSchema,
          items: z
            .array(
              z
                .object({
                  item_id: z.string().trim().min(1).max(100),
                  quantity: z.number().int().min(1).max(1_000_000),
                  reason_id: z.string().trim().min(1).max(100).nullable(),
                  note: z.string().trim().max(500).nullable(),
                })
                .strict()
            )
            .min(1)
            .max(20),
          note: z.string().trim().max(500).nullable(),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_return_request", () =>
        application.proposeReturnRequest(getContext(), {
          orderReference: input.order_reference,
          items: input.items.map((item) => ({
            itemId: item.item_id,
            quantity: item.quantity,
            reasonId: item.reason_id,
            note: item.note,
          })),
          note: input.note,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "propose_return_cancel",
    {
      title: "Propose a DYLLU return cancellation",
      description:
        "Store an exact proposal to cancel one unreceived DYLLU return request. This does not publish anything.",
      inputSchema: z
        .object({
          return_id: returnIdSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({ return_id: returnId, reason }) =>
      execute("propose_return_cancel", () =>
        application.proposeReturnCancel(getContext(), { returnId, reason })
      )
  );

  server.registerTool(
    "list_return_history",
    {
      title: "List DYLLU return history",
      description: "Return immutable DYLLU return revisions for audit.",
      inputSchema: z
        .object({
          return_id: returnIdSchema,
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ return_id: returnId, limit }) =>
      execute("list_return_history", () =>
        application.listReturnHistory(getContext(), returnId, limit)
      )
  );

  server.registerTool(
    "publish_return_change",
    {
      title: "Publish a DYLLU return change",
      description:
        "Publish an exact stored DYLLU return proposal after the manager explicitly confirms it.",
      inputSchema: z
        .object({
          proposal_id: proposalIdSchema,
          confirmed_content_hash: contentHashSchema,
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({
      proposal_id: proposalId,
      confirmed_content_hash: confirmedContentHash,
    }) =>
      execute("publish_return_change", async () => {
        const revision = await application.publishReturnChange(getContext(), {
          proposalId,
          confirmation: {
            action: "accept",
            proposalId,
            contentHash: confirmedContentHash,
            confirmedAt: new Date(),
          },
        });
        return { published: true, revision };
      })
  );

  server.registerTool(
    "list_orders",
    {
      title: "List DYLLU orders",
      description:
        "List DYLLU orders created on one calendar date in Europe/Chisinau, newest first.",
      inputSchema: z
        .object({
          date: calendarDateSchema,
          status: orderStatusSchema.optional(),
          limit: z.number().int().min(1).max(50).default(20),
          offset: z.number().int().min(0).max(10_000).default(0),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_orders", () =>
        application.listOrders(getContext(), {
          localDate: input.date,
          timeZone: "Europe/Chisinau",
          ...(input.status ? { status: input.status } : {}),
          limit: input.limit,
          offset: input.offset,
        })
      )
  );

  server.registerTool(
    "get_order",
    {
      title: "Get a DYLLU order",
      description:
        "Return complete DYLLU order information by internal order ID or visible order number.",
      inputSchema: z.object({ order_reference: orderReferenceSchema }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ order_reference: orderReference }) =>
      execute("get_order", () =>
        application.getOrder(getContext(), orderReference)
      )
  );

  server.registerTool(
    "get_daily_order_report",
    {
      title: "Get a daily DYLLU order report",
      description:
        "Return exact order totals, status groups, and clear exceptions for one calendar date in Europe/Chisinau. Paid orders without fulfillment are exceptions only after the selected age.",
      inputSchema: z
        .object({
          date: calendarDateSchema,
          stale_after_minutes: z.number().int().min(0).max(10_080).default(120),
          exception_limit: z.number().int().min(1).max(100).default(50),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("get_daily_order_report", () =>
        application.getDailyOrderReport(getContext(), {
          localDate: input.date,
          timeZone: "Europe/Chisinau",
          staleAfterMinutes: input.stale_after_minutes,
          exceptionLimit: input.exception_limit,
        })
      )
  );

  server.registerTool(
    "get_product",
    {
      title: "Get a DYLLU product",
      description:
        "Return the current DYLLU title, status, description, variants and base prices.",
      inputSchema: z.object({ product_id: productIdSchema }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ product_id: productId }) =>
      execute("get_product", () =>
        application.getProduct(getContext(), productId)
      )
  );

  server.registerTool(
    "propose_product_price",
    {
      title: "Propose a DYLLU product price",
      description:
        "Store a reviewable MDL base-price proposal for one exact variant price. This does not publish anything.",
      inputSchema: z
        .object({
          product_id: productIdSchema,
          variant_id: z.string().trim().min(1).max(100),
          price_id: z.string().trim().min(1).max(100),
          currency_code: z.literal("mdl"),
          proposed_amount: z.number().int().min(1).max(100_000_000),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_product_price", () =>
        application.proposePrice(getContext(), {
          productId: input.product_id,
          variantId: input.variant_id,
          priceId: input.price_id,
          currencyCode: input.currency_code,
          proposedAmount: input.proposed_amount,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "propose_product_price_batch",
    {
      title: "Propose DYLLU product prices in a batch",
      description:
        "Atomically store 1 to 100 independent MDL base-price proposals in one call. This does not publish anything. Each approved proposal must use publish_product_price with its exact content hash. Use this to correct many stale base prices at once before creating a DYLLU sale for those variants with propose_sale_create.",
      inputSchema: z
        .object({
          items: z
            .array(
              z
                .object({
                  product_id: productIdSchema,
                  variant_id: z.string().trim().min(1).max(100),
                  price_id: z.string().trim().min(1).max(100),
                  currency_code: z.literal("mdl"),
                  proposed_amount: z.number().int().min(1).max(100_000_000),
                })
                .strict()
            )
            .min(1)
            .max(100),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_product_price_batch", () =>
        application.proposePriceBatch(getContext(), {
          items: input.items.map((item) => ({
            productId: item.product_id,
            variantId: item.variant_id,
            priceId: item.price_id,
            currencyCode: item.currency_code,
            proposedAmount: item.proposed_amount,
          })),
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "propose_product_description",
    {
      title: "Propose a DYLLU product description",
      description:
        "Store a reviewable before/after proposal. This does not publish anything.",
      inputSchema: z
        .object({
          product_id: productIdSchema,
          proposed_description: z.string().min(1).max(20_000),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_product_description", () =>
        application.proposeDescription(getContext(), {
          productId: input.product_id,
          proposedDescription: input.proposed_description,
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "propose_product_description_batch",
    {
      title: "Propose DYLLU product descriptions in a batch",
      description:
        "Atomically store 1 to 20 independent description proposals. This does not publish anything. Each approved proposal must use publish_product_description with its exact content hash.",
      inputSchema: z
        .object({
          items: z
            .array(
              z
                .object({
                  product_id: productIdSchema,
                  proposed_description: z.string().min(1).max(20_000),
                })
                .strict()
            )
            .min(1)
            .max(20),
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("propose_product_description_batch", () =>
        application.proposeDescriptionBatch(getContext(), {
          items: input.items.map((item) => ({
            productId: item.product_id,
            proposedDescription: item.proposed_description,
          })),
          reason: input.reason,
        })
      )
  );

  server.registerTool(
    "get_change_proposal",
    {
      title: "Review a DYLLU product change proposal",
      description:
        "Return the exact stored proposal, content hash, status and expiry.",
      inputSchema: z.object({ proposal_id: proposalIdSchema }).strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ proposal_id: proposalId }) =>
      execute("get_change_proposal", () =>
        application.getProposal(getContext(), proposalId)
      )
  );

  server.registerTool(
    "publish_product_description",
    {
      title: "Publish a DYLLU product description",
      description:
        "Publish an exact stored proposal after the manager explicitly confirms it. Copy its content_hash into confirmed_content_hash.",
      inputSchema: z
        .object({
          proposal_id: proposalIdSchema,
          confirmed_content_hash: contentHashSchema,
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({
      proposal_id: proposalId,
      confirmed_content_hash: confirmedContentHash,
    }) =>
      execute("publish_product_description", async () => {
        const context = getContext();
        const revision = await application.publishDescription(context, {
          proposalId,
          confirmation: {
            action: "accept",
            proposalId,
            contentHash: confirmedContentHash,
            confirmedAt: new Date(),
          },
        });
        return {
          published: true,
          revision,
        };
      })
  );

  server.registerTool(
    "publish_product_price",
    {
      title: "Publish a DYLLU product price",
      description:
        "Publish an exact stored MDL price proposal after the manager explicitly confirms it. Copy its content_hash into confirmed_content_hash.",
      inputSchema: z
        .object({
          proposal_id: proposalIdSchema,
          confirmed_content_hash: contentHashSchema,
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({
      proposal_id: proposalId,
      confirmed_content_hash: confirmedContentHash,
    }) =>
      execute("publish_product_price", async () => {
        const context = getContext();
        const revision = await application.publishPrice(context, {
          proposalId,
          confirmation: {
            action: "accept",
            proposalId,
            contentHash: confirmedContentHash,
            confirmedAt: new Date(),
          },
        });
        return {
          published: true,
          revision,
        };
      })
  );

  server.registerTool(
    "list_product_history",
    {
      title: "List DYLLU product change history",
      description:
        "Return immutable description and price revisions for audit and rollback.",
      inputSchema: z
        .object({
          product_id: productIdSchema,
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    ({ product_id: productId, limit }) =>
      execute("list_product_history", () =>
        application.listProductHistory(getContext(), productId, limit)
      )
  );

  server.registerTool(
    "list_audit_events",
    {
      title: "List DYLLU MCP audit events",
      description:
        "Return immutable proposal, authorization and capability audit events.",
      inputSchema: z
        .object({
          actor_id: z.string().trim().min(1).max(100).optional(),
          target_id: z.string().trim().min(1).max(100).optional(),
          limit: z.number().int().min(1).max(100).default(50),
        })
        .strict(),
      annotations: readOnlyAnnotations,
      _meta: oauthToolMeta,
    },
    (input) =>
      execute("list_audit_events", () =>
        application.listAuditEvents(getContext(), {
          actorId: input.actor_id,
          targetId: input.target_id,
          limit: input.limit,
        })
      )
  );

  server.registerTool(
    "propose_product_description_rollback",
    {
      title: "Propose a description rollback",
      description:
        "Create a reviewable proposal restoring a historical description.",
      inputSchema: z
        .object({
          revision_id: revisionIdSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({ revision_id: revisionId, reason }) =>
      execute("propose_product_description_rollback", () =>
        application.proposeRollback(getContext(), {
          revisionId,
          reason,
        })
      )
  );

  server.registerTool(
    "propose_product_price_rollback",
    {
      title: "Propose a price rollback",
      description:
        "Create a reviewable proposal restoring one historical MDL variant price.",
      inputSchema: z
        .object({
          revision_id: revisionIdSchema,
          reason: z.string().trim().min(3).max(500),
        })
        .strict(),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
      _meta: oauthToolMeta,
    },
    ({ revision_id: revisionId, reason }) =>
      execute("propose_product_price_rollback", () =>
        application.proposePriceRollback(getContext(), {
          revisionId,
          reason,
        })
      )
  );

  return server;
}

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

async function executeTool<T>(
  operation: () => Promise<T>,
  onUnexpectedError: (error: unknown) => void
): Promise<CallToolResult> {
  try {
    const result = await operation();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    if (!(error instanceof ApplicationError)) {
      onUnexpectedError(error);
    }
    const mapped =
      error instanceof ApplicationError
        ? { code: error.code, message: error.message }
        : {
            code: "internal_error",
            message: "The DYLLU MCP operation failed",
          };
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(mapped),
        },
      ],
      isError: true,
    };
  }
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      error_name: "NonErrorThrown",
      error_message: String(error),
    };
  }
  return {
    error_name: error.name,
    error_message: error.message,
    error_stack: error.stack,
  };
}
