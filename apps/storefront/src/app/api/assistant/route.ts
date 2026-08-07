import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
