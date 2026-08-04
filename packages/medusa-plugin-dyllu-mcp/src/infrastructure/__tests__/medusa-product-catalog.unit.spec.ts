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
});
