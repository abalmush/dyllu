import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaPromotionDirectory } from "../medusa-promotion-directory";

describe("MedusaPromotionDirectory", () => {
  it("lists promotions with exact count metadata", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "promo_august",
          code: "AUGUST10",
          type: "standard",
          status: "active",
          is_automatic: false,
          is_tax_inclusive: false,
          limit: 100,
          used: 4,
          campaign_id: null,
          created_at: "2026-08-01T09:00:00.000Z",
          updated_at: "2026-08-05T09:00:00.000Z",
        },
      ],
      metadata: { count: 1 },
    });
    const directory = new MedusaPromotionDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.list({ status: "active", limit: 20, offset: 0 })
    ).resolves.toEqual({
      promotions: [
        {
          id: "promo_august",
          code: "AUGUST10",
          type: "standard",
          status: "active",
          isAutomatic: false,
          isTaxInclusive: false,
          limit: 100,
          used: 4,
          campaignId: null,
          createdAt: new Date("2026-08-01T09:00:00.000Z"),
          updatedAt: new Date("2026-08-05T09:00:00.000Z"),
        },
      ],
      count: 1,
    });
    expect(graph).toHaveBeenCalledWith({
      entity: "promotion",
      fields: expect.arrayContaining(["id", "code", "status", "updated_at"]),
      filters: { status: "active" },
      pagination: {
        take: 20,
        skip: 0,
        order: { created_at: "DESC" },
      },
    });
  });

  it("fails closed when count metadata is missing", async () => {
    const directory = new MedusaPromotionDirectory({
      graph: jest.fn().mockResolvedValue({ data: [] }),
    } as Pick<RemoteQueryFunction, "graph">);

    await expect(
      directory.list({ limit: 20, offset: 0 })
    ).rejects.toBeDefined();
  });
});
