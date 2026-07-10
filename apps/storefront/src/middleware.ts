import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import productRedirects from "@lib/data/product-redirects.json";

const productHandleRedirects = productRedirects as Record<string, string>;

// opennextjs-cloudflare#962: the adapter rejects proxy.ts ("Node.js middleware is not currently supported") — revert to proxy.ts once supported
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const productMatch = pathname.match(/^\/products\/([^/?#]+)\/?$/);
  if (productMatch) {
    const newHandle = productHandleRedirects[productMatch[1]];
    if (newHandle) {
      const url = request.nextUrl.clone();
      url.pathname = `/products/${newHandle}`;
      return NextResponse.redirect(url, 301);
    }
  }

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
