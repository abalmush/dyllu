import { NextRequest, NextResponse } from "next/server";

import {
  getProductFeedPage,
  parseProductFeedRequest,
} from "@modules/store/lib/product-feed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const feedRequest = parseProductFeedRequest(request.nextUrl.searchParams);
    const payload = await getProductFeedPage(feedRequest);

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        message: "Nu am reușit să încărcăm lista de produse.",
      },
      { status: 500 }
    );
  }
}
