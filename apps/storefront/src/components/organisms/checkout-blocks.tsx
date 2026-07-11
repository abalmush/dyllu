"use client";

import * as React from "react";
import Link from "next/link";
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
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
                done && "bg-success text-background",
                active && "bg-foreground text-background",
                !done && !active && "bg-muted text-muted-foreground"
              )}
            >
              {done ? <Check className="size-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm font-medium",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 hidden h-px flex-1 bg-border small:block" />
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
    <section className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border">
      <h2 className="mb-5 font-display text-lg font-bold text-foreground">
        Metodă de livrare
      </h2>
      <div className="space-y-3">
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
                className="size-4 accent-primary"
              />
              <option.icon className="size-5 shrink-0 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.detail}
                </span>
              </span>
              <span className="text-sm font-semibold text-foreground">
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
    <section className="clip-corner-cut-lg bg-card p-6 ring-1 ring-border">
      <h2 className="mb-5 font-display text-lg font-bold text-foreground">
        Metodă de plată
      </h2>
      <div className="space-y-3">
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
                className="size-4 accent-primary"
              />
              <option.icon className="size-5 shrink-0 text-primary" />
              <span className="flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {option.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {option.detail}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-success" />
        Plățile cu cardul sunt procesate securizat prin MAIB. DYLLU nu stochează
        datele cardului.
      </p>
    </section>
  );
}

export function OrderConfirmation({ orderNumber }: { orderNumber: string }) {
  return (
    <div className="clip-corner-cut-lg flex flex-col items-center gap-4 bg-card px-6 py-16 text-center ring-1 ring-border">
      <span className="grid size-16 place-items-center rounded-full bg-success text-background">
        <Check className="size-8" />
      </span>
      <div className="max-w-md space-y-1.5">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Comandă confirmată
        </h2>
        <p className="text-sm text-muted-foreground">
          Îți mulțumim! Comanda{" "}
          <span className="font-semibold text-foreground">#{orderNumber}</span>{" "}
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
