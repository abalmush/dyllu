import { HttpTypes } from "@medusajs/types";
import type { CartView } from "@lib/cart/cart-view";

export function toCartView(cart: HttpTypes.StoreCart): CartView {
  const items = (cart.items ?? []).flatMap((item) => {
    if (!item.variant_id || !item.product_handle) return [];

    return [
      {
        id: item.id,
        variantId: item.variant_id,
        productHandle: item.product_handle,
        title: item.product_title ?? item.title,
        variantTitle: item.variant_title ?? item.variant?.title ?? undefined,
        thumbnail: item.thumbnail ?? undefined,
        quantity: item.quantity,
        total: item.total ?? 0,
      },
    ];
  });

  return {
    id: cart.id,
    currencyCode: cart.currency_code,
    itemTotal: cart.item_total ?? 0,
    subtotal: cart.subtotal ?? 0,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  };
}
