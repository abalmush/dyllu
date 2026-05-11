"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Trash2, ArrowRight } from "lucide-react";

import { cn } from "@lib/utils";
import { convertToLocale } from "@lib/util/money";
import { deleteLineItem } from "@lib/data/cart";
import { HttpTypes } from "@medusajs/types";
import { Button } from "@/components/atoms/button";
import { ScrollArea } from "@/components/atoms/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/atoms/sheet";
import { Separator } from "@/components/atoms/separator";
import { IconButton } from "@/components/atoms/icon-button";

type Props = {
  cart: HttpTypes.StoreCart | null;
  trigger?: React.ReactNode;
};

export function CartDrawer({ cart, trigger }: Props) {
  const [open, setOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const pathname = usePathname();
  const previousCount = React.useRef<number | null>(null);
  const totalItems =
    cart?.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0;

  React.useEffect(() => {
    if (
      previousCount.current !== null &&
      previousCount.current < totalItems &&
      !pathname.includes("/cart")
    ) {
      setOpen(true);
    }
    previousCount.current = totalItems;
  }, [totalItems, pathname]);

  const subtotal = cart?.subtotal ?? 0;
  const currencyCode = cart?.currency_code ?? "mdl";

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteLineItem(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <IconButton label="Deschide coșul" variant="outline" size="md">
            <div className="relative">
              <ShoppingBag className="size-5" />
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </div>
          </IconButton>
        )}
      </SheetTrigger>
      <SheetContent className="flex w-full max-w-md flex-col p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border px-6 py-5">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="size-4 text-primary" />
            Coșul tău · {totalItems} {totalItems === 1 ? "produs" : "produse"}
          </SheetTitle>
        </SheetHeader>

        {cart?.items && cart.items.length > 0 ? (
          <>
            <ScrollArea className="flex-1">
              <ul className="divide-y divide-border">
                {cart.items
                  .slice()
                  .sort((a, b) =>
                    (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                  )
                  .map((item) => (
                    <li
                      key={item.id}
                      className="grid grid-cols-[88px_1fr] gap-4 px-6 py-5"
                      data-testid="cart-item"
                    >
                      <Link
                        href={`/products/${item.product_handle}`}
                        onClick={() => setOpen(false)}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-surface-subtle"
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
                          href={`/products/${item.product_handle}`}
                          onClick={() => setOpen(false)}
                          className="line-clamp-2 text-sm font-semibold tracking-tight text-foreground hover:text-primary"
                          data-testid="product-link"
                        >
                          {item.title}
                        </Link>
                        {item.variant?.title && (
                          <p className="text-xs text-muted-foreground">
                            {item.variant.title}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between">
                          <span
                            className="text-xs text-muted-foreground"
                            data-testid="cart-item-quantity"
                            data-value={item.quantity}
                          >
                            Cantitate · {item.quantity}
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-foreground">
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
                              className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
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
            <div className="border-t border-border bg-surface-subtle px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Subtotal{" "}
                  <span className="text-xs">(fără TVA)</span>
                </span>
                <span
                  className="text-base font-bold tracking-tight text-foreground"
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
                  <Link href="/cart" onClick={() => setOpen(false)}>
                    Vezi coșul
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="flex-1"
                  data-testid="go-to-cart-button"
                >
                  <Link
                    href="/checkout?step=address"
                    onClick={() => setOpen(false)}
                  >
                    Finalizează
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="grid size-16 place-items-center rounded-full bg-muted text-muted-foreground">
              <ShoppingBag className="size-7" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Coșul este gol</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Descoperă scule, echipamente și accesorii pentru orice proiect.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/store" onClick={() => setOpen(false)}>
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
