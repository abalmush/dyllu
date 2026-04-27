import React from "react";
import { CreditCard } from "@medusajs/icons";

import PayPal from "@modules/common/icons/paypal";

/* Map of payment provider_id to title and icon. Add new providers here. */
export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Manual Payment",
    icon: <CreditCard />,
  },
  // MAIB (Moldova Agroindbank) Checkout — registered later when the custom
  // Medusa payment provider is implemented. Provider id will be e.g. pp_maib_default.
  // pp_maib_default: { title: "Card (MAIB)", icon: <CreditCard /> },
};

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal");
};

export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default");
};

// Currencies that are NOT divided by 100 when rendering.
export const noDivisionCurrencies = [
  "krw",
  "jpy",
  "vnd",
  "clp",
  "pyg",
  "xaf",
  "xof",
  "bif",
  "djf",
  "gnf",
  "kmf",
  "mga",
  "rwf",
  "xpf",
  "htg",
  "vuv",
  "xag",
  "xdr",
  "xau",
];
