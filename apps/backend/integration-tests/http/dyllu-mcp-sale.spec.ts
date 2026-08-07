import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import {
  ContainerRegistrationKeys,
  generateEntityId,
} from "@medusajs/framework/utils";
import { Query } from "@medusajs/framework/types";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

import { MedusaSaleDirectory } from "@dyllu/medusa-plugin-mcp/infrastructure/medusa-directory";
import { MedusaOperationGovernanceStore } from "@dyllu/medusa-plugin-mcp/infrastructure/medusa-governance-store";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "@dyllu/medusa-plugin-mcp/modules/governance";
import { createOperationHash } from "@dyllu/medusa-plugin-mcp/domain/operation-hash";

jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  dbName: "dyllu-mcp-sale-integration",
  cwd: process.cwd(),
  testSuite: ({ getContainer }) => {
    describe("DYLLU MCP sale variant targets", () => {
      it("finds the normal MDL price for a real variant", async () => {
        const container = getContainer();
        const { result: products } = await createProductsWorkflow(
          container
        ).run({
          input: {
            products: [
              {
                title: "MCP sale integration product",
                handle: "mcp-sale-integration-product",
                status: "published",
                options: [{ title: "Variant", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "MCP-SALE-INTEGRATION",
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
        const variantId = product.variants![0]!.id;

        const query = container.resolve<Query>(
          ContainerRegistrationKeys.QUERY
        );
        const sales = new MedusaSaleDirectory(query);

        const targets = await sales.findVariantTargets([variantId], "mdl");

        expect(targets).toHaveLength(1);
        expect(targets[0]).toMatchObject({
          variantId,
          sku: "MCP-SALE-INTEGRATION",
          normalAmount: 429,
          currencyCode: "mdl",
        });
      });

      it("finds no overlap when there are no active sales", async () => {
        const container = getContainer();
        const { result: products } = await createProductsWorkflow(
          container
        ).run({
          input: {
            products: [
              {
                title: "MCP sale overlap product",
                handle: "mcp-sale-overlap-product",
                status: "published",
                options: [{ title: "Variant", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "MCP-SALE-OVERLAP",
                    manage_inventory: false,
                    options: { Variant: "Standard" },
                    prices: [{ currency_code: "mdl", amount: 199 }],
                  },
                ],
              },
            ],
          },
        });
        const product = products[0]!;
        const variantId = product.variants![0]!.id;

        const query = container.resolve<Query>(
          ContainerRegistrationKeys.QUERY
        );
        const sales = new MedusaSaleDirectory(query);

        const overlaps = await sales.findOverlappingActiveSales({
          variantIds: [variantId],
          startsAt: null,
          endsAt: null,
        });

        expect(overlaps).toEqual([]);
      });

      it("writes a sale_create proposal exactly as proposeSaleCreate builds it", async () => {
        const container = getContainer();
        const { result: products } = await createProductsWorkflow(
          container
        ).run({
          input: {
            products: [
              {
                title: "MCP sale write product",
                handle: "mcp-sale-write-product",
                status: "published",
                options: [{ title: "Variant", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "MCP-SALE-WRITE",
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
        const variantId = product.variants![0]!.id;

        const query = container.resolve<Query>(
          ContainerRegistrationKeys.QUERY
        );
        const sales = new MedusaSaleDirectory(query);
        const targets = await sales.findVariantTargets([variantId], "mdl");
        const target = targets[0]!;

        const items = [
          {
            productId: target.productId,
            productTitle: target.productTitle,
            variantId: target.variantId,
            variantTitle: target.variantTitle,
            sku: target.sku,
            basePriceId: target.basePriceId,
            salePriceId: null,
            normalAmount: target.normalAmount,
            saleAmount: 299,
            currencyCode: target.currencyCode,
            targetUpdatedAt: target.updatedAt.toISOString(),
          },
        ];
        const createdAt = new Date();
        const id = generateEntityId(undefined, "operationProposal");
        const targetKey = `sale:new:${id}`;
        const proposedValue = {
          saleId: null,
          title: "Write-path integration test sale",
          description: "",
          status: "draft" as const,
          startsAt: null,
          endsAt: null,
          items,
        };
        const proposal = {
          id,
          kind: "sale_create" as const,
          status: "pending" as const,
          actorId: "user_integration_sale",
          targetType: "sale" as const,
          targetId: null,
          targetKey,
          beforeValue: {},
          proposedValue,
          targetVersion: null,
          contentHash: createOperationHash({
            kind: "sale_create",
            targetType: "sale",
            targetId: null,
            targetKey,
            targetVersion: null,
            beforeValue: {},
            proposedValue,
          }),
          reason: "Integration test sale proposal",
          sourceRevisionId: null,
          createdAt,
          expiresAt: new Date(createdAt.getTime() + 30 * 60 * 1000),
        };

        const governance = new MedusaOperationGovernanceStore(
          container.resolve(DYLLU_MCP_GOVERNANCE_MODULE)
        );

        await governance.createProposal({
          proposal,
          requestId: "request_integration_sale",
        });

        await expect(governance.findProposal(id)).resolves.toMatchObject({
          id,
          kind: "sale_create",
          status: "pending",
        });
      });
    });
  },
});
