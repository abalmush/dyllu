import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaProductCatalog } from "../medusa-directory";

describe("MedusaProductCatalog", () => {
  it("returns the exact product count from query metadata", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [{ id: "prod_first" }],
      metadata: { count: 137, take: 1, skip: 0 },
    });
    const catalog = new MedusaProductCatalog({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(catalog.count()).resolves.toBe(137);
    expect(graph).toHaveBeenCalledWith({
      entity: "product",
      fields: ["id"],
      pagination: { take: 1, skip: 0 },
    });
  });

  it("rejects a product count result without count metadata", async () => {
    const catalog = new MedusaProductCatalog({
      graph: jest.fn().mockResolvedValue({ data: [] }),
    } as Pick<RemoteQueryFunction, "graph">);

    await expect(catalog.count()).rejects.toBeDefined();
  });

  it("returns only normal prices in the product base-price projection", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "prod_tools",
          title: "Trusă de scule",
          handle: "trusa-de-scule",
          status: "published",
          description: "Descriere",
          updated_at: "2026-08-05T08:00:00.000Z",
          variants: [
            {
              id: "variant_tools",
              title: "Standard",
              sku: "TOOLS-1",
              updated_at: "2026-08-05T08:00:00.000Z",
              price_set: {
                prices: [
                  {
                    id: "price_normal",
                    amount: 429,
                    currency_code: "mdl",
                    updated_at: "2026-08-05T08:00:00.000Z",
                    price_list: null,
                    rules: [],
                  },
                  {
                    id: "price_sale",
                    amount: 299,
                    currency_code: "mdl",
                    updated_at: "2026-08-05T08:00:00.000Z",
                    price_list: { id: "plist_sale" },
                    rules: [],
                  },
                ],
              },
            },
          ],
        },
      ],
    });
    const catalog = new MedusaProductCatalog({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(catalog.findById("prod_tools")).resolves.toMatchObject({
      variants: [
        {
          prices: [expect.objectContaining({ id: "price_normal", amount: 429 })],
        },
      ],
    });
    expect(graph).toHaveBeenCalledWith(
      expect.objectContaining({
        fields: expect.arrayContaining(["variants.price_set.prices.price_list.id"]),
      })
    );
  });

  it("lists a bounded product page with an exact count", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "prod_tools",
          title: "Trusă de scule",
          handle: "trusa-de-scule",
          status: "published",
          description: "Descriere",
          updated_at: "2026-08-05T08:00:00.000Z",
          variants: [],
        },
      ],
      metadata: { count: 137 },
    });
    const catalog = new MedusaProductCatalog({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(catalog.list({ limit: 100, offset: 0 })).resolves.toMatchObject({
      products: [{ id: "prod_tools" }],
      count: 137,
    });
    expect(graph).toHaveBeenCalledWith({
      entity: "product",
      fields: expect.any(Array),
      pagination: {
        take: 100,
        skip: 0,
        order: { id: "ASC" },
      },
    });
  });

  it("gets an exact bounded product set by ID", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "prod_tools",
          title: "Trusă de scule",
          handle: "trusa-de-scule",
          status: "published",
          description: "Descriere",
          images: [],
          updated_at: "2026-08-05T08:00:00.000Z",
          variants: [],
        },
      ],
    });
    const catalog = new MedusaProductCatalog({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(catalog.findByIds(["prod_tools"])).resolves.toMatchObject([
      { id: "prod_tools" },
    ]);
    expect(graph).toHaveBeenCalledWith({
      entity: "product",
      fields: expect.any(Array),
      filters: { id: ["prod_tools"] },
      pagination: { take: 1, skip: 0 },
    });
  });
});
