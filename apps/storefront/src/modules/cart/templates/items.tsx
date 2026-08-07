import { HttpTypes } from "@medusajs/types";
import { getTranslations } from "next-intl/server";

import repeat from "@lib/util/repeat";
import Item from "@modules/cart/components/item";
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item";

type Props = {
  cart?: HttpTypes.StoreCart;
};

export default async function ItemsTemplate({ cart }: Props) {
  const t = await getTranslations("Cart");
  const items = cart?.items;
  const itemCount = items?.length ?? 0;

  return (
    <section className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:p-4 p-4 ring-1">
      <header className="border-border flex flex-wrap items-baseline justify-between gap-4 border-b px-4 pt-4 pb-4">
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight">
          {t("itemsHeading")}
        </h2>
        <span className="clip-corner-cut-xs bg-surface-subtle text-muted-foreground px-4 py-1 text-xs font-semibold tracking-[0.16em] uppercase">
          {itemCount} {t("itemCount", { count: itemCount })}
        </span>
      </header>
      <ul className="px-4">
        {items
          ? items
              .slice()
              .sort((a, b) =>
                (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
              )
              .map((item) => (
                <Item
                  key={`${item.id}:${item.quantity}`}
                  item={item}
                  currencyCode={cart?.currency_code ?? "mdl"}
                />
              ))
          : repeat(3).map((i) => <SkeletonLineItem key={i} />)}
      </ul>
    </section>
  );
}
