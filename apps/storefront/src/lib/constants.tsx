import React from "react";
import { CreditCard } from "@medusajs/icons";

import PayPal from "@modules/common/icons/paypal";

export const paymentInfoMap: Record<
  string,
  { title: string; icon: React.JSX.Element }
> = {
  pp_paypal_paypal: {
    title: "PayPal",
    icon: <PayPal />,
  },
  pp_system_default: {
    title: "Plată confirmată la procesare",
    icon: <CreditCard />,
  },
};

export const isPaypal = (providerId?: string) => {
  return providerId?.startsWith("pp_paypal");
};

export const isManual = (providerId?: string) => {
  return providerId?.startsWith("pp_system_default");
};

export const MD_POSTAL_CODE_PATTERN = "(MD[\\s-]?)?\\d{4}";
export const MD_POSTAL_CODE_TITLE =
  "Moldova postal code: 4 digits, optionally prefixed with MD- (e.g. MD-2001)";

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
