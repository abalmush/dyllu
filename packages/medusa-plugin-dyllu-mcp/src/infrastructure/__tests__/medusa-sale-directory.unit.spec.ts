import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaSaleDirectory } from "../medusa-directory";

describe("MedusaSaleDirectory", () => {
  it("lists only sale campaigns with bounded pagination", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "plist_summer",
          title: "Summer sale",
          description: "Selected tools",
          type: "sale",
          status: "active",
          starts_at: "2026-08-01T00:00:00.000Z",
          ends_at: "2026-08-31T23:59:59.000Z",
          created_at: "2026-07-30T10:00:00.000Z",
          updated_at: "2026-07-31T10:00:00.000Z",
        },
      ],
      metadata: { count: 1, take: 20, skip: 0 },
    });
    const directory = new MedusaSaleDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.list({ status: "active", limit: 20, offset: 0 })
    ).resolves.toEqual({
      sales: [
        {
          id: "plist_summer",
          title: "Summer sale",
          description: "Selected tools",
          status: "active",
          startsAt: new Date("2026-08-01T00:00:00.000Z"),
          endsAt: new Date("2026-08-31T23:59:59.000Z"),
          createdAt: new Date("2026-07-30T10:00:00.000Z"),
          updatedAt: new Date("2026-07-31T10:00:00.000Z"),
        },
      ],
      count: 1,
    });
    expect(graph).toHaveBeenCalledWith({
      entity: "price_list",
      fields: expect.arrayContaining(["id", "type", "status"]),
      filters: { type: "sale", status: "active" },
      pagination: {
        take: 20,
        skip: 0,
        order: { created_at: "DESC" },
      },
    });
  });

  it("rejects a non-sale result", async () => {
    const directory = new MedusaSaleDirectory({
      graph: jest.fn().mockResolvedValue({
        data: [
          {
            id: "plist_override",
            title: "Override",
            description: "",
            type: "override",
            status: "active",
            created_at: "2026-07-30T10:00:00.000Z",
            updated_at: "2026-07-30T10:00:00.000Z",
          },
        ],
        metadata: { count: 1 },
      }),
    } as Pick<RemoteQueryFunction, "graph">);

    await expect(
      directory.list({ limit: 20, offset: 0 })
    ).rejects.toBeDefined();
  });

  it("returns sale items with their normal prices", async () => {
    const graph = jest
      .fn()
      .mockResolvedValueOnce({
        data: [
          {
            id: "plist_summer",
            title: "Summer sale",
            description: "Selected tools",
            type: "sale",
            status: "active",
            starts_at: null,
            ends_at: null,
            created_at: "2026-07-30T10:00:00.000Z",
            updated_at: "2026-07-31T10:00:00.000Z",
            prices: [
              {
                id: "price_sale",
                amount: { numeric: 299 },
                currency_code: "MDL",
                min_quantity: null,
                max_quantity: null,
                price_rules: [],
                updated_at: "2026-07-31T10:00:00.000Z",
                price_set: { variant: { id: "variant_tools" } },
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "variant_tools",
            title: "Standard",
            sku: "DTHS1M28",
            product: {
              id: "prod_tools",
              title: "Trusă de scule de mână, 28 piese",
            },
            price_set: {
              prices: [
                {
                  id: "price_base",
                  amount: { numeric: 429 },
                  currency_code: "mdl",
                  min_quantity: null,
                  max_quantity: null,
                  price_list: null,
                  price_rules: [],
                },
              ],
            },
          },
        ],
      });
    const directory = new MedusaSaleDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(directory.findById("plist_summer")).resolves.toMatchObject({
      id: "plist_summer",
      items: [
        {
          priceId: "price_sale",
          productId: "prod_tools",
          variantId: "variant_tools",
          sku: "DTHS1M28",
          currencyCode: "mdl",
          normalAmount: 429,
          saleAmount: 299,
          minQuantity: null,
          maxQuantity: null,
          hasRules: false,
        },
      ],
    });
    expect(graph).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        entity: "price_list",
        filters: { id: "plist_summer", type: "sale" },
      })
    );
    expect(graph).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        entity: "variant",
        filters: { id: ["variant_tools"] },
      })
    );
  });

  it("checks overlaps only against active sale price lists", async () => {
    const graph = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "variant_tools", price_set: { id: "pset_tools" } }],
      })
      .mockResolvedValueOnce({
        data: [{ id: "plist_summer" }, { id: "plist_current" }],
        metadata: { count: 2 },
      })
      .mockResolvedValueOnce({
        data: [
          {
            price_set: { variant: { id: "variant_tools" } },
            price_list: {
              id: "plist_summer",
              type: "sale",
              status: "active",
              starts_at: null,
              ends_at: null,
            },
          },
        ],
        metadata: { count: 1 },
      });
    const directory = new MedusaSaleDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.findOverlappingActiveSales({
        variantIds: ["variant_tools"],
        startsAt: null,
        endsAt: null,
        excludeSaleId: "plist_current",
      })
    ).resolves.toEqual([
      { saleId: "plist_summer", variantId: "variant_tools" },
    ]);
    expect(graph).toHaveBeenNthCalledWith(2, {
      entity: "price_list",
      fields: ["id"],
      filters: { type: "sale", status: "active" },
      pagination: { take: 1_000, skip: 0 },
    });
    expect(graph).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        entity: "price",
        filters: {
          price_set_id: ["pset_tools"],
          price_list_id: ["plist_summer"],
          currency_code: "mdl",
        },
      })
    );
  });

  it("fails closed when the active sale list exceeds its safe limit", async () => {
    const graph = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ id: "variant_tools", price_set: { id: "pset_tools" } }],
      })
      .mockResolvedValueOnce({
        data: [],
        metadata: { count: 1_001 },
      });
    const directory = new MedusaSaleDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.findOverlappingActiveSales({
        variantIds: ["variant_tools"],
        startsAt: null,
        endsAt: null,
      })
    ).rejects.toMatchObject({ code: "sale_overlap_limit_exceeded" });
    expect(graph).toHaveBeenCalledTimes(2);
  });
});
