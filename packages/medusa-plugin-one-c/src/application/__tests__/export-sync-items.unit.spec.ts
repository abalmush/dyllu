import { createCsvExport, createJsonExport } from "../export-sync-items";

const item = {
  referenceId: "=CMD()",
  sku: "DTSS45M1",
  name: "Ciocan, mare",
  mappingStatus: "missing_medusa",
  preparationStatus: "unreviewed",
  regularPriceMdl: 100,
  salePriceMdl: 80,
  balance: 2,
  differences: { fields: [{ field: "price" }] },
  hidden: false,
  deleted: false,
};

describe("sync item exports", () => {
  it("creates UTF-8 CSV and neutralizes spreadsheet formulas", () => {
    const csv = createCsvExport({
      runId: "onecrun_1",
      exportedAt: "2026-08-05T10:00:00.000Z",
      items: [item],
    });

    expect(csv).toContain("\uFEFFrun_id,exported_at,reference_id");
    expect(csv).toContain("'\u003dCMD()");
    expect(csv).toContain('"Ciocan, mare"');
    expect(csv).toContain('"{""fields""');
  });

  it("creates a versioned JSON document with normalized types", () => {
    expect(
      JSON.parse(
        createJsonExport({
          runId: "onecrun_1",
          exportedAt: "2026-08-05T10:00:00.000Z",
          items: [item],
        })
      )
    ).toEqual({
      schema_version: "1.1",
      run_id: "onecrun_1",
      exported_at: "2026-08-05T10:00:00.000Z",
      items: [item],
    });
  });
});
