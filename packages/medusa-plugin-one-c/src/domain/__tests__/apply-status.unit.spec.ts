import {
  dedupeLatestAppliedChanges,
  deriveItemApplyStatus,
} from "../apply-status";

describe("deriveItemApplyStatus", () => {
  it("reports not_applied when there are no records", () => {
    expect(deriveItemApplyStatus([])).toBe("not_applied");
  });

  it("reports applied when every field applied cleanly", () => {
    expect(
      deriveItemApplyStatus([
        { field: "regular_price_mdl", status: "applied" },
        { field: "balance", status: "applied" },
      ])
    ).toBe("applied");
  });

  it("reports flagged when any field was flagged", () => {
    expect(
      deriveItemApplyStatus([
        { field: "regular_price_mdl", status: "applied" },
        { field: "balance", status: "flagged" },
      ])
    ).toBe("flagged");
  });

  it("reports failed when any field failed, even if others applied", () => {
    expect(
      deriveItemApplyStatus([
        { field: "regular_price_mdl", status: "applied" },
        { field: "balance", status: "failed" },
        { field: "sale_price_mdl", status: "flagged" },
      ])
    ).toBe("failed");
  });
});

describe("dedupeLatestAppliedChanges", () => {
  it("dedupes to the newest row per syncItemId+field key when given rows already ordered newest-first", () => {
    const result = dedupeLatestAppliedChanges([
      { syncItemId: "onecitem_1", field: "regular_price_mdl", status: "flagged" },
      { syncItemId: "onecitem_1", field: "regular_price_mdl", status: "applied" },
    ]);

    expect(result).toEqual([
      { syncItemId: "onecitem_1", field: "regular_price_mdl", status: "flagged" },
    ]);
  });

  it("returns all rows unchanged when there are no duplicate keys", () => {
    const rows: Array<{
      syncItemId: string;
      field: string;
      status: "applied" | "flagged" | "failed";
    }> = [
      { syncItemId: "onecitem_1", field: "regular_price_mdl", status: "applied" },
      { syncItemId: "onecitem_1", field: "balance", status: "flagged" },
      { syncItemId: "onecitem_2", field: "regular_price_mdl", status: "failed" },
    ];

    expect(dedupeLatestAppliedChanges(rows)).toEqual(rows);
  });
});
