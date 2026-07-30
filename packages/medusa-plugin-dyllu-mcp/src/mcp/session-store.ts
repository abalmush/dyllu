import { MedusaError } from "@medusajs/framework/utils";

type StoredSession<T> = {
  actorId: string;
  value: T;
  lastUsedAt: number;
};

export type SessionLookup<T> =
  | { status: "found"; value: T }
  | { status: "actor_mismatch" }
  | { status: "not_found" };

export class McpSessionStore<T> {
  private readonly sessions = new Map<string, StoredSession<T>>();

  constructor(
    private readonly maximumSessions: number,
    private readonly idleTimeoutMs: number
  ) {
    if (maximumSessions < 1 || idleTimeoutMs < 1) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "MCP session limits must be positive"
      );
    }
  }

  get size() {
    return this.sessions.size;
  }

  add(sessionId: string, actorId: string, value: T, now: number) {
    if (
      !this.sessions.has(sessionId) &&
      this.sessions.size >= this.maximumSessions
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "MCP session capacity reached"
      );
    }
    this.sessions.set(sessionId, {
      actorId,
      value,
      lastUsedAt: now,
    });
  }

  find(sessionId: string, actorId: string, now: number): SessionLookup<T> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { status: "not_found" };
    }
    if (now - session.lastUsedAt > this.idleTimeoutMs) {
      this.sessions.delete(sessionId);
      return { status: "not_found" };
    }
    if (session.actorId !== actorId) {
      return { status: "actor_mismatch" };
    }
    session.lastUsedAt = now;
    return { status: "found", value: session.value };
  }

  remove(sessionId: string) {
    return this.sessions.delete(sessionId);
  }

  prune(now: number) {
    const expired: T[] = [];
    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastUsedAt > this.idleTimeoutMs) {
        expired.push(session.value);
        this.sessions.delete(sessionId);
      }
    }
    return expired;
  }
}
