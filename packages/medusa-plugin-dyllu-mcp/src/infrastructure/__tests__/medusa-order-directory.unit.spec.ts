import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaOrderDirectory } from "../medusa-directory";

describe("MedusaOrderDirectory", () => {
  it("lists orders inside one Europe/Chisinau calendar date", async () => {
    const graph = jest.fn();
    const list = jest.fn().mockResolvedValue({
      rows: [
        {
          id: "order_42",
          display_id: 42,
          status: "pending",
          payment_status: "not_paid",
          fulfillment_status: "not_fulfilled",
          email: "client@example.com",
          customer_id: "cus_client",
          currency_code: "mdl",
          total: { numeric: 429 },
          items: [{ id: "item_1" }],
          created_at: "2026-08-02T08:30:00.000Z",
          updated_at: "2026-08-02T08:30:00.000Z",
        },
      ],
      metadata: { count: 1, take: 20, skip: 0 },
    });
    const directory = new MedusaOrderDirectory(
      { graph } as Pick<RemoteQueryFunction, "graph">,
      { list, retrieve: jest.fn() }
    );

    await expect(
      directory.list({
        localDate: "2026-08-02",
        timeZone: "Europe/Chisinau",
        status: "pending",
        limit: 20,
        offset: 0,
      })
    ).resolves.toEqual({
      orders: [
        {
          id: "order_42",
          displayId: 42,
          status: "pending",
          paymentStatus: "not_paid",
          fulfillmentStatus: "not_fulfilled",
          email: "client@example.com",
          customerId: "cus_client",
          currencyCode: "mdl",
          total: 429,
          itemCount: 1,
          createdAt: new Date("2026-08-02T08:30:00.000Z"),
          updatedAt: new Date("2026-08-02T08:30:00.000Z"),
        },
      ],
      count: 1,
    });
    expect(list).toHaveBeenCalledWith({
      fields: expect.arrayContaining(["id", "payment_status"]),
      variables: {
        filters: {
          created_at: {
            $gte: new Date("2026-08-01T21:00:00.000Z"),
            $lt: new Date("2026-08-02T21:00:00.000Z"),
          },
          status: "pending",
          is_draft_order: false,
        },
        take: 20,
        skip: 0,
        order: { created_at: "DESC" },
      },
    });
    expect(graph).not.toHaveBeenCalled();
  });

  it("returns complete order details by visible order number", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ id: "order_42" }],
    });
    const retrieve = jest.fn().mockResolvedValue({
      id: "order_42",
      display_id: 42,
      status: "pending",
      payment_status: "not_paid",
      fulfillment_status: "not_fulfilled",
      email: "client@example.com",
      customer_id: "cus_client",
      currency_code: "mdl",
      total: { numeric: 429 },
      subtotal: { numeric: 429 },
      discount_total: { numeric: 0 },
      shipping_total: { numeric: 0 },
      tax_total: { numeric: 0 },
      canceled_at: null,
      items: [
        {
          id: "item_1",
          title: "Trusă de scule",
          variant_id: "variant_tools",
          variant_sku: "TOOLS-1",
          quantity: { numeric: 1 },
          unit_price: { numeric: 429 },
          total: { numeric: 429 },
        },
      ],
      shipping_address: {
        first_name: "Ana",
        last_name: "Client",
        phone: "+37360000000",
        company: null,
        address_1: "str. Test 1",
        address_2: null,
        city: "Chișinău",
        province: null,
        postal_code: "MD-2001",
        country_code: "md",
      },
      billing_address: null,
      shipping_methods: [],
      created_at: "2026-08-02T08:30:00.000Z",
      updated_at: "2026-08-02T08:30:00.000Z",
    });
    const directory = new MedusaOrderDirectory(
      { graph } as Pick<RemoteQueryFunction, "graph">,
      { list: jest.fn(), retrieve }
    );

    await expect(directory.findByReference("42")).resolves.toMatchObject({
      id: "order_42",
      displayId: 42,
      itemCount: 1,
      subtotal: 429,
      shippingAddress: {
        firstName: "Ana",
        lastName: "Client",
        city: "Chișinău",
      },
      items: [
        {
          id: "item_1",
          title: "Trusă de scule",
          variantId: "variant_tools",
          sku: "TOOLS-1",
          quantity: 1,
          unitPrice: 429,
          total: 429,
        },
      ],
    });
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "order",
        fields: ["id"],
        filters: { display_id: 42 },
        pagination: { take: 1, skip: 0 },
      })
    );
    expect(retrieve).toHaveBeenCalledWith({
      order_id: "order_42",
      fields: expect.arrayContaining(["id", "items.total"]),
    });
  });

  it("rejects invalid calendar dates before querying orders", async () => {
    const list = jest.fn();
    const directory = new MedusaOrderDirectory(
      { graph: jest.fn() } as Pick<RemoteQueryFunction, "graph">,
      { list, retrieve: jest.fn() }
    );

    await expect(
      directory.list({
        localDate: "2026-02-30",
        timeZone: "Europe/Chisinau",
        limit: 20,
        offset: 0,
      })
    ).rejects.toMatchObject({ code: "invalid_order_date" });
    expect(list).not.toHaveBeenCalled();
  });

  it("rejects unsafe visible order numbers before querying", async () => {
    const graph = jest.fn();
    const directory = new MedusaOrderDirectory(
      { graph } as Pick<RemoteQueryFunction, "graph">,
      { list: jest.fn(), retrieve: jest.fn() }
    );

    await expect(
      directory.findByReference("99999999999999999999")
    ).resolves.toBeNull();
    expect(graph).not.toHaveBeenCalled();
  });
});
