# RU Locale Support (Phase 1: Routing + UI Chrome) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Russian as a second, URL-indexable locale (`/ru/...`) alongside the existing unprefixed Romanian default, with locale-persistent navigation, translated high-visibility UI chrome, locale-aware formatting, and SEO hreflang — using `next-intl` on Next.js 16.2.11.

**Architecture:** Move all routes under `app/[locale]/...`. `next-intl` (v4.13.5, confirmed compatible with Next 16.2.11 via peerDependencies) provides the routing middleware, locale-aware `Link`/`redirect`/`useRouter`/`usePathname` (via `src/i18n/navigation.ts`), and message catalogs (`messages/ro.json`, `messages/ru.json`). `ro` stays unprefixed (`localePrefix: "as-needed"`) so every existing indexed URL is unchanged; `ru` gets a `/ru/` prefix. The existing (currently dead) `_medusa_locale` cookie / `updateLocale()` action is wired to the new switcher so Medusa-side locale state tracks the UI language.

**Tech Stack:** Next.js 16.2.11 App Router, `next-intl@4.13.5`, existing Tailwind/shadcn-style component library, no new testing framework beyond a minimal Vitest config scoped to `src/i18n/**`.

Design reference: `docs/superpowers/specs/2026-08-07-ru-locale-support-design.md`

---

## Key implementation facts (read before starting)

