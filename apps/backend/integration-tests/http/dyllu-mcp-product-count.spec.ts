import { Query } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

import { MedusaProductCatalog } from "@dyllu/medusa-plugin-mcp/infrastructure/medusa-directory";

jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  dbName: "dyllu-mcp-product-count-integration-v2",
  cwd: process.cwd(),
  testSuite: ({ getContainer }) => {
    describe("DYLLU MCP product count", () => {
      it("counts all products in the catalog", async () => {
        const container = getContainer();
        await createProductsWorkflow(container).run({
          input: {
            products: [
              {
                title: "Published product",
                handle: "published-product-count-test",
                status: "published",
                options: [{ title: "Variant", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "PRODUCT-COUNT-PUBLISHED",
                    manage_inventory: false,
                    options: { Variant: "Standard" },
                  },
                ],
              },
              {
                title: "Draft product",
                handle: "draft-product-count-test",
                status: "draft",
                options: [{ title: "Variant", values: ["Standard"] }],
                variants: [
                  {
                    title: "Standard",
                    sku: "PRODUCT-COUNT-DRAFT",
                    manage_inventory: false,
                    options: { Variant: "Standard" },
                  },
                ],
              },
            ],
          },
        });
        const catalog = new MedusaProductCatalog(
          container.resolve<Query>(ContainerRegistrationKeys.QUERY)
        );

        await expect(catalog.count()).resolves.toBe(2);
      });
    });
  },
});
