import { MedusaError } from "@medusajs/framework/utils";

type ManagerWindow = { startedAt: number; requests: number };

export class ManualReceiveRateLimiter {
  private readonly managers = new Map<string, ManagerWindow>();

  constructor(
    private readonly maximumRequests: number,
    private readonly windowMs: number,
    private readonly maximumManagers: number
  ) {
    if (maximumRequests < 1 || windowMs < 1 || maximumManagers < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Rate limiter bounds must be positive"
      );
    }
  }

  consume(managerId: string, now: number) {
    const current = this.managers.get(managerId);
    if (current && now - current.startedAt < this.windowMs) {
      if (current.requests >= this.maximumRequests) return false;
      current.requests += 1;
      return true;
    }

    this.prune(now);
    if (
      !this.managers.has(managerId) &&
      this.managers.size >= this.maximumManagers
    ) {
      return false;
    }
    this.managers.set(managerId, { startedAt: now, requests: 1 });
    return true;
  }

  private prune(now: number) {
    for (const [managerId, window] of this.managers) {
      if (now - window.startedAt >= this.windowMs) {
        this.managers.delete(managerId);
      }
    }
  }
}
