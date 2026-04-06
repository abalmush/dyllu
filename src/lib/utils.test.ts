import { describe, it, expect } from "vitest";
import { formatPrice, cn } from "./utils";

describe("formatPrice", () => {
  it("formats USD correctly", () => {
    expect(formatPrice("19.99", "USD")).toBe("$19.99");
  });

  it("formats whole numbers", () => {
    expect(formatPrice("100", "USD")).toBe("$100.00");
  });
});

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("filters falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
