"use client";

import { HttpTypes } from "@medusajs/types";

import Item from "@modules/cart/components/item";

const ReviewItems = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const items = cart.items
    ?.slice()
    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1));

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card p-6 ring-1 ring-border small:p-8">
      <div className="mb-6 space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Produse
        </span>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            Produse în comandă
          </h2>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {items?.length ?? 0} {items?.length === 1 ? "produs" : "produse"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Verifică încă o dată produsele, cantitățile și prețurile înainte să
          plasezi comanda.
        </p>
      </div>

      <div className="clip-corner-cut-md bg-surface-subtle/60 p-5 ring-1 ring-border/70">
        <ul>
          {items?.map((item) => (
            <Item
              key={item.id}
              item={item}
              type="preview"
              currencyCode={cart.currency_code}
            />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ReviewItems;
