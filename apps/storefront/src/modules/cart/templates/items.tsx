import { HttpTypes } from "@medusajs/types";

import repeat from "@lib/util/repeat";
import Item from "@modules/cart/components/item";
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item";

type Props = {
  cart?: HttpTypes.StoreCart;
};

export default function ItemsTemplate({ cart }: Props) {
  const items = cart?.items;
  return (
    <section className="rounded-2xl border border-border bg-card p-2 small:p-4">
      <header className="flex items-baseline justify-between border-b border-border px-4 pb-3 pt-3">
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          Produsele tale
        </h2>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {items?.length ?? 0} {items?.length === 1 ? "produs" : "produse"}
        </span>
      </header>
      <ul className="px-4">
        {items
          ? items
              .slice()
              .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
              .map((item) => (
                <Item
                  key={item.id}
                  item={item}
                  currencyCode={cart?.currency_code ?? "mdl"}
                />
              ))
          : repeat(3).map((i) => <SkeletonLineItem key={i} />)}
      </ul>
    </section>
  );
}
