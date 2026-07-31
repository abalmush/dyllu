import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "@medusajs/framework/zod";

import { ApplicationError } from "../application/errors";
import { ProductChangeApplication } from "../application/product-change-application";
import { RequestContext } from "../domain/types";

const productIdSchema = z.string().trim().min(1).max(100);
const proposalIdSchema = z.string().trim().min(1).max(100);
const revisionIdSchema = z.string().trim().min(1).max(100);
const contentHashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

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
        "Use search_products and get_product before proposing a change.",
        "Proposal tools never mutate public catalog data.",
        "Show the complete before/after proposal to the manager.",
        "Call publish_product_description only after the manager asks to publish.",
        "Call publish_product_price only after the manager asks to publish the exact price proposal.",
        "Only call a publish tool after the manager explicitly confirms the exact proposal.",
        "Pass the exact stored content_hash as confirmed_content_hash when publishing.",
        "Rollback creates a new proposal and never removes audit history.",
        "Never invent product facts, prices, specifications or warranty terms.",
        "Preserve verified facts unless the manager provides a verified replacement.",
        "Ask the manager when required product information is uncertain.",
      ].join(" "),
    }
  );

  server.registerTool(
    "get_my_access",
    {
      title: "Get my DYLLU access",
      description:
        "Return the authenticated Medusa manager and exact MCP capabilities.",
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
        "Search a bounded Medusa product projection before proposing changes.",
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
    "get_product",
    {
      title: "Get a DYLLU product",
      description:
        "Return the current Medusa title, status, description, variants and base prices.",
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
      title: "Propose a product price",
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
    "propose_product_description",
    {
      title: "Propose a product description",
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
    "get_change_proposal",
    {
      title: "Review a product change proposal",
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
      title: "Publish a product description",
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
      title: "Publish a product price",
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
      title: "List product change history",
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