- **This repo is pinned to Next 16.2.11.** `next-intl`'s newest documented pattern (`next/root-params`, no manual `params` awaiting) requires Next **16.3+** (per next-intl's own changelog: "Next.js 16.3 compatibility preparation"). **Use the "legacy" pattern instead**: `setRequestLocale` + `hasLocale` + manually `await`ing `params` in `app/[locale]/layout.tsx`. This is still fully documented and supported, just not the newest option — it's the version-correct choice here, not a shortcut.
- **`middleware.ts` stays named `middleware.ts`, not `proxy.ts`.** Next 16 renamed the convention to `proxy.ts`, but this repo's `@opennextjs/cloudflare` deployment adapter rejects Node-runtime `proxy.ts` (tracked upstream as opennextjs-cloudflare#962; the existing file has a comment recording this). `next-intl`'s middleware is a plain `(request: NextRequest) => NextResponse` function — assign it inside `export function middleware(request: NextRequest) { ... }` (the file's existing named-export convention), not `export default function proxy(...)`.
- **`localePrefix: "as-needed"` disables next-intl's automatic hreflang `Link` header.** Per next-intl's docs: "alternate links are disabled by default since URLs aren't unique per locale" under `as-needed`. Hreflang must be added manually via `getPathname()` in `generateMetadata`/`sitemap.ts` — this is Task 9, not automatic.
- **`app/layout.tsx` (the true root) is deleted, not kept as an extra wrapper.** Since `[locale]` becomes the sole top-level route segment for all pages, `app/[locale]/layout.tsx` becomes the effective root layout (owns `<html>`/`<body>`) — this matches next-intl's own canonical example structure. `app/global-error.tsx` stays at the true root (Next.js requirement — it must exist outside any segment to catch root-layout crashes) and cannot know the locale from routing at that point.
- **~44 files import `next/link`, ~12 files import `useRouter`/`usePathname`/`redirect` from `next/navigation`.** Every one must switch to the `next-intl`-aware equivalents from `src/i18n/navigation.ts`, or clicking that link silently drops the user back to the default locale (`as-needed` means an unprefixed href always resolves to `ro`). This is a correctness requirement, not polish — it's done in full (Task 4), unlike the UI-string extraction below.
- **Scope boundary, decided explicitly (not an oversight):** this plan translates the highest-visibility chrome (header, utility bar, announcement bar, cart drawer, skip link, error pages, checkout country label) and fixes locale-aware formatting/SEO/routing. It does **not** extract the long tail of UI strings in account pages, PDP secondary sections, and checkout edge-case copy, and does **not** thread the active locale into `categories.ts`/`homepage-products.ts`/`navigation-products.ts` (those hardcode `x-medusa-locale: "ro"` — harmless to leave as-is until Phase 2 enables Medusa's translation feature flag, since the header has zero effect while that flag is off). Both are called out again in Task 11 as explicit, tracked follow-ups — not silently dropped.

---

### Task 1: Install `next-intl` and scaffold i18n config

**Files:**

- Modify: `apps/storefront/package.json`
- Modify: `apps/storefront/next.config.ts`
- Create: `apps/storefront/src/i18n/routing.ts`
- Create: `apps/storefront/src/i18n/navigation.ts`
- Create: `apps/storefront/src/i18n/request.ts`
- Create: `apps/storefront/messages/ro.json`
- Create: `apps/storefront/messages/ru.json`

- [ ] **Step 1: Install the package**

```bash
cd apps/storefront
pnpm add next-intl
```

- [ ] **Step 2: Wrap `next.config.ts` with the plugin**

In `apps/storefront/next.config.ts`, add the import and wrap the export:

```ts
import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import checkEnvVariables from "./check-env-variables.js";
```

Change the final export from `export default nextConfig;` to:

```ts
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
```

(Keep the trailing `initOpenNextCloudflareForDev()` block below this — it's unaffected.)

- [ ] **Step 3: Create the routing config**

```ts
// apps/storefront/src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["ro", "ru"],
  defaultLocale: "ro",
  localePrefix: "as-needed",
  localeDetection: false,
});
```

`localeDetection: false` disables Accept-Language negotiation — matches the design decision (always default to `ro` for first-time visitors).

- [ ] **Step 4: Create the navigation wrappers**

```ts
// apps/storefront/src/i18n/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

- [ ] **Step 5: Create the request config (legacy pattern — required for Next 16.2.11)**

```ts
// apps/storefront/src/i18n/request.ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 6: Seed the message catalogs**

```json
// apps/storefront/messages/ro.json
{
  "Common": {
    "skipToContent": "Sari la conținut"
  },
  "LocaleSwitcher": {
    "label": "Limbă"
  }
}
```

```json
// apps/storefront/messages/ru.json
{
  "Common": {
    "skipToContent": "Перейти к содержимому"
  },
  "LocaleSwitcher": {
    "label": "Язык"
  }
}
```

- [ ] **Step 7: Typecheck**

```bash
pnpm typecheck
```

Expected: passes (nothing consumes these files yet, but they must be valid TS/JSON).

- [ ] **Step 8: Commit**

```bash
git add apps/storefront/package.json apps/storefront/pnpm-lock.yaml apps/storefront/next.config.ts apps/storefront/src/i18n apps/storefront/messages
git commit -m "DYLLU-000 Install next-intl and scaffold i18n config"
```

---

### Task 2: Compose the middleware

**Files:**

- Modify: `apps/storefront/src/middleware.ts`

- [ ] **Step 1: Rewrite the file to compose next-intl's routing with the existing cache-id cookie logic**

```ts
// apps/storefront/src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
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
```

Note: the original also set `_medusa_cache_id` on the _request_ headers (`request.cookies.set(...)` before `NextResponse.next({request: {headers: request.headers}})`) so downstream Server Components could read the freshly-set cookie within the same request. Since `handleI18nRouting(request)` already returns its own `NextResponse` (a redirect or rewrite) before we can mutate the request, that same-request propagation isn't available here — this only sets the cookie for the _next_ request, same as before, minus that one same-request edge case. This is an acceptable, minor behavior change: cross-check in Task 11 that no code relies on reading `_medusa_cache_id` synchronously on the very first request.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/middleware.ts
git commit -m "DYLLU-000 Compose next-intl routing into the existing middleware"
```

---

### Task 3: Restructure routes under `app/[locale]/`

**Files:**

- Move: `apps/storefront/src/app/(main)/` → `apps/storefront/src/app/[locale]/(main)/`
- Move: `apps/storefront/src/app/(checkout)/` → `apps/storefront/src/app/[locale]/(checkout)/`
- Move: `apps/storefront/src/app/error.tsx` → `apps/storefront/src/app/[locale]/error.tsx`
- Create: `apps/storefront/src/app/[locale]/layout.tsx`
- Delete: `apps/storefront/src/app/layout.tsx`
- Modify: `apps/storefront/src/app/global-error.tsx`

- [ ] **Step 1: Move the route directories and the segment-scoped error boundary**

```bash
cd apps/storefront/src/app
mkdir -p "[locale]"
git mv "(main)" "[locale]/(main)"
git mv "(checkout)" "[locale]/(checkout)"
git mv error.tsx "[locale]/error.tsx"
```

- [ ] **Step 2: Create `app/[locale]/layout.tsx`**

This absorbs everything from the old `app/layout.tsx` (fonts, `SmoothScrollProvider`, `Toaster`, `ScrollToTopButton`, metadata) plus the locale-layout responsibilities (`generateStaticParams`, `setRequestLocale`, `NextIntlClientProvider`, hreflang alternates, locale-aware `<html lang>`):

```tsx
// apps/storefront/src/app/[locale]/layout.tsx
import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { hasLocale } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { getBaseURL } from "@lib/util/env";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
} from "@/lib/seo/metadata";
import { SmoothScrollProvider } from "@/components/atoms/smooth-scroll-provider";
import { Toaster } from "@/components/atoms/sonner";
import { ScrollToTopButton } from "@/components/molecules/scroll-to-top-button";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";

import "styles/globals.css";

const smoothScrollEnabled = process.env.NEXT_PUBLIC_SMOOTH_SCROLL !== "off";
const smoothScrollDisableOnTouch =
  process.env.NEXT_PUBLIC_SMOOTH_SCROLL_TOUCH === "off";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

const sora = Sora({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-display",
});

const OG_LOCALE: Record<(typeof routing.locales)[number], string> = {
  ro: "ro_MD",
  ru: "ru_MD",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: Pick<Props, "params">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const languages = Object.fromEntries(
    await Promise.all(
      routing.locales.map(async (altLocale) => [
        altLocale,
        await getPathname({ locale: altLocale, href: "/" }),
      ])
    )
  );

  return {
    metadataBase: new URL(getBaseURL()),
    applicationName: SITE_NAME,
    title: {
      default: DEFAULT_TITLE,
      template: "%s · DYLLU",
    },
    description: DEFAULT_DESCRIPTION,
    alternates: { languages },
    openGraph: {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      url: "/",
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale as (typeof routing.locales)[number]],
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE[l]),
      type: "website",
      images: [
        {
          url: DEFAULT_SOCIAL_IMAGE,
          width: 1200,
          height: 630,
          alt: DEFAULT_TITLE,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      images: [{ url: DEFAULT_SOCIAL_IMAGE, alt: DEFAULT_TITLE }],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      data-mode="light"
      className={`${inter.variable} ${sora.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <SkipLink />
        <SmoothScrollProvider
          enabled={smoothScrollEnabled}
          disableOnTouch={smoothScrollDisableOnTouch}
        >
          <div className="relative">{children}</div>
        </SmoothScrollProvider>
        <Toaster richColors closeButton position="top-right" />
        <ScrollToTopButton />
      </body>
    </html>
  );
}

async function SkipLink() {
  const t = await getTranslations("Common");
  return (
    <a className="skip-link" href="#main-content">
      {t("skipToContent")}
    </a>
  );
}
```

`OG_LOCALE` uses `ru_MD` (Russian language, Moldova region) rather than `ru_RU`, matching the design decision that this is the same Moldovan market, not a separate Russia-targeted region.

- [ ] **Step 3: Delete the old root layout**

```bash
git rm apps/storefront/src/app/layout.tsx
```

- [ ] **Step 4: Update `global-error.tsx`** (stays at the true root; add a small client-side cookie read so `<html lang>` is at least approximately correct on this last-resort fallback page, since it renders with no routing context)

```tsx
// apps/storefront/src/app/global-error.tsx
"use client";

import { useEffect, useState } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [lang, setLang] = useState("ro");

  useEffect(() => {
    console.error("Storefront root error", {
      digest: error.digest,
      message: error.message,
    });
    const match = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]+)/);
    if (match) setLang(decodeURIComponent(match[1]));
  }, [error]);

  const copy =
    lang === "ru"
      ? {
          title: "Магазин временно недоступен",
          body: "Пожалуйста, попробуйте снова через несколько минут.",
          retry: "Повторить",
        }
      : {
          title: "Magazinul este temporar indisponibil",
          body: "Te rugăm să încerci din nou peste câteva momente.",
          retry: "Încearcă din nou",
        };

  return (
    <html lang={lang}>
      <body>
        <main
          style={{
            alignItems: "center",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: "44px", padding: "0.75rem 1.5rem" }}
          >
            {copy.retry}
          </button>
        </main>
      </body>
    </html>
  );
}
```

`NEXT_LOCALE` is next-intl's own cookie name (set automatically by its middleware/navigation) — confirm this in Task 11's manual QA (inspect cookies in devtools) rather than assuming, since this is the one place in the plan reading it by name instead of through a next-intl API.

- [ ] **Step 5: Update `app/[locale]/error.tsx`'s hardcoded strings to be locale-aware**

Read the current file (`apps/storefront/src/app/[locale]/error.tsx` after the move) and replace its three hardcoded strings using `useTranslations` from `next-intl` (it's a `"use client"` component already). Add to both message files under a new `Errors` namespace:

```json
// messages/ro.json — add to the top-level object
"Errors": {
  "eyebrow": "Eroare temporară",
  "title": "Pagina nu a putut fi încărcată",
  "body": "Te rugăm să încerci din nou. Dacă problema persistă, revino peste câteva minute.",
  "retry": "Încearcă din nou"
}
```

```json
// messages/ru.json — add to the top-level object
"Errors": {
  "eyebrow": "Временная ошибка",
  "title": "Не удалось загрузить страницу",
  "body": "Пожалуйста, попробуйте снова. Если проблема повторяется, вернитесь через несколько минут.",
  "retry": "Повторить"
}
```

Then in `app/[locale]/error.tsx`, add `import { useTranslations } from "next-intl";`, call `const t = useTranslations("Errors");` inside the component, and replace the three hardcoded strings with `{t("eyebrow")}`, `{t("title")}`, `{t("body")}`, `{t("retry")}`.

- [ ] **Step 6: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```

Expected: build fails here — this is expected and fine. The build will surface every file still importing from the now-nonexistent relative paths or using `next/link`/`next/navigation` in a way that no longer resolves correctly under the new tree (mostly it'll just succeed structurally since imports are path-aliased, but any `notFound()`/`redirect()` call sites tied to the old flat structure may need attention). Read the actual error output before proceeding — do not guess; Task 4 addresses the `next/link`/`next/navigation` migration specifically, so most remaining errors after that task should resolve. If `pnpm build` fails for a reason unrelated to the locale restructuring, stop and investigate before continuing.

- [ ] **Step 7: Commit**

```bash
git add -A apps/storefront/src/app
git commit -m "DYLLU-000 Move routes under app/[locale] and add the locale root layout"
```

---

### Task 4: Migrate internal navigation to locale-aware APIs

**Files:**

- Modify: all files matching `from "next/link"` (~44 files)
- Modify: all files matching `from "next/navigation"` importing `useRouter`, `usePathname`, or `redirect` (~12 files, discovered below)

- [ ] **Step 1: Scripted `next/link` → `next-intl` Link swap**

Run from `apps/storefront`:

```bash
grep -rl 'from "next/link"' src | while read -r file; do
  perl -0pi -e 's/import Link from "next\/link";/import { Link } from "@\/i18n\/navigation";/' "$file"
done
```

This targets the single, uniform import line style used throughout this codebase (`import Link from "next/link";`). Do not assume it caught everything — verify:

```bash
grep -rl 'from "next/link"' src
```

Expected: no results. If any remain, they used a different import style (e.g. combined with a type import) — fix those individually by hand, same target: `import { Link } from "@/i18n/navigation";`.

- [ ] **Step 2: Discover and fix `next/navigation` router-hook usages**

```bash
grep -rl "next/navigation" src | xargs grep -l "useRouter\|usePathname\|redirect("
```

For each file in that list: open it, and **only** move the specific named imports that have i18n equivalents (`useRouter`, `usePathname`, `redirect`) to `@/i18n/navigation`, leaving any other `next/navigation` imports (`useSearchParams`, `useParams`, `notFound`, `permanentRedirect`, `useSelectedLayoutSegment`, etc.) untouched on their own `next/navigation` import line — these have no i18n-aware equivalent and must keep working exactly as before.

Example transform (illustrative — apply per file's actual imports):

```diff
-import { useRouter, useSearchParams } from "next/navigation";
+import { useSearchParams } from "next/navigation";
+import { useRouter } from "@/i18n/navigation";
```

- [ ] **Step 3: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```

Expected: passes, or fails with specific, readable errors (e.g. a missed import, or a `redirect()` call site that needs a locale-aware target path). Fix forward until clean. This is the main correctness gate for this task — do not move on with a red build.

- [ ] **Step 4: Commit**

```bash
git add -A apps/storefront/src
git commit -m "DYLLU-000 Route internal navigation through locale-aware Link/router APIs"
```

---

### Task 5: Give `LocalizedClientLink` a real implementation

**Files:**

- Modify: `apps/storefront/src/modules/common/components/localized-client-link/index.tsx`

- [ ] **Step 1: Replace the pass-through with the real locale-aware Link**

```tsx
// apps/storefront/src/modules/common/components/localized-client-link/index.tsx
"use client";

import { Link } from "@/i18n/navigation";
import React from "react";

const LocalizedClientLink = ({
  children,
  href,
  ...props
}: {
  children?: React.ReactNode;
  href: string;
  className?: string;
  onClick?: () => void;
  passHref?: true;
  [x: string]: any;
}) => {
  return (
    <Link href={href} {...props}>
      {children}
    </Link>
  );
};

export default LocalizedClientLink;
```

Its 13 existing call sites (`src/modules/order/**`, `src/modules/account/**`, `src/modules/shipping/**`, `src/modules/common/components/interactive-link`) need no changes — same import path, same props, now actually locale-aware.

- [ ] **Step 2: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/modules/common/components/localized-client-link/index.tsx
git commit -m "DYLLU-000 Make LocalizedClientLink actually locale-aware"
```

---

### Task 6: Language switcher, wired to the existing `updateLocale` action

**Files:**

- Create: `apps/storefront/src/components/molecules/locale-switcher.tsx`
- Modify: `apps/storefront/src/components/organisms/utility-bar.tsx`

- [ ] **Step 1: Create the switcher**

```tsx
// apps/storefront/src/components/molecules/locale-switcher.tsx
"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { updateLocale } from "@lib/data/locale-actions";
import { cn } from "@lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("LocaleSwitcher");
  const [, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t("label")}
      className="border-border flex items-center gap-1 rounded-full border p-0.5 text-xs font-semibold"
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-current={locale === activeLocale ? "true" : undefined}
          onClick={() => {
            startTransition(() => {
              void updateLocale(locale);
            });
          }}
          className={cn(
            "rounded-full px-2 py-1 uppercase transition-colors",
            locale === activeLocale
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {locale}
        </Link>
      ))}
    </div>
  );
}
```

`updateLocale` also revalidates the `products`/`categories`/`collections`/`carts` cache tags (see `locale-actions.ts`) — harmless no-op today since Medusa's translation feature is off, becomes meaningful once Phase 2 ships. Runs inside `startTransition` so it doesn't block the `Link`'s own navigation.

- [ ] **Step 2: Add it to the utility bar**

In `apps/storefront/src/components/organisms/utility-bar.tsx`, add the import:

```tsx
import { LocaleSwitcher } from "@/components/molecules/locale-switcher";
```

And render it in the right-hand nav group, next to the existing links:

```tsx
<nav aria-label="Linkuri utile" className="flex items-center gap-6">
  <Link
    href="/contact"
    className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
  >
    <MapPin aria-hidden="true" className="size-4" />
    Magazine DYLLU
  </Link>
  <Link
    href="/returnari"
    className="hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
  >
    <Wrench aria-hidden="true" className="size-4" />
    Service și piese de schimb
  </Link>
  <LocaleSwitcher />
</nav>
```

Note: `UtilityBar` is `medium:block hidden` — desktop/tablet only. The switcher is only reachable there for now; adding a mobile-nav entry point is part of the deferred long-tail work (Task 11), since `MobileNav` wasn't in the high-visibility list surveyed for this plan and needs its own read-before-edit pass.

- [ ] **Step 3: Typecheck**

```bash
pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/src/components/molecules/locale-switcher.tsx apps/storefront/src/components/organisms/utility-bar.tsx
git commit -m "DYLLU-000 Add language switcher wired to the existing locale action"
```

---

### Task 7: Translate high-visibility chrome

**Files:**

- Modify: `apps/storefront/messages/ro.json`, `apps/storefront/messages/ru.json`
- Modify: `apps/storefront/src/components/organisms/announcement-bar.tsx`
- Modify: `apps/storefront/src/components/organisms/utility-bar.tsx`
- Modify: `apps/storefront/src/components/organisms/cart-drawer.tsx`
- Modify: `apps/storefront/src/components/organisms/site-header.tsx`
- Modify: `apps/storefront/src/modules/checkout/components/country-select/index.tsx`

- [ ] **Step 1: Add the message keys**

```json
// messages/ro.json — add these top-level namespaces
"AnnouncementBar": {
  "freeShipping": "Livrare gratuită în Chișinău pentru comenzi peste 1.000 MDL",
  "onlineOrder": "Comandă online, confirmare rapidă și retur în 14 zile",
  "support": "Suport și confirmări {hours} · {phone}",
  "close": "Închide bara de anunțuri"
},
"UtilityBar": {
  "usefulLinks": "Linkuri utile",
  "stores": "Magazine DYLLU",
  "service": "Service și piese de schimb"
},
"CartDrawer": {
  "open": "Deschide coșul",
  "title": "Coșul tău · {count} {count, plural, one {produs} other {produse}}",
  "description": "Produsele adăugate în coș, subtotalul și acțiunile de finalizare a comenzii.",
  "quantity": "Cantitate · {count}",
  "remove": "Șterge produsul",
  "subtotal": "Subtotal",
  "subtotalNote": "fără livrare",
  "viewCart": "Vezi coșul",
  "checkout": "Finalizează",
  "empty": "Coșul este gol",
  "emptyHint": "Descoperă scule, echipamente și accesorii pentru orice proiect.",
  "browse": "Explorează produsele"
},
"SiteHeader": {
  "homeLink": "Pagina principală DYLLU",
  "searchPlaceholder": "Caută scule, accesorii…",
  "search": "Caută",
  "account": "Contul tău"
},
"Checkout": {
  "country": "Țară"
}
```

```json
// messages/ru.json — matching namespaces
"AnnouncementBar": {
  "freeShipping": "Бесплатная доставка по Кишинёву при заказе от 1000 MDL",
  "onlineOrder": "Заказ онлайн, быстрое подтверждение и возврат в течение 14 дней",
  "support": "Поддержка и подтверждения {hours} · {phone}",
  "close": "Закрыть панель объявлений"
},
"UtilityBar": {
  "usefulLinks": "Полезные ссылки",
  "stores": "Магазины DYLLU",
  "service": "Сервис и запчасти"
},
"CartDrawer": {
  "open": "Открыть корзину",
  "title": "Ваша корзина · {count} {count, plural, one {товар} few {товара} other {товаров}}",
  "description": "Товары в корзине, промежуточный итог и оформление заказа.",
  "quantity": "Количество · {count}",
  "remove": "Удалить товар",
  "subtotal": "Промежуточный итог",
  "subtotalNote": "без доставки",
  "viewCart": "Перейти в корзину",
  "checkout": "Оформить заказ",
  "empty": "Корзина пуста",
  "emptyHint": "Откройте для себя инструменты, оборудование и аксессуары для любого проекта.",
  "browse": "Смотреть товары"
},
"SiteHeader": {
  "homeLink": "Главная страница DYLLU",
  "searchPlaceholder": "Поиск инструментов, аксессуаров…",
  "search": "Поиск",
  "account": "Ваш аккаунт"
},
"Checkout": {
  "country": "Страна"
}
```

- [ ] **Step 2: Wire `announcement-bar.tsx`**

It's already `"use client"`. Add `import { useTranslations } from "next-intl";`, and inside the component build `DEFAULT_MESSAGES` from `t(...)` instead of the module-level hardcoded array — move the `DEFAULT_MESSAGES` array construction inside the component body (it currently depends on `SITE_CONTACT`, so it's not a pure top-level constant issue to change):

```tsx
const t = useTranslations("AnnouncementBar");
const messages: Message[] = propMessages ?? [
  { icon: <Truck className="size-3.5" />, text: t("freeShipping") },
  { icon: <ShieldCheck className="size-3.5" />, text: t("onlineOrder") },
  {
    icon: <Phone className="size-3.5" />,
    text: t("support", {
      hours: SITE_CONTACT.hoursShort,
      phone: SITE_CONTACT.phoneDisplay,
    }),
  },
];
```

(Rename the destructured `messages` prop to `propMessages` in the function signature to avoid shadowing.) Replace the `aria-label="Închide bara de anunțuri"` with `aria-label={t("close")}`.

- [ ] **Step 3: Wire `utility-bar.tsx`**

Add `import { useTranslations } from "next-intl";` — wait, `UtilityBar` is currently a Server Component (no `"use client"`, no hooks). Adding `useTranslations` (a client hook) would force it client-side, which is unnecessary. Use `getTranslations` from `next-intl/server` instead and make the component `async`:

```tsx
import { getTranslations } from "next-intl/server";
// ...
export async function UtilityBar() {
  const t = await getTranslations("UtilityBar");
  return (
    // ...
    <nav aria-label={t("usefulLinks")} className="flex items-center gap-6">
      <Link href="/contact" ...>
        <MapPin aria-hidden="true" className="size-4" />
        {t("stores")}
      </Link>
      <Link href="/returnari" ...>
        <Wrench aria-hidden="true" className="size-4" />
        {t("service")}
      </Link>
      <LocaleSwitcher />
    </nav>
    // ...
  );
}
```

Since `(main)/layout.tsx` calls `<UtilityBar />` without `await`ing (it's JSX, not a direct call), an async Server Component here works natively — no caller change needed.

- [ ] **Step 4: Wire `cart-drawer.tsx`, `site-header.tsx`, `country-select/index.tsx`**

`CartDrawer` and `SiteHeader` are `"use client"` — use `useTranslations("CartDrawer")` / `useTranslations("SiteHeader")` and replace every hardcoded string identified in Task 7 Step 1 with the corresponding `t(...)` call, including the pluralized cart title (`t("title", { count: totalItems })`) and the `aria-label`s. `CountrySelect` gets `useTranslations("Checkout")` for the `"Țară"` placeholder default, and its `Intl.DisplayNames(["ro"], ...)` becomes `Intl.DisplayNames([useLocale()], ...)` — add `import { useLocale, useTranslations } from "next-intl";`.

- [ ] **Step 5: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```

- [ ] **Step 6: Commit**

```bash
git add apps/storefront/messages apps/storefront/src/components/organisms/announcement-bar.tsx apps/storefront/src/components/organisms/utility-bar.tsx apps/storefront/src/components/organisms/cart-drawer.tsx apps/storefront/src/components/organisms/site-header.tsx apps/storefront/src/modules/checkout/components/country-select/index.tsx
git commit -m "DYLLU-000 Translate header, cart drawer, and checkout country label"
```

---

### Task 8: Locale-aware number/date formatting

**Files:**

- Modify: `apps/storefront/src/lib/util/money.ts`
- Modify: the ~12 files hardcoding `Intl.NumberFormat("ro-MD")` / `Intl.DateTimeFormat("ro-MD")` / `.toLocaleString("ro-MD")` (discovered below)

- [ ] **Step 1: Fix `money.ts`'s default**

Change the default parameter from `locale = "en-US"` to `locale = "ro-MD"` — this matches what every caller already implicitly relies on today (none of them currently pass a real locale, so they've been getting `en-US`-formatted currency without anyone noticing at this component's boundary; `ro-MD` is at least consistent with the rest of the app's number formatting). Threading the _actual_ active locale (`ro-MD`/`ru-MD`) into every one of this function's callers is deferred — see Task 11.

```ts
export const convertToLocale = ({
  amount,
  currency_code,
  minimumFractionDigits,
  maximumFractionDigits,
  locale = "ro-MD",
}: ConvertToLocaleParams) => {
```

- [ ] **Step 2: Discover and migrate the hardcoded formatting call sites**

```bash
grep -rln '"ro-MD"\|toLocaleLowerCase("ro")\|localeCompare(.*"ro")' src
```

For each `"use client"` component in that list, replace `new Intl.NumberFormat("ro-MD", {...})` / `new Intl.DateTimeFormat("ro-MD", {...})` / `.toLocaleString("ro-MD", {...})` with `next-intl`'s `useFormatter()`:

```tsx
import { useFormatter } from "next-intl";
// ...
const format = useFormatter();
// number: format.number(value, { style: "currency", currency: "MDL" })
// date:   format.dateTime(date, { dateStyle: "medium" })
```

Preserve each call site's existing formatting _options_ (fraction digits, date style, etc.) exactly — only the locale source changes, from a hardcoded string to the active request locale. For any of these files that are Server Components (no `"use client"`), use `getFormatter()` from `next-intl/server` instead (async).

The two `.toLocaleLowerCase("ro")`/`.localeCompare(..., "ro")` call sites (`product-presentation.ts`, `category-navigation.ts`) are sorting/comparison helpers, not user-visible formatted output — these can take an explicit `locale` parameter threaded from the caller if the caller already has `useLocale()`/`getLocale()` in scope; if not, leave them defaulting to `"ro"` for now and note it in Task 11 (sorting order differences between `ro`/`ru` collation are a minor polish item, not a correctness bug — Cyrillic category names don't exist yet since Phase 2 catalog translation hasn't shipped, so this has no visible effect today).

- [ ] **Step 3: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```

- [ ] **Step 4: Commit**

```bash
git add -A apps/storefront/src
git commit -m "DYLLU-000 Use locale-aware formatting instead of hardcoded ro-MD"
```

---

### Task 9: SEO — sitemap hreflang

**Files:**

- Modify: `apps/storefront/src/app/sitemap.ts`

- [ ] **Step 1: Add per-URL `alternates.languages` using `getPathname`**

```ts
// apps/storefront/src/app/sitemap.ts
import type { MetadataRoute } from "next";

import { getCategoryTree, type CategoryNode } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";
import { listProducts } from "@lib/data/products";
import { getBaseURL } from "@lib/util/env";
import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const STATIC_ROUTES = [
  "/",
  "/store",
  "/contact",
  "/livrare",
  "/returnari",
  "/termeni",
  "/confidentialitate",
  "/branduri",
];

const flattenCategories = (categories: CategoryNode[]): CategoryNode[] =>
  categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children),
  ]);

async function alternatesFor(href: string) {
  const languages = Object.fromEntries(
    await Promise.all(
      routing.locales.map(async (locale) => [
        locale,
        getBaseURL() + (await getPathname({ locale, href })),
      ])
    )
  );
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL();

  const [categoryTree, collections, productsResponse] = await Promise.all([
    getCategoryTree().catch(() => []),
    listCollections({
      fields: "handle,updated_at,created_at",
      limit: "200",
    }).catch(() => ({ collections: [] })),
    listProducts({
      queryParams: {
        limit: 500,
        fields: "handle,updated_at,created_at",
      },
    }).catch(() => ({ response: { products: [], count: 0 }, nextPage: null })),
  ]);

  const staticEntries = await Promise.all(
    STATIC_ROUTES.map(async (route) => ({
      url: `${baseUrl}${route}`,
      changeFrequency: (route === "/" ? "daily" : "weekly") as const,
      priority: route === "/" ? 1 : 0.7,
      alternates: await alternatesFor(route),
    }))
  );

  const categoryEntries = await Promise.all(
    flattenCategories(categoryTree)
      .filter((category) => category.handle)
      .map(async (category) => ({
        url: `${baseUrl}/categories/${category.handle}`,
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: await alternatesFor(`/categories/${category.handle}`),
      }))
  );

  const collectionEntries = await Promise.all(
    collections.collections
      .filter((collection) => collection.handle)
      .map(async (collection) => ({
        url: `${baseUrl}/collections/${collection.handle}`,
        lastModified: collection.updated_at ?? collection.created_at,
        changeFrequency: "weekly" as const,
        priority: 0.7,
        alternates: await alternatesFor(`/collections/${collection.handle}`),
      }))
  );

  const productEntries = await Promise.all(
    productsResponse.response.products
      .filter((product) => product.handle)
      .map(async (product) => ({
        url: `${baseUrl}/products/${product.handle}`,
        lastModified: product.updated_at ?? product.created_at,
        changeFrequency: "weekly" as const,
        priority: 0.9,
        alternates: await alternatesFor(`/products/${product.handle}`),
      }))
  );

  return [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...productEntries,
  ];
}
```

- [ ] **Step 2: Typecheck and build**

```bash
pnpm typecheck
pnpm build
```

- [ ] **Step 3: Commit**

```bash
git add apps/storefront/src/app/sitemap.ts
git commit -m "DYLLU-000 Add per-locale hreflang alternates to the sitemap"
```

---

### Task 10: Minimal unit tests (routing config + message catalog parity)

**Files:**

- Create: `apps/storefront/vitest.config.ts`
- Modify: `apps/storefront/package.json`
- Create: `apps/storefront/src/i18n/__tests__/message-parity.unit.spec.ts`

- [ ] **Step 1: Add a minimal Vitest config scoped to `src/i18n`**

```bash
cd apps/storefront
pnpm add -D vitest
```

```ts
// apps/storefront/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/i18n/**/*.unit.spec.ts"],
  },
});
```

Add to `package.json` scripts: `"test:unit": "vitest run"`.

If this setup takes noticeably more than a few minutes (dependency resolution issues, TS path-alias resolution problems in Vitest, etc.), stop and fall back to a plain Node script run via `tsx` instead — don't sink time into fighting a test-runner config for two small checks.

- [ ] **Step 2: Write the message-catalog parity test**

```ts
// apps/storefront/src/i18n/__tests__/message-parity.unit.spec.ts
import { describe, expect, it } from "vitest";
import ro from "../../../messages/ro.json";
import ru from "../../../messages/ru.json";

