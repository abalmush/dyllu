"use client";

import { useCart } from "@lib/cart/cart-context";
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner";
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge";

// Non-critical, private-data widgets driven by the commerce-shell bootstrap
// fetch instead of the shared public layout, so they never block or make
// the shared shell dynamic. They simply render once bootstrap resolves.
export function CommerceShellWidgets() {
  const { rawCart, authenticated, shippingOptions } = useCart();

  if (!rawCart) return null;

  return (
    <>
      {authenticated && (
        <CartMismatchBanner authenticated={authenticated} cart={rawCart} />
      )}
      <FreeShippingPriceNudge
        variant="popup"
        cart={rawCart}
        shippingOptions={shippingOptions}
      />
    </>
  );
}
