import { isBatteryTool } from "../battery-tool-collection";

describe("battery tool collection", () => {
  it("includes tools classified on a DYLLU battery platform", () => {
    expect(isBatteryTool({ metadata: { platform: "dyllu-20v" } })).toBe(true);
  });

  it("includes reviewed integrated and replaceable battery tools", () => {
    expect(
      isBatteryTool({
        variants: [
          { metadata: { power_source: "integrated_rechargeable_battery" } },
        ],
      })
    ).toBe(true);
    expect(
      isBatteryTool({
        variants: [{ metadata: { power_source: "replaceable_battery" } }],
      })
    ).toBe(true);
  });

  it("excludes battery and charger products", () => {
    expect(
      isBatteryTool({
        metadata: { platform: "dyllu-20v", accessory_kind: "battery" },
      })
    ).toBe(false);
  });

  it("excludes corded and unrelated battery mentions", () => {
    expect(isBatteryTool({ metadata: { platform: "corded" } })).toBe(false);
    expect(isBatteryTool({ metadata: { platform: "hand" } })).toBe(false);
  });
});
