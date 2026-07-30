"use client";

import * as React from "react";
import type { HttpTypes } from "@medusajs/types";
import type { CartView } from "@lib/cart/cart-view";

export type OptimisticCartItem = {
  variantId: string;
  productHandle: string;
  title: string;
  variantTitle?: string;
  thumbnail?: string;
  quantity: number;
  unitPrice: number;
  currencyCode: string;
};

export type CartContextValue = {
  cart: CartView | null;
  isBootstrapping: boolean;
  isMutating: boolean;
  isOpen: boolean;
  // Full-fidelity data for widgets CartView can't serve (mismatch banner,
  // free-shipping nudge). Populated once the commerce-shell bootstrap
  // request resolves; null/empty until then.
  rawCart: HttpTypes.StoreCart | null;
  authenticated: boolean;
  shippingOptions: HttpTypes.StoreCartShippingOption[];
  openCart(): void;
  closeCart(): void;
  addItem(
    input: { variantId: string; quantity: number },
    optimistic: OptimisticCartItem
  ): Promise<void>;
  addItems(
    input: { items: Array<{ variantId: string; quantity: number }> },
    optimistic: OptimisticCartItem[]
  ): Promise<void>;
  updateItem(lineId: string, quantity: number): Promise<void>;
  removeItem(lineId: string): Promise<void>;
};

export const CartContext = React.createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
