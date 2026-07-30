import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { RequestContext } from "../domain/types";
import { McpSessionStore } from "./session-store";

const MAXIMUM_SESSIONS = 100;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

type McpRequest = IncomingMessage & {
  body?: unknown;
};

type SessionEntry = {
  server: McpServer;
  transport: StreamableHTTPServerTransport;
  run<T>(context: RequestContext, operation: () => Promise<T>): Promise<T>;
};

type ServerFactory = (getContext: () => RequestContext) => McpServer;

export class McpSessionRegistry {
  private readonly sessions = new McpSessionStore<SessionEntry>(
    MAXIMUM_SESSIONS,
    SESSION_IDLE_TIMEOUT_MS
  );

  async handle(
    req: McpRequest,
    res: ServerResponse,
    context: RequestContext,
    createServer: ServerFactory
  ) {
    await this.closeExpiredSessions(Date.now());
    const sessionHeader = this.readSessionId(req);
    if (sessionHeader.status === "invalid") {
      this.sendError(res, 400, -32000, "Invalid MCP session ID");
      return;
    }
    const sessionId =
      sessionHeader.status === "present" ? sessionHeader.value : null;

    if (sessionId) {
      const lookup = this.sessions.find(sessionId, context.actorId, Date.now());
      if (lookup.status === "actor_mismatch") {
        this.sendError(
          res,
          403,
          -32001,
          "The MCP session is not available to this user"
        );
        return;
      }
      if (lookup.status === "not_found") {
        this.sendError(res, 404, -32001, "MCP session not found");
        return;
      }

      await lookup.value.run(context, () =>
        lookup.value.transport.handleRequest(req, res, req.body)
      );
      return;
    }

    if (req.method !== "POST" || !isInitializeRequest(req.body)) {
      this.sendError(
        res,
        400,
        -32000,
        "A valid MCP session or initialization request is required"
      );
      return;
    }
    if (this.sessions.size >= MAXIMUM_SESSIONS) {
      this.sendError(res, 503, -32002, "MCP session capacity reached");
      return;
    }

    const contextStorage = new AsyncLocalStorage<RequestContext>();
    let entry: SessionEntry;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: randomUUID,
      onsessioninitialized: (initializedSessionId) => {
        this.sessions.add(
          initializedSessionId,
          context.actorId,
          entry,
          Date.now()
        );
      },
      onsessionclosed: (closedSessionId) => {
        this.sessions.remove(closedSessionId);
      },
    });
    const server = createServer(() => contextStorage.getStore() ?? context);
    entry = {
      server,
      transport,
      run(nextContext, operation) {
        return contextStorage.run(nextContext, operation);
      },
    };
    transport.onclose = () => {
      if (transport.sessionId) {
        this.sessions.remove(transport.sessionId);
      }
    };

    try {
      await server.connect(transport);
      await entry.run(context, () =>
        transport.handleRequest(req, res, req.body)
      );
    } catch (error) {
      if (!transport.sessionId) {
        await server.close();
      }
      throw error;
    }
  }

  private async closeExpiredSessions(now: number) {
    const expired = this.sessions.prune(now);
    await Promise.allSettled(expired.map((entry) => entry.server.close()));
  }

  private readSessionId(req: McpRequest) {
    const value = req.headers["mcp-session-id"];
    if (value === undefined) {
      return { status: "missing" as const };
    }
    if (
      typeof value !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
    ) {
      return { status: "invalid" as const };
    }
    return { status: "present" as const, value };
  }

  private sendError(
    res: ServerResponse,
    status: number,
    code: number,
    message: string
  ) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code, message },
        id: null,
      })
    );
  }
}

export const dylluMcpSessions = new McpSessionRegistry();
