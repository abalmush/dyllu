import { RemoteQueryFunction } from "@medusajs/framework/types";

import { MedusaMerchandisingDirectory } from "../medusa-merchandising-directory";

describe("MedusaMerchandisingDirectory", () => {
  it("lists product categories with exact count metadata", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "pcat_tools",
          name: "Scule de mână",
          handle: "scule-de-mana",
          parent_category_id: null,
          is_active: true,
          is_internal: false,
          rank: 1,
          updated_at: "2026-08-05T09:00:00.000Z",
        },
      ],
      metadata: { count: 1 },
    });
    const directory = new MedusaMerchandisingDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.listCategories({ limit: 20, offset: 0 })
    ).resolves.toEqual({
      categories: [
        {
          id: "pcat_tools",
          name: "Scule de mână",
          handle: "scule-de-mana",
          parentCategoryId: null,
          isActive: true,
          isInternal: false,
          rank: 1,
          updatedAt: new Date("2026-08-05T09:00:00.000Z"),
        },
      ],
      count: 1,
    });
    expect(graph).toHaveBeenCalledWith({
      entity: "product_category",
      fields: expect.arrayContaining(["id", "name", "updated_at"]),
      pagination: { take: 20, skip: 0, order: { rank: "ASC" } },
    });
  });

  it("returns exact assignment state for selected products", async () => {
    const graph = jest.fn().mockResolvedValue({
      data: [
        {
          id: "prod_drill",
          title: "Mașină de găurit",
          handle: "masina-de-gaurit",
          status: "published",
          updated_at: "2026-08-05T08:30:00.000Z",
          categories: [{ id: "pcat_tools" }],
        },
      ],
    });
    const directory = new MedusaMerchandisingDirectory({ graph } as Pick<
      RemoteQueryFunction,
      "graph"
    >);

    await expect(
      directory.findProductTargets(["prod_drill"], "pcat_tools")
    ).resolves.toEqual([
      {
        productId: "prod_drill",
        productTitle: "Mașină de găurit",
        productHandle: "masina-de-gaurit",
        productStatus: "published",
        productUpdatedAt: new Date("2026-08-05T08:30:00.000Z"),
        assigned: true,
      },
    ]);
    expect(graph).toHaveBeenCalledWith({
      entity: "product",
      fields: expect.arrayContaining(["categories.id"]),
      filters: { id: ["prod_drill"] },
      pagination: { take: 1, skip: 0, order: { id: "ASC" } },
    });
  });

  it("fails closed when category count metadata is missing", async () => {
    const directory = new MedusaMerchandisingDirectory({
      graph: jest.fn().mockResolvedValue({ data: [] }),
    } as Pick<RemoteQueryFunction, "graph">);

    await expect(
      directory.listCategories({ limit: 20, offset: 0 })
    ).rejects.toBeDefined();
  });
});
