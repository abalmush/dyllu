import { ActorRateLimiter } from "../actor-rate-limiter";

describe("ActorRateLimiter", () => {
  it("limits each authenticated actor independently", () => {
    const limiter = new ActorRateLimiter(2, 60_000, 10);

    expect(limiter.consume("user_andrei", 1_000)).toBe(true);
    expect(limiter.consume("user_andrei", 2_000)).toBe(true);
    expect(limiter.consume("user_andrei", 3_000)).toBe(false);
    expect(limiter.consume("user_maria", 3_000)).toBe(true);
  });

  it("opens a new allowance after the fixed window", () => {
    const limiter = new ActorRateLimiter(1, 60_000, 10);

    expect(limiter.consume("user_andrei", 1_000)).toBe(true);
    expect(limiter.consume("user_andrei", 60_999)).toBe(false);
    expect(limiter.consume("user_andrei", 61_000)).toBe(true);
  });

  it("fails closed when the bounded actor store is full", () => {
    const limiter = new ActorRateLimiter(1, 60_000, 1);

    expect(limiter.consume("user_andrei", 1_000)).toBe(true);
    expect(limiter.consume("user_maria", 2_000)).toBe(false);
  });
});
