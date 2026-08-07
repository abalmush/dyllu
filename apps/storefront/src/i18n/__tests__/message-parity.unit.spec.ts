import { describe, expect, it } from "vitest";
import ro from "../../../messages/ro.json";
import ru from "../../../messages/ru.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flattenKeys(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("message catalog parity", () => {
  it("ro.json and ru.json define exactly the same keys", () => {
    const roKeys = flattenKeys(ro).sort();
    const ruKeys = flattenKeys(ru).sort();

    expect(ruKeys).toEqual(roKeys);
  });
});
