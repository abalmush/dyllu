import OneCSyncModuleService from "../../modules/one-c-sync/service";
import { listItems } from "../read-model";

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
});
