import { Query } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createOrderWorkflow,
  createRegionsWorkflow,
  getOrderDetailWorkflow,
  getOrdersListWorkflow,
} from "@medusajs/medusa/core-flows";
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";

import { MedusaOrderDirectory } from "@dyllu/medusa-plugin-mcp/infrastructure/medusa-directory";
import { DYLLU_MCP_GOVERNANCE_MODULE } from "@dyllu/medusa-plugin-mcp/modules/governance";

jest.setTimeout(120_000);

medusaIntegrationTestRunner({
  dbName: "dyllu-mcp-orders-integration-v2",
  cwd: process.cwd(),
  testSuite: ({ getContainer }) => {
    describe("DYLLU MCP order reading", () => {
      it("lists and retrieves a real order for its DYLLU calendar date", async () => {
        const container = getContainer();
        const { result: regions } = await createRegionsWorkflow(container).run({
          input: {
            regions: [
              {
                name: "Moldova integration",
                currency_code: "mdl",
                countries: ["md"],
              },
            ],
          },
        });
        const { result: created } = await createOrderWorkflow(container).run({
          input: {
            region_id: regions[0]!.id,
            status: "pending",
            email: "orders-integration@dyllu.md",
            currency_code: "mdl",
            shipping_address: {
              first_name: "Ana",
              last_name: "Client",
              phone: "+37360000000",
              address_1: "str. Test 1",
              city: "Chișinău",
              country_code: "md",
            },
            items: [
              {
                title: "Trusă de scule",
                quantity: 1,
                unit_price: 429,
              },
            ],
          },
        });
        const directory = new MedusaOrderDirectory(
          container.resolve<Query>(ContainerRegistrationKeys.QUERY),
          {
            list: async (input) => {
              const { result } = await getOrdersListWorkflow(container).run({
                input,
              });
              return result;
            },
            retrieve: async (input) => {
              const { result } = await getOrderDetailWorkflow(container).run({
                input,
              });
              return result;
            },
          }
        );
        const localDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Europe/Chisinau",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());

        await expect(
          directory.list({
            localDate,
            timeZone: "Europe/Chisinau",
            limit: 20,
            offset: 0,
          })
        ).resolves.toMatchObject({
          count: 1,
          orders: [
            {
              id: created.id,
              displayId: created.display_id,
              email: "orders-integration@dyllu.md",
              total: 429,
              itemCount: 1,
            },
          ],
        });
        await expect(
          directory.findByReference(String(created.display_id))
        ).resolves.toMatchObject({
          id: created.id,
          displayId: created.display_id,
          total: 429,
          shippingAddress: {
            firstName: "Ana",
            lastName: "Client",
            city: "Chișinău",
          },
          items: [
            {
              title: "Trusă de scule",
              quantity: 1,
              unitPrice: 429,
              total: 429,
            },
          ],
        });
      });

      it("stores the order.read capability after migration", async () => {
        const governance = getContainer().resolve(DYLLU_MCP_GOVERNANCE_MODULE);
        await governance.replaceCapabilityGrants({
          actorId: "user_admin",
          userId: "user_orders",
          capabilities: ["order.read"],
          requestId: "request_orders_capability",
          occurredAt: new Date(),
        });

        await expect(
          governance.listDylluMcpCapabilityGrants(
            { user_id: "user_orders" },
            { take: 10 }
          )
        ).resolves.toEqual([
          expect.objectContaining({ capability: "order.read" }),
        ]);
      });
    });
  },
});
