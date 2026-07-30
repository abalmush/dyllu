import { MedusaError } from "@medusajs/framework/utils";

type ActorWindow = {
  startedAt: number;
  requests: number;
};

export class ActorRateLimiter {
  private readonly actors = new Map<string, ActorWindow>();

  constructor(
    private readonly maximumRequests: number,
    private readonly windowMs: number,
    private readonly maximumActors: number
  ) {
    if (maximumRequests < 1 || windowMs < 1 || maximumActors < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Rate limiter bounds must be positive"
      );
    }
  }

  consume(actorId: string, now: number) {
    const current = this.actors.get(actorId);
    if (current && now - current.startedAt < this.windowMs) {
      if (current.requests >= this.maximumRequests) {
        return false;
      }
      current.requests += 1;
      return true;
    }

    this.prune(now);
    if (!this.actors.has(actorId) && this.actors.size >= this.maximumActors) {
      return false;
    }
    this.actors.set(actorId, { startedAt: now, requests: 1 });
    return true;
  }

  private prune(now: number) {
    for (const [actorId, window] of this.actors) {
      if (now - window.startedAt >= this.windowMs) {
        this.actors.delete(actorId);
      }
    }
  }
}
