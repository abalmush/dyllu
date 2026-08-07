import { ShieldCheck, Truck } from "lucide-react";
import { HttpTypes } from "@medusajs/types";
import { getTranslations } from "next-intl/server";

import CartItemPreview from "@modules/cart/components/item-preview";
import DiscountCode from "@modules/checkout/components/discount-code";
import CartTotals from "@modules/common/components/cart-totals";
import { hasCheckoutAmountDue } from "@lib/checkout/state";

const CheckoutSummary = async ({
  cart,
}: {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[];
  };
}) => {
  const t = await getTranslations("Checkout.summary");
  const items = cart.items
    ?.slice()
    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1));
  const hasAmountDue = hasCheckoutAmountDue(cart);

  return (
    <aside className="clip-corner-cut-lg clip-shadow-md bg-card ring-border flex flex-col gap-6 p-6 ring-1">
      <div className="space-y-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          {t("eyebrow")}
        </span>
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight text-balance">
          {t("heading")}
        </h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-4 ring-1">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            {t("itemsLabel")}
          </span>
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            {t("itemCount", { count: items?.length ?? 0 })}
          </span>
        </div>
        <ul>
          {items?.map((item) => (
            <CartItemPreview
              key={item.id}
              item={item}
              currencyCode={cart.currency_code}
            />
          ))}
        </ul>
      </div>

      <div className="clip-corner-cut-md bg-background/80 ring-border/70 p-4 ring-1">
        <CartTotals
          totals={cart}
          shippingPending={(cart.shipping_methods?.length ?? 0) === 0}
        />
      </div>

      <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-4 ring-1">
        <DiscountCode cart={cart} />
      </div>

      <ul className="clip-corner-cut-md bg-surface-subtle/60 text-muted-foreground ring-border/70 flex flex-col gap-4 p-4 text-xs ring-1">
        <li className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="text-success size-3.5" />
          {hasAmountDue ? t("amountDueNote") : t("amountPaidNote")}
        </li>
        <li className="flex items-center gap-2">
          <Truck aria-hidden="true" className="text-primary size-3.5" />
          {t("shippingNote")}
        </li>
      </ul>
    </aside>
  );
};

export default CheckoutSummary;
