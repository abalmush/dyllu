import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";

import { getBaseURL } from "@lib/util/env";
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
  title: {
    default: "DYLLU — Scule și echipamente profesionale",
    template: "%s · DYLLU",
  },
  description:
    "Scule manuale, electrice, echipamente de protecție și grădinărit pentru profesioniști și pasionați. Livrare rapidă în Moldova.",
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="ro"
      data-mode="light"
      className={`${inter.variable} ${sora.variable}`}
    >
      <body className="bg-background text-foreground antialiased">
        <SmoothScrollProvider
          enabled={smoothScrollEnabled}
          disableOnTouch={smoothScrollDisableOnTouch}
        >
          <main className="relative">{props.children}</main>
        </SmoothScrollProvider>
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
