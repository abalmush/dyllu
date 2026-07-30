"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  addItemsToCart,
  addToCart,
  deleteLineItem,
  updateLineItem,
} from "@lib/data/cart";
import type { CartView, CartViewItem } from "@lib/cart/cart-view";
import {
  CartContext,
  type CartContextValue,
  type OptimisticCartItem,
} from "@lib/cart/cart-context";

type Patch = (cart: CartView | null) => CartView | null;

function applyOptimisticAdd(
  cart: CartView | null,
  item: OptimisticCartItem
): CartView {
  const base: CartView = cart ?? {
    id: "pending",
    currencyCode: item.currencyCode,
    itemTotal: 0,
    subtotal: 0,
    totalQuantity: 0,
    items: [],
  };

  const addedTotal = item.unitPrice * item.quantity;
  const existing = base.items.find((line) => line.variantId === item.variantId);

  const items: CartViewItem[] = existing
    ? base.items.map((line) =>
        line.variantId === item.variantId
          ? {
              ...line,
              quantity: line.quantity + item.quantity,
              total: line.total + addedTotal,
            }
          : line
      )
    : [
        ...base.items,
        {
          id: `pending-${crypto.randomUUID()}`,
          variantId: item.variantId,
          productHandle: item.productHandle,
          title: item.title,
          variantTitle: item.variantTitle,
          thumbnail: item.thumbnail,
          quantity: item.quantity,
          total: addedTotal,
        },
      ];

  return {
    ...base,
    items,
    totalQuantity: base.totalQuantity + item.quantity,
    itemTotal: base.itemTotal + addedTotal,
    subtotal: base.subtotal + addedTotal,
  };
}

function applyOptimisticUpdate(
  cart: CartView | null,
  lineId: string,
  quantity: number
): CartView | null {
  if (!cart) return cart;
  const target = cart.items.find((line) => line.id === lineId);
  if (!target) return cart;

  const unitPrice = target.quantity > 0 ? target.total / target.quantity : 0;
  const nextTotal = Math.round(unitPrice * quantity);
  const totalDelta = nextTotal - target.total;
  const quantityDelta = quantity - target.quantity;

  return {
    ...cart,
    items: cart.items.map((line) =>
      line.id === lineId ? { ...line, quantity, total: nextTotal } : line
    ),
    totalQuantity: cart.totalQuantity + quantityDelta,
    itemTotal: cart.itemTotal + totalDelta,
    subtotal: cart.subtotal + totalDelta,
  };
}

function applyOptimisticRemove(
  cart: CartView | null,
  lineId: string
): CartView | null {
  if (!cart) return cart;
  const removed = cart.items.find((line) => line.id === lineId);
  if (!removed) return cart;

  return {
    ...cart,
    items: cart.items.filter((line) => line.id !== lineId),
    totalQuantity: cart.totalQuantity - removed.quantity,
    itemTotal: cart.itemTotal - removed.total,
    subtotal: cart.subtotal - removed.total,
  };
}

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: CartView | null;
  children: React.ReactNode;
}) {
  const [cart, setCart] = React.useState<CartView | null>(initialCart);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMutating, setIsMutating] = React.useState(false);

  const authoritativeRef = React.useRef<CartView | null>(initialCart);
  const inFlightPatchesRef = React.useRef<Map<symbol, Patch>>(new Map());
  const mutationQueueRef = React.useRef<Promise<unknown>>(Promise.resolve());

  const recompute = React.useCallback(() => {
    let next = authoritativeRef.current;
    for (const patch of inFlightPatchesRef.current.values()) {
      next = patch(next);
    }
    setCart(next);
  }, []);

  const runMutation = React.useCallback(
    (patch: Patch, mutate: () => Promise<CartView>, errorMessage: string) => {
      const token = Symbol();
      inFlightPatchesRef.current.set(token, patch);
      recompute();
      setIsMutating(true);

      const task = mutationQueueRef.current
        .catch(() => {})
        .then(async () => {
          try {
            authoritativeRef.current = await mutate();
          } catch (error) {
            toast.error(error instanceof Error ? error.message : errorMessage);
          } finally {
            inFlightPatchesRef.current.delete(token);
            recompute();
            setIsMutating(inFlightPatchesRef.current.size > 0);
          }
        });

      mutationQueueRef.current = task;
      return task;
    },
    [recompute]
  );

  const addItem = React.useCallback<CartContextValue["addItem"]>(
    async (input, optimistic) => {
      setIsOpen(true);
      await runMutation(
        (current) => applyOptimisticAdd(current, optimistic),
        () => addToCart(input),
        "Nu am reușit să adăugăm produsul în coș."
      );
    },
    [runMutation]
  );

  const addItems = React.useCallback<CartContextValue["addItems"]>(
    async (input, optimisticItems) => {
      setIsOpen(true);
      await runMutation(
        (current) =>
          optimisticItems.reduce<CartView | null>(
            (acc, item) => applyOptimisticAdd(acc, item),
            current
          ),
        () => addItemsToCart(input),
        "Nu am reușit să adăugăm produsele în coș."
      );
    },
    [runMutation]
  );

  const updateItem = React.useCallback<CartContextValue["updateItem"]>(
    async (lineId, quantity) => {
      await runMutation(
        (current) => applyOptimisticUpdate(current, lineId, quantity),
        () => updateLineItem({ lineId, quantity }),
        "Nu am reușit să actualizăm cantitatea."
      );
    },
    [runMutation]
  );

  const removeItem = React.useCallback<CartContextValue["removeItem"]>(
    async (lineId) => {
      await runMutation(
        (current) => applyOptimisticRemove(current, lineId),
        () => deleteLineItem(lineId),
        "Nu am reușit să ștergem produsul."
      );
    },
    [runMutation]
  );

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      isBootstrapping: false,
      isMutating,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      addItems,
      updateItem,
      removeItem,
    }),
    [cart, isMutating, isOpen, addItem, addItems, updateItem, removeItem]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
