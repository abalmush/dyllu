import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaReturnDirectory } from "../medusa-return-directory";

describe("MedusaReturnDirectory", () => {
  it("lists returns with exact count metadata", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [returnRow],
      metadata: { count: 1 },
    });
    const directory = new MedusaReturnDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.list({ status: "requested", limit: 20, offset: 0 })
    ).resolves.toMatchObject({
      count: 1,
      returns: [
        {
          id: "return_test",
          orderId: "order_test",
          status: "requested",
          items: [
            {
              itemId: "item_drill",
              quantity: 1,
              receivedQuantity: 0,
            },
          ],
        },
      ],
    });
    expect(graph).toHaveBeenCalledWith({
      entity: "return",
      fields: expect.arrayContaining(["id", "items.item_id"]),
      filters: { status: "requested" },
      pagination: {
        take: 20,
        skip: 0,
        order: { created_at: "DESC" },
      },
    });
  });

  it("returns an exact order target by visible order number", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "order_test",
          display_id: 42,
          status: "completed",
          fulfillment_status: "fulfilled",
          currency_code: "mdl",
          updated_at: "2026-08-05T12:00:00.000Z",
          items: [
            {
              id: "item_drill",
              title: "Mașină de găurit",
              variant_sku: "DRILL-1",
              quantity: 2,
            },
          ],
        },
      ],
    });
    const directory = new MedusaReturnDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(directory.findOrderTarget("42")).resolves.toMatchObject({
      id: "order_test",
      displayId: 42,
      items: [{ id: "item_drill", quantity: 2 }],
    });
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({ filters: { display_id: 42 } })
    );
  });

  it("fails closed when the order return history exceeds its limit", async () => {
    const directory = new MedusaReturnDirectory({
      graph: jest.fn().mockResolvedValue({
        data: [],
        metadata: { count: 1_001 },
      }),
    } as Pick<RemoteQueryFunction, "graph">);

    await expect(directory.listForOrder("order_test")).rejects.toMatchObject({
      code: "return_limit_exceeded",
    });
  });
});

const returnRow = {
  id: "return_test",
  display_id: 7,
  order_id: "order_test",
  status: "requested",
  location_id: null,
  refund_amount: null,
  created_by: "user_andrei",
  created_at: "2026-08-05T11:00:00.000Z",
  updated_at: "2026-08-05T11:00:00.000Z",
  requested_at: "2026-08-05T11:00:00.000Z",
  received_at: null,
  canceled_at: null,
  items: [
    {
      id: "return_item_test",
      item_id: "item_drill",
      quantity: 1,
      received_quantity: 0,
      reason_id: null,
    },
  ],
};
