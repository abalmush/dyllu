"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  addItemsToCart,
  addToCart,
  deleteLineItem,
  updateLineItem,
} from "@lib/data/cart";
import type { HttpTypes } from "@medusajs/types";
import type { CartView, CartViewItem } from "@lib/cart/cart-view";
import { toCartView } from "@lib/cart/cart-view.mapper";
import {
  CartContext,
  type CartContextValue,
  type OptimisticCartItem,
} from "@lib/cart/cart-context";
import type { CommerceShellResponse } from "@/app/api/commerce-shell/route";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartView | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMutating, setIsMutating] = React.useState(false);
  const [isBootstrapping, setIsBootstrapping] = React.useState(true);
  const [rawCart, setRawCart] = React.useState<HttpTypes.StoreCart | null>(
    null
  );
  const [authenticated, setAuthenticated] = React.useState(false);
  const [shippingOptions, setShippingOptions] = React.useState<
    HttpTypes.StoreCartShippingOption[]
  >([]);

  const authoritativeRef = React.useRef<CartView | null>(null);
  const inFlightPatchesRef = React.useRef<Map<symbol, Patch>>(new Map());
  const mutationQueueRef = React.useRef<Promise<unknown>>(Promise.resolve());

  const recompute = React.useCallback(() => {
    let next = authoritativeRef.current;
    for (const patch of inFlightPatchesRef.current.values()) {
      next = patch(next);
    }
    setCart(next);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/commerce-shell", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("commerce-shell request failed");
        return response.json() as Promise<CommerceShellResponse>;
      })
      .then((shell) => {
        if (cancelled) return;
        setRawCart(shell.cart);
        setAuthenticated(shell.authenticated);
        setShippingOptions(shell.shippingOptions);

        // Don't clobber a cart already established by an add that
        // completed while bootstrap was still in flight.
        if (
          authoritativeRef.current === null &&
          inFlightPatchesRef.current.size === 0
        ) {
          authoritativeRef.current = shell.cart ? toCartView(shell.cart) : null;
          recompute();
        }
      })
      .catch(() => {
        // Public navigation must stay usable when the commerce endpoint is
        // slow or unavailable; cart state simply stays empty until an add
        // action establishes it directly.
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });

    return () => {
      cancelled = true;
    };
  }, [recompute]);

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
      isBootstrapping,
      isMutating,
      isOpen,
      rawCart,
      authenticated,
      shippingOptions,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem,
      addItems,
      updateItem,
      removeItem,
    }),
    [
      cart,
      isBootstrapping,
      isMutating,
      isOpen,
      rawCart,
      authenticated,
      shippingOptions,
      addItem,
      addItems,
      updateItem,
      removeItem,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
