import { NextRequest } from "next/server";

import { getBaseURL } from "@lib/util/env";

export const dynamic = "force-dynamic";

function isSameOrigin(request: NextRequest): boolean {
  const allowed = new URL(getBaseURL()).origin;
  const source =
    request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;
  try {
    return new URL(source).origin === allowed;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return new Response("Forbidden", { status: 403 });
  }

  const appId = process.env.ALGOLIA_APP_ID;
  const agentId = process.env.ALGOLIA_AGENT_ID;
  const searchApiKey = process.env.ALGOLIA_SEARCH_API_KEY;

  if (!appId || !agentId || !searchApiKey) {
    return new Response("AI assistant is not configured", { status: 503 });
  }

  const body = await request.text();

  const upstream = await fetch(
    `https://${appId.toLowerCase()}.algolia.net/agent-studio/1/agents/${agentId}/completions?compatibilityMode=ai-sdk-5`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-algolia-application-id": appId,
        "x-algolia-api-key": searchApiKey,
      },
      body,
    }
  );

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "text/event-stream",
      "cache-control": "no-store",
    },
  });
}
