import { Metadata } from "next";

import { listCartOptions, retrieveCart } from "@lib/data/cart";
import { getCategoryTree } from "@lib/data/categories";
import { retrieveCustomer } from "@lib/data/customer";
import { getBaseURL } from "@lib/util/env";
import { StoreCartShippingOption } from "@medusajs/types";

import { AnnouncementBar } from "@/components/organisms/announcement-bar";
import { SiteFooter } from "@/components/organisms/site-footer";
import { SiteHeader } from "@/components/organisms/site-header";
import { UtilityBar } from "@/components/organisms/utility-bar";

import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner";
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge";

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
};

export default async function PageLayout(props: { children: React.ReactNode }) {
  const [customer, cart, categories] = await Promise.all([
    retrieveCustomer(),
    retrieveCart(),
    getCategoryTree(),
  ]);
  let shippingOptions: StoreCartShippingOption[] = [];

  if (cart) {
    const { shipping_options } = await listCartOptions();
    shippingOptions = shipping_options;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AnnouncementBar />
      <UtilityBar />
      <SiteHeader cart={cart} categories={categories} />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}
      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {props.children}
      </main>
      <SiteFooter />
    </div>
  );
}
