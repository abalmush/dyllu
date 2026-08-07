import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
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
        .map((l) => OG_LOCALE[l as (typeof routing.locales)[number]]),
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
        <NextIntlClientProvider>
          <SmoothScrollProvider
            enabled={smoothScrollEnabled}
            disableOnTouch={smoothScrollDisableOnTouch}
          >
            <div className="relative">{children}</div>
          </SmoothScrollProvider>
          <Toaster richColors closeButton position="top-right" />
          <ScrollToTopButton />
        </NextIntlClientProvider>
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
