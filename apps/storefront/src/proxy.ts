import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.cookies.get("_medusa_cache_id")) {
    return NextResponse.next();
  }

  const cacheId = crypto.randomUUID();
  request.cookies.set("_medusa_cache_id", cacheId);

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  response.cookies.set({
    name: "_medusa_cache_id",
    value: cacheId,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|js|css)$).*)",
  ],
};
