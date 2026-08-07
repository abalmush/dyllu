import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

// opennextjs-cloudflare#962: the adapter rejects proxy.ts ("Node.js middleware is not currently supported") — revert to proxy.ts once supported
const handleI18nRouting = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const response = handleI18nRouting(request);

  if (request.cookies.get("_medusa_cache_id")) {
    return response;
  }

  const cacheId = crypto.randomUUID();

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
