import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  ContainerRegistrationKeys,
  generateEntityId,
} from "@medusajs/framework/utils";
import { Query } from "@medusajs/framework/types";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { dylluMcpPublishProductPriceWorkflow } from "@dyllu/medusa-plugin-mcp/workflows";

import { createCatalogChangeHash } from "@dyllu/medusa-plugin-mcp/domain/catalog-change-hash";
import { MedusaProductCatalog } from "@dyllu/medusa-plugin-mcp/infrastructure/medusa-directory";
import { MedusaGovernanceStore } from "@dyllu/medusa-plugin-mcp/infrastructure/medusa-governance-store";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "@dyllu/medusa-plugin-mcp/modules/governance";

jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  dbName: "dyllu-mcp-price-integration",
  cwd: process.cwd(),
  testSuite: ({ getContainer }) => {
    describe("DYLLU MCP price publishing", () => {
      it("publishes one exact existing MDL variant price and records the revision", async () => {
        const container = getContainer();
        const { result: products } = await createProductsWorkflow(
          container
        ).run({
          input: {
            products: [
              {
                title: "MCP price integration product",
                handle: "mcp-price-integration-product",
                status: "published",
                options: [{ title: "Variant", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "MCP-PRICE-INTEGRATION",
                    manage_inventory: false,
                    options: { Variant: "Standard" },
                    prices: [{ currency_code: "mdl", amount: 429 }],
                  },
                ],
              },
            ],
          },
        });
        const product = products[0]!;
        const catalog = new MedusaProductCatalog(
          container.resolve<Query>(ContainerRegistrationKeys.QUERY)
        );
        const current = await catalog.findById(product.id);
        const variant = current!.variants[0]!;
        const price = variant.prices[0]!;
        const createdAt = new Date();
        const proposal = {
          id: generateEntityId(undefined, "mcpprop"),
          kind: "price_update" as const,
          status: "pending" as const,
          actorId: "user_integration",
          productId: current!.id,
          productTitle: current!.title,
          variantId: variant.id,
          priceId: price.id,
          currencyCode: "mdl",
          beforeValue: "429",
          proposedValue: "299",
          targetUpdatedAt: price.updatedAt,
          contentHash: createCatalogChangeHash({
            kind: "price_update",
            productId: current!.id,
            variantId: variant.id,
            priceId: price.id,
            currencyCode: "mdl",
            targetUpdatedAt: price.updatedAt,
            beforeValue: "429",
            proposedValue: "299",
          }),
          reason: "Integration test price correction",
          sourceRevisionId: null,
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        };
        const governanceService = container.resolve(
          DYLLU_MCP_GOVERNANCE_MODULE
        );
        const governance = new MedusaGovernanceStore(governanceService);
        await governance.createProposal({
          proposal,
          requestId: "request_integration",
        });

        const { result: revision } = await dylluMcpPublishProductPriceWorkflow(
          container
        ).run({
          input: {
            actor: {
              id: proposal.actorId,
              email: "integration@dyllu.md",
              name: "Integration Test",
            },
            proposalId: proposal.id,
            contentHash: proposal.contentHash,
            requestId: "request_integration",
            confirmedAt: new Date(),
          },
        });

        const updated = await catalog.findVariantPrice({
          productId: proposal.productId,
          variantId: proposal.variantId,
          priceId: proposal.priceId,
          currencyCode: proposal.currencyCode,
        });
        expect(updated?.amount).toBe(299);
        expect(revision).toMatchObject({
          proposalId: proposal.id,
          beforeValue: "429",
          afterValue: "299",
        });
        await expect(
          governance.findProposal(proposal.id)
        ).resolves.toMatchObject({
          status: "applied",
        });
      });
    });
  },
});
