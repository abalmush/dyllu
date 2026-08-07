"use client";

import * as React from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { convertToLocale } from "@lib/util/money";
import { useCart } from "@lib/cart/cart-context";
import { Button } from "@/components/atoms/button";
import { ScrollArea } from "@/components/atoms/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet";
import { Separator } from "@/components/atoms/separator";
import { IconButton } from "@/components/atoms/icon-button";

type Props = {
  trigger?: React.ReactNode;
};

export function CartDrawer({ trigger }: Props) {
  const { cart, isOpen, openCart, closeCart, removeItem } = useCart();
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const totalItems = cart?.totalQuantity ?? 0;
  const subtotal = cart?.subtotal ?? 0;
  const currencyCode = cart?.currencyCode ?? "mdl";

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeItem(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(next) => (next ? openCart() : closeCart())}
    >
      <SheetTrigger asChild>
        {trigger ?? (
          <IconButton label="Deschide coșul" variant="outline" size="md">
            <div className="relative">
              <ShoppingBag className="size-5" />
              {totalItems > 0 && (
                <span className="bg-primary text-2xs text-primary-foreground absolute -top-2 -right-2 grid size-5 place-items-center rounded-full font-bold">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </div>
          </IconButton>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full max-w-md flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-border border-b px-6 py-6">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="text-primary size-4" />
            Coșul tău · {totalItems} {totalItems === 1 ? "produs" : "produse"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Produsele adăugate în coș, subtotalul și acțiunile de finalizare a
            comenzii.
          </SheetDescription>
        </SheetHeader>

        {cart?.items && cart.items.length > 0 ? (
          <>
            <ScrollArea className="flex-1">
              <ul className="divide-border divide-y">
                {cart.items
                  .slice()
                  .reverse()
                  .map((item) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[88px_1fr] gap-4 px-6 py-6"
                      data-testid="cart-item"
                    >
                      <Link
                        href={`/products/${item.productHandle}`}
                        onClick={closeCart}
                        className="group bg-surface-subtle relative aspect-square overflow-hidden rounded-lg"
                      >
                        {item.thumbnail ? (
                          <Image
                            src={item.thumbnail}
                            alt={item.title}
                            fill
                            sizes="88px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : null}
                      </Link>
                      <div className="flex min-w-0 flex-col gap-1">
                        <Link
                          href={`/products/${item.productHandle}`}
                          onClick={closeCart}
                          className="text-foreground hover:text-primary line-clamp-2 text-sm font-semibold tracking-tight"
                          data-testid="product-link"
                        >
                          {item.title}
                        </Link>
                        {item.variantTitle && (
                          <p className="text-muted-foreground text-xs">
                            {item.variantTitle}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between">
                          <span
                            className="text-muted-foreground text-xs"
                            data-testid="cart-item-quantity"
                            data-value={item.quantity}
                          >
                            Cantitate · {item.quantity}
                          </span>
                          <div className="flex items-center gap-4">
                            <span className="text-foreground text-sm font-semibold">
                              {convertToLocale({
                                amount: item.total ?? 0,
                                currency_code: currencyCode,
                              })}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              disabled={deletingId === item.id}
                              aria-label="Șterge produsul"
                              data-testid="cart-item-remove-button"
                              className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </ScrollArea>
            <div className="border-border bg-surface-subtle border-t px-6 py-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal <span className="text-xs">(fără livrare)</span>
                </span>
                <span
                  className="text-foreground text-base font-bold tracking-tight"
                  data-testid="cart-subtotal"
                  data-value={subtotal}
                >
                  {convertToLocale({
                    amount: subtotal,
                    currency_code: currencyCode,
                  })}
                </span>
              </div>
              <Separator className="my-4" />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className={cn("flex-1")}
                >
                  <Link href="/cart" onClick={closeCart}>
                    Vezi coșul
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="flex-1"
                  data-testid="go-to-cart-button"
                >
                  <Link href="/checkout" onClick={closeCart}>
                    Finalizează
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="bg-muted text-muted-foreground grid size-16 place-items-center rounded-full">
              <ShoppingBag className="size-7" />
            </div>
            <div>
              <p className="text-foreground font-semibold">Coșul este gol</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Descoperă scule, echipamente și accesorii pentru orice proiect.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/store" onClick={closeCart}>
                Explorează produsele
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
