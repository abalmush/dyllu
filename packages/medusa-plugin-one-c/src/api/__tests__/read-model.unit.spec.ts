import OneCSyncModuleService from "../../modules/one-c-sync/service";
import { listItems, listSaleItems } from "../read-model";

describe("1C read model", () => {
  it("filters a confirmed comparison by exact Medusa SKU", async () => {
    const service = {
      listAndCountOneCSyncItems: jest.fn().mockResolvedValue([[], 0]),
    } as unknown as OneCSyncModuleService;

    await listItems(service, {
      runId: "onecrun_test",
      mappingStatus: "matched",
      sku: "DTPB1952",
      limit: 1,
      offset: 0,
    });

    expect(service.listAndCountOneCSyncItems).toHaveBeenCalledWith(
      {
        run_id: "onecrun_test",
        mapping_status: "matched",
        sku: "DTPB1952",
      },
      {
        take: 1,
        skip: 0,
        order: { sku: "ASC" },
      }
    );
  });

  it("keeps only items with a stored 1C sale price", async () => {
    const onSale = {
      id: "onecitem_sale",
      run_id: "onecrun_test",
      external_id: "ext-sale",
      sku: "DTPB0001",
      name: "On sale product",
      mapping_status: "matched",
      preparation_status: "unreviewed",
      medusa_product_id: "prod_1",
      medusa_variant_id: "variant_1",
      medusa_product_title: "On sale product",
      normalized: {
        regularPriceMdl: 1000,
        salePriceMdl: 800,
        saleStartsAt: "2026-08-01T00:00:00.000Z",
        saleEndsAt: "2026-08-31T00:00:00.000Z",
      },
      differences: [],
      hidden: false,
      deleted: false,
      created_at: new Date("2026-01-01T00:00:00Z"),
    };
    const notOnSale = {
      ...onSale,
      id: "onecitem_no_sale",
      sku: "DTPB0002",
      normalized: { regularPriceMdl: 1000 },
    };
    const service = {
      listAndCountOneCSyncItems: jest
        .fn()
        .mockResolvedValue([[onSale, notOnSale], 2]),
    } as unknown as OneCSyncModuleService;

    const result = await listSaleItems(service, {
      runId: "onecrun_test",
      limit: 20,
      offset: 0,
    });

    expect(service.listAndCountOneCSyncItems).toHaveBeenCalledWith(
      { run_id: "onecrun_test" },
      { take: 10_000, order: { sku: "ASC" } }
    );
    expect(result.count).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.sku).toBe("DTPB0001");
    expect(result.items[0]?.sale_price_mdl).toBe(800);
  });

  it("paginates the filtered sale items in memory", async () => {
    const items = Array.from({ length: 3 }, (_, index) => ({
      id: `onecitem_${index}`,
      run_id: "onecrun_test",
      external_id: `ext-${index}`,
      sku: `DTPB000${index}`,
      name: "On sale product",
      mapping_status: "matched",
      preparation_status: "unreviewed",
      medusa_product_id: "prod_1",
      medusa_variant_id: "variant_1",
      medusa_product_title: "On sale product",
      normalized: { regularPriceMdl: 1000, salePriceMdl: 900 - index },
      differences: [],
      hidden: false,
      deleted: false,
      created_at: new Date("2026-01-01T00:00:00Z"),
    }));
    const service = {
      listAndCountOneCSyncItems: jest.fn().mockResolvedValue([items, 3]),
    } as unknown as OneCSyncModuleService;

    const result = await listSaleItems(service, {
      runId: "onecrun_test",
      limit: 1,
      offset: 1,
    });

    expect(result.count).toBe(3);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.sku).toBe("DTPB0001");
  });
});
