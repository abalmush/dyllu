import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// opennextjs-cloudflare#962: the adapter rejects proxy.ts ("Node.js middleware is not currently supported") — revert to proxy.ts once supported
export function middleware(request: NextRequest) {
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
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|js|css)$).*)",
  ],
};
