import { NextRequest, NextResponse } from "next/server";

import { searchProducts } from "@lib/data/algolia-search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query) {
    return NextResponse.json({ hits: [] });
  }

  try {
    const result = await searchProducts({ query, hitsPerPage: 5 });
    return NextResponse.json(
      { hits: result.hits },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Live search failed", error);
    return NextResponse.json(
      { hits: [] },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
