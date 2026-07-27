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
    <aside className="clip-corner-cut-lg clip-shadow-md bg-card ring-border sticky top-28 flex flex-col gap-6 p-6 ring-1">
      <div className="space-y-2">
        <span className="text-muted-foreground text-xs font-semibold tracking-[0.16em] uppercase">
          Comandă DYLLU
        </span>
        <h2 className="font-display text-foreground text-xl font-bold tracking-tight">
          {isReview ? "Sumar final" : "Comanda ta"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {isReview
            ? "Revizuiește totalurile finale și aplică un cod promoțional dacă este cazul."
            : "Verifică produsele și totalurile înainte să plasezi comanda."}
        </p>
      </div>

      <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-4 ring-1">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
            Produse în comandă
          </span>
          <span className="text-muted-foreground text-xs font-semibold tracking-[0.18em] uppercase">
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

      <div className="clip-corner-cut-md bg-background/80 ring-border/70 p-4 ring-1">
        <CartTotals totals={cart} />
      </div>

      <div className="clip-corner-cut-md bg-surface-subtle/60 ring-border/70 p-4 ring-1">
        <DiscountCode cart={cart} />
      </div>

      <ul className="clip-corner-cut-md bg-surface-subtle/60 text-muted-foreground ring-border/70 flex flex-col gap-4 p-4 text-xs ring-1">
        <li className="flex items-center gap-2">
          <ShieldCheck className="text-success size-3.5" />
          Detaliile de plată se confirmă împreună cu echipa DYLLU
        </li>
        <li className="flex items-center gap-2">
          <Truck className="text-primary size-3.5" />
          Livrare în toată Moldova · costul final se confirmă la pasul de
          livrare
        </li>
      </ul>
    </aside>
  );
};

export default CheckoutSummary;
