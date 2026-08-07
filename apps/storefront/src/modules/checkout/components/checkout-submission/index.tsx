"use client";

import { Link } from "@/i18n/navigation";
import { PackageCheck } from "lucide-react";
import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/atoms/button";
import { placeOrder, type CheckoutActionState } from "@lib/data/cart";
import ErrorMessage from "../error-message";

const INITIAL_STATE: CheckoutActionState = { error: null };

export default function CheckoutSubmission({
  details,
  summary,
  hasAmountDue,
}: {
  details: ReactNode;
  summary: ReactNode;
  hasAmountDue: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    placeOrder,
    INITIAL_STATE
  );

  return (
    <div className="small:grid-cols-[minmax(0,1fr)_380px] small:gap-12 grid grid-cols-1 gap-8">
      <form action={formAction} className="contents">
        <div className="small:col-start-1 small:row-start-1">{details}</div>
        <section className="clip-corner-cut-lg clip-shadow-md bg-card ring-border small:col-start-1 small:row-start-2 row-start-3 p-6 ring-1">
          <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
            Prin plasarea comenzii accepți{" "}
            <Link
              href="/termeni"
              className="text-foreground focus-visible:ring-ring underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              termenii de vânzare
            </Link>
            ,{" "}
            <Link
              href="/returnari"
              className="text-foreground focus-visible:ring-ring underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              politica de retur
            </Link>{" "}
            și{" "}
            <Link
              href="/confidentialitate"
              className="text-foreground focus-visible:ring-ring underline underline-offset-4 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              politica de confidențialitate
            </Link>
            .
          </p>
          <Button
            type="submit"
            size="xl"
            isLoading={isPending}
            className="clip-corner-cut-sm w-full rounded-none"
            data-testid="submit-order-button"
          >
            <PackageCheck aria-hidden="true" className="size-5" />
            {isPending ? "Plasăm comanda…" : "Plasează comanda"}
          </Button>
          <ErrorMessage error={state.error} data-testid="order-error-message" />
          <p className="text-muted-foreground mt-3 text-center text-xs leading-relaxed">
            {hasAmountDue
              ? "Livrarea standard și plata la livrare se aplică automat."
              : "Livrarea standard se aplică automat. Totalul produselor este acoperit integral."}
          </p>
        </section>
      </form>

      <div className="small:sticky small:top-28 small:col-start-2 small:row-span-2 small:row-start-1 small:self-start row-start-2">
        {summary}
      </div>
    </div>
  );
}