function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null
      ? flattenKeys(value as Record<string, unknown>, path)
      : [path];
  });
}

describe("message catalog parity", () => {
  it("ro.json and ru.json define exactly the same keys", () => {
    const roKeys = flattenKeys(ro).sort();
    const ruKeys = flattenKeys(ru).sort();

    expect(ruKeys).toEqual(roKeys);
  });
});
```

- [ ] **Step 3: Run it and confirm it passes**

```bash
pnpm test:unit
```

Expected: 1 passed. If it fails, it means Task 7's two message files actually drifted — fix the catalogs, not the test.

- [ ] **Step 4: Commit**

```bash
git add apps/storefront/vitest.config.ts apps/storefront/package.json apps/storefront/src/i18n/__tests__ apps/storefront/pnpm-lock.yaml
git commit -m "DYLLU-000 Add message-catalog parity unit test"
```

---

### Task 11: Full verification and manual-QA handoff

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck, lint, build**

```bash
pnpm typecheck
pnpm lint
pnpm build
```

Expected: all clean.

- [ ] **Step 2: Run the existing e2e suite as a regression check**

```bash
pnpm exec playwright test --project=chromium
```

Per the earlier scroll-to-top work, some failures in this suite are pre-existing and data/environment-dependent (catalog content drift on the shared dev backend), not code regressions. What matters here specifically: **no new failures caused by the route restructuring** — compare against which specs failed before this branch existed if anything looks route-related (a 404 on a previously-working path, a redirect loop, etc.). Report the diff plainly; don't silently wave away a failure that's plausibly caused by this change.

- [ ] **Step 3: Start the dev server for manual testing**

```bash
pnpm dev
```

Hand off to the user with this checklist (don't automate it further — manual testing was explicitly requested):

- Visit `/` → confirm Romanian, unprefixed.
- Click the RU toggle in the utility bar → confirm URL becomes `/ru`, header/cart drawer/announcement bar/footer utility links switch language, page content (product data) stays Romanian (expected — Phase 2 not shipped).
- Navigate around several pages while on `/ru/...` → confirm the `/ru/` prefix persists (this is the main regression risk from Task 4's Link migration).
- Reload a `/ru/...` page directly (paste URL) → confirm it loads correctly (not just client-side navigation working).
- View page source on both `/` and `/ru` → confirm `<html lang>` is correct and a `<link rel="alternate" hreflang="...">`-equivalent shows up via the metadata (or check `/sitemap.xml` for the `alternates`).
- Run through checkout in both locales end-to-end (this is the highest-risk flow given the route move).
- Confirm the scroll-to-top button and cart drawer still work under `/ru/...` (regression check against the two most recent unrelated features).

- [ ] **Step 4: Summarize deferred follow-up work explicitly** (in the final report to the user, not as a plan step to execute)

- Long-tail UI string extraction: account pages, PDP secondary sections (specs, compatible accessories, power-supply configurator), checkout secondary copy, order details/confirmation pages, mobile nav's own strings, and the language switcher's absence from mobile nav.
- `convertToLocale` callers not yet passing the real active locale explicitly (money still visually formats the same as before everywhere, since `ro-MD` and `ru-MD` render numbers near-identically — not a visible bug today, just not wired to switch).
- `categories.ts`/`homepage-products.ts`/`navigation-products.ts` still hardcode `x-medusa-locale: "ro"` — intentionally deferred to Phase 2 (see Key Implementation Facts).
- Phase 2 itself: enabling Medusa's `MEDUSA_FF_TRANSLATION` flag and translating catalog content — a separate, production-config-gated effort per AGENTS.md.

Do **not** open a PR or merge in this task — the user asked to test locally first before deciding next steps.
