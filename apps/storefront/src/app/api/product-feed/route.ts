import { NextRequest, NextResponse } from "next/server";

import { getProductFeedPage } from "@modules/store/lib/product-feed";
import { parseProductFeedRequest } from "@modules/store/lib/product-feed-contract";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const feedRequest = parseProductFeedRequest(request.nextUrl.searchParams);
    const payload = await getProductFeedPage(feedRequest);

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("Product feed request failed", error);
    return NextResponse.json(
      {
        message: "Nu am reușit să încărcăm lista de produse.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      }
    );
  }
}
