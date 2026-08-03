import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import orderPlacedHandler from "../order-placed";

describe("orderPlacedHandler", () => {
  const storefrontUrl = process.env.STOREFRONT_URL;

  afterEach(() => {
    jest.restoreAllMocks();
    if (storefrontUrl === undefined) {
      delete process.env.STOREFRONT_URL;
    } else {
      process.env.STOREFRONT_URL = storefrontUrl;
    }
  });

  it("loads the relations required for totals and sends the full confirmation", async () => {
    process.env.STOREFRONT_URL = "https://dyllu.md";
    const query = {
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "order_1",
            display_id: 9,
            email: "andrei@example.com",
            created_at: "2026-08-03T11:09:12.303Z",
            currency_code: "mdl",
            total: 1598,
            item_subtotal: 1598,
            shipping_subtotal: 0,
            tax_total: 0,
            shipping_address: { first_name: "Andrei" },
            items: [
              {
                product_title: "Acumulator Li-Ion, 20 V, 5 Ah",
                variant_title: "20.0V",
                quantity: 2,
                unit_price: 799,
                total: 1598,
              },
            ],
            shipping_methods: [{ name: "Municipiul Chișinău", total: 0 }],
            payment_collections: [
              { payments: [{ provider_id: "pp_system_default" }] },
            ],
          },
        ],
      }),
    };
    const notificationService = {
      createNotifications: jest.fn().mockResolvedValue(undefined),
    };
    const container = {
      resolve: jest.fn((key: unknown) => {
        if (key === ContainerRegistrationKeys.QUERY) return query;
        if (key === Modules.NOTIFICATION) return notificationService;
        throw new Error(`Unexpected dependency: ${String(key)}`);
      }),
    };

    await orderPlacedHandler({
      event: { data: { id: "order_1" } },
      container,
    } as never);

    expect(query.graph).toHaveBeenCalledWith({
      entity: "order",
      fields: expect.arrayContaining([
        "items.*",
        "items.tax_lines.*",
        "items.adjustments.*",
        "shipping_methods.*",
        "shipping_methods.tax_lines.*",
        "shipping_methods.adjustments.*",
      ]),
      filters: { id: "order_1" },
    });
    expect(notificationService.createNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "andrei@example.com",
        template: "order-placed",
        content: expect.objectContaining({
          subject: "Comanda DYLLU #9 a fost confirmată",
          html: expect.stringContaining("1.598,00"),
          text: expect.stringContaining("2 × 799,00"),
        }),
      })
    );
  });
});
