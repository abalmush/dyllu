import { ManualReceiveRateLimiter } from "../manual-receive-rate-limiter";

describe("ManualReceiveRateLimiter", () => {
  it("limits each manager independently", () => {
    const limiter = new ManualReceiveRateLimiter(2, 60_000, 10);

    expect(limiter.consume("user_a", 1_000)).toBe(true);
    expect(limiter.consume("user_a", 2_000)).toBe(true);
    expect(limiter.consume("user_a", 3_000)).toBe(false);
    expect(limiter.consume("user_b", 3_000)).toBe(true);
  });

  it("fails closed when the bounded manager store is full", () => {
    const limiter = new ManualReceiveRateLimiter(1, 60_000, 1);

    expect(limiter.consume("user_a", 1_000)).toBe(true);
    expect(limiter.consume("user_b", 2_000)).toBe(false);
  });
});
