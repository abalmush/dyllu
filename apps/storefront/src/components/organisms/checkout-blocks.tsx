"use client";

import * as React from "react";
import { Link } from "@/i18n/navigation";
import {
  Banknote,
  Check,
  CreditCard,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

import { cn } from "@lib/utils";
import { Button } from "@/components/atoms/button";

const STEPS = ["Adresă", "Livrare", "Plată", "Confirmare"];

export function CheckoutSteps({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className="flex flex-1 items-center gap-2"
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                done && "bg-success text-background",
                active && "bg-foreground text-background",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check aria-hidden="true" className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {done && <span className="sr-only">Finalizat: </span>}
              {active && <span className="sr-only">Pas curent: </span>}
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="bg-border small:block mx-1 hidden h-px flex-1"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

type ShippingOption = {
  id: string;
  label: string;
  detail: string;
  price: string;
  icon: typeof Truck;
};

const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "standard",
    label: "Livrare standard",
    detail: "24–48h · Chișinău și suburbii",
    price: "Gratuită",
    icon: Truck,
  },
  {
    id: "express",
    label: "Livrare express",
    detail: "În aceeași zi pentru comenzi până la 12:00",
    price: "150 MDL",
    icon: Package,
  },
  {
    id: "pickup",
    label: "Ridicare din magazin",
    detail: "Magazinul DYLLU · gata în 2 ore",
    price: "Gratuită",
    icon: MapPin,
  },
];

export function ShippingMethodPicker() {
  const [selected, setSelected] = React.useState("standard");
  return (
    <section className="clip-corner-cut-lg bg-card ring-border p-6 ring-1">
      <h2 className="font-display text-foreground mb-6 text-lg font-bold">
        Metodă de livrare
      </h2>
      <div className="space-y-4">
        {SHIPPING_OPTIONS.map((option) => {
          const active = selected === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "clip-corner-cut-md flex cursor-pointer items-center gap-4 border p-4 transition-colors",
                active
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/40"
              )}
            >
              <input
                type="radio"
                name="shipping"
                checked={active}
                onChange={() => setSelected(option.id)}
                className="accent-primary size-4"
              />
              <option.icon className="text-primary size-5 shrink-0" />
              <span className="flex-1">
                <span className="text-foreground block text-sm font-semibold">
                  {option.label}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {option.detail}
                </span>
              </span>
              <span className="text-foreground text-sm font-semibold">
                {option.price}
              </span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

const PAYMENT_OPTIONS = [
  {
    id: "maib",
    label: "Card bancar — MAIB",
    detail: "Visa / Mastercard · 3-D Secure",
    icon: CreditCard,
  },
  {
    id: "cod",
    label: "Numerar la livrare",
    detail: "Plătești curierului la primire",
    icon: Banknote,
  },
];

export function PaymentMethodPicker() {
  const [selected, setSelected] = React.useState("maib");
  return (
    <section className="clip-corner-cut-lg bg-card ring-border p-6 ring-1">
      <h2 className="font-display text-foreground mb-6 text-lg font-bold">
        Metodă de plată
      </h2>
      <div className="space-y-4">
        {PAYMENT_OPTIONS.map((option) => {
          const active = selected === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                "clip-corner-cut-md flex cursor-pointer items-center gap-4 border p-4 transition-colors",
                active
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/40"
              )}
            >
              <input
                type="radio"
                name="payment"
                checked={active}
                onChange={() => setSelected(option.id)}
                className="accent-primary size-4"
              />
              <option.icon className="text-primary size-5 shrink-0" />
              <span className="flex-1">
                <span className="text-foreground block text-sm font-semibold">
                  {option.label}
                </span>
                <span className="text-muted-foreground block text-xs">
                  {option.detail}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-muted-foreground mt-4 flex items-center gap-2 text-xs">
        <ShieldCheck className="text-success size-4" />
        Plățile cu cardul sunt procesate securizat prin MAIB. DYLLU nu stochează
        datele cardului.
      </p>
    </section>
  );
}

export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="clip-corner-cut-lg bg-card ring-border flex flex-col items-center gap-4 px-6 py-16 text-center ring-1">
      <span className="bg-success text-background grid size-16 place-items-center rounded-full">
        <Check className="size-8" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="font-display text-foreground text-2xl font-bold">
          Comandă confirmată
        </h2>
        <p className="text-muted-foreground text-sm">
          Îți mulțumim! Comanda{" "}
          <span className="text-foreground font-semibold">#{orderNumber}</span>{" "}
          a fost plasată. Ai primit un email cu detaliile și vei fi notificat la
          expediere.
        </p>
      </div>
      <Button asChild size="lg" className="clip-corner-cut-sm rounded-none">
        <Link href="/account/orders">Vezi comanda</Link>
      </Button>
    </div>
  );
}
