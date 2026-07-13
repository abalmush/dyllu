import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";

import { getBaseURL } from "@lib/util/env";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_SOCIAL_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
} from "@/lib/seo/metadata";
import { SmoothScrollProvider } from "@/components/atoms/smooth-scroll-provider";
import { Toaster } from "@/components/atoms/sonner";

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

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: "%s · DYLLU",
  },
  description: DEFAULT_DESCRIPTION,
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    siteName: SITE_NAME,
    locale: "ro_MD",
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

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="ro"
      data-mode="light"
      className={`${inter.variable} ${sora.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <a className="skip-link" href="#main-content">
          Sari la conținut
        </a>
        <SmoothScrollProvider
          enabled={smoothScrollEnabled}
          disableOnTouch={smoothScrollDisableOnTouch}
        >
          <div className="relative">{props.children}</div>
        </SmoothScrollProvider>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
