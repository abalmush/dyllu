import { ShieldCheck, Truck } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { CheckoutStepKey } from "@modules/checkout/lib/presentation";
import Item from "@modules/cart/components/item";
import DiscountCode from "@modules/checkout/components/discount-code";
import CartTotals from "@modules/common/components/cart-totals";

const CheckoutSummary = ({
  cart,
  activeStep,
}: {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[];
  };
  activeStep: CheckoutStepKey;
}) => {
  const items = cart.items
    ?.slice()
    .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1));
  const isReview =
    activeStep === "review" && (cart.shipping_methods?.length ?? 0) > 0;

  return (
    <aside className="clip-corner-cut-lg clip-shadow-md sticky top-28 flex flex-col gap-6 bg-card p-6 ring-1 ring-border">
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Comandă DYLLU
        </span>
        <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
          {isReview ? "Sumar final" : "Comanda ta"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isReview
            ? "Revizuiește totalurile finale și aplică un cod promoțional dacă este cazul."
            : "Verifică produsele și totalurile înainte să plasezi comanda."}
        </p>
      </div>

      {!isReview && (
        <div className="clip-corner-cut-md bg-surface-subtle/60 p-4 ring-1 ring-border/70">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Produse în comandă
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {items?.length ?? 0} {items?.length === 1 ? "produs" : "produse"}
            </span>
          </div>
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
      )}

      <div className="clip-corner-cut-md bg-background/80 p-4 ring-1 ring-border/70">
        <CartTotals totals={cart} />
      </div>

      <div className="clip-corner-cut-md bg-surface-subtle/60 p-4 ring-1 ring-border/70">
        <DiscountCode cart={cart} />
      </div>

      <ul className="clip-corner-cut-md flex flex-col gap-3 bg-surface-subtle/60 p-4 text-xs text-muted-foreground ring-1 ring-border/70">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-success" />
          Detaliile de plată se confirmă împreună cu echipa DYLLU
        </li>
        <li className="flex items-center gap-2">
          <Truck className="size-3.5 text-primary" />
          Livrare în toată Moldova · costul final se confirmă la pasul de
          livrare
        </li>
      </ul>
    </aside>
  );
};

export default CheckoutSummary;
