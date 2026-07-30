import { McpSessionStore } from "../session-store";

describe("McpSessionStore", () => {
  it("never returns a session to another authenticated Medusa user", () => {
    const store = new McpSessionStore<string>(10, 60_000);
    store.add("session_1", "user_andrei", "private transport", 1_000);

    expect(store.find("session_1", "user_maria", 2_000)).toEqual({
      status: "actor_mismatch",
    });
    expect(store.find("session_1", "user_andrei", 2_000)).toEqual({
      status: "found",
      value: "private transport",
    });
  });

  it("removes expired sessions before resolving them", () => {
    const store = new McpSessionStore<string>(10, 60_000);
    store.add("session_1", "user_andrei", "transport", 1_000);

    expect(store.find("session_1", "user_andrei", 61_001)).toEqual({
      status: "not_found",
    });
    expect(store.size).toBe(0);
  });

  it("refuses new sessions when the bounded store is full", () => {
    const store = new McpSessionStore<string>(1, 60_000);
    store.add("session_1", "user_andrei", "first", 1_000);

    expect(() =>
      store.add("session_2", "user_andrei", "second", 2_000)
    ).toThrow("MCP session capacity reached");
  });
});
