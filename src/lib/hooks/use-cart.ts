import { create } from "zustand";
import { persist } from "zustand/middleware";
import { storefront } from "@/lib/shopify/client";
import {
  CREATE_CART_MUTATION,
  ADD_TO_CART_MUTATION,
} from "@/lib/shopify/queries";

interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    price: { amount: string; currencyCode: string };
    product: {
      title: string;
      handle: string;
      images: { edges: { node: { url: string; altText: string | null } }[] };
    };
  };
}

interface CartState {
  cartId: string | null;
  checkoutUrl: string | null;
  lines: CartLine[];
  totalAmount: string;
  currencyCode: string;
  isLoading: boolean;
  addToCart: (variantId: string, quantity?: number) => Promise<void>;
}

function extractCart(cart: Record<string, unknown>) {
  const c = cart as {
    id: string;
    checkoutUrl: string;
    lines: { edges: { node: CartLine }[] };
    cost: {
      totalAmount: { amount: string; currencyCode: string };
    };
  };
  return {
    cartId: c.id,
    checkoutUrl: c.checkoutUrl,
    lines: c.lines.edges.map((e) => e.node),
    totalAmount: c.cost.totalAmount.amount,
    currencyCode: c.cost.totalAmount.currencyCode,
  };
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      cartId: null,
      checkoutUrl: null,
      lines: [],
      totalAmount: "0",
      currencyCode: "USD",
      isLoading: false,

      addToCart: async (variantId: string, quantity = 1) => {
        set({ isLoading: true });
        const { cartId } = get();

        try {
          if (!cartId) {
            const { data } = await storefront.request(CREATE_CART_MUTATION, {
              variables: {
                input: { lines: [{ merchandiseId: variantId, quantity }] },
              },
            });
            const cart = data?.cartCreate?.cart;
            if (cart) set({ ...extractCart(cart), isLoading: false });
          } else {
            const { data } = await storefront.request(ADD_TO_CART_MUTATION, {
              variables: {
                cartId,
                lines: [{ merchandiseId: variantId, quantity }],
              },
            });
            const cart = data?.cartLinesAdd?.cart;
            if (cart) set({ ...extractCart(cart), isLoading: false });
          }
        } catch (error) {
          console.error("Failed to add to cart:", error);
          set({ isLoading: false });
        }
      },
    }),
    { name: "dyllu-cart" }
  )
);
