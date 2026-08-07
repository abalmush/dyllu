import { Metadata } from "next";

import { getCategoryTree } from "@lib/data/categories";
import { getBaseURL } from "@lib/util/env";

import { CartProvider } from "@/components/providers/cart-provider";
import { CommerceShellWidgets } from "@/components/providers/commerce-shell-widgets";
import { AnnouncementBar } from "@/components/organisms/announcement-bar";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SiteHeader } from "@/components/organisms/site-header";
import { UtilityBar } from "@/components/organisms/utility-bar";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
};

export default async function PageLayout(props: { children: React.ReactNode }) {
  const categories = await getCategoryTree();

  return (
    <CartProvider>
      <div className="bg-background flex min-h-screen flex-col">
        <AnnouncementBar />
        <UtilityBar />
        <SiteHeader categories={categories} />
        <CommerceShellWidgets />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-hidden">
          {props.children}
        </main>
        <SiteFooter categories={categories} />
      </div>
    </CartProvider>
  );
}
