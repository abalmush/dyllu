"use client";

import React from "react";
import { HttpTypes } from "@medusajs/types";

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart;
  children: React.ReactNode;
};

// Pass-through wrapper. Was used to mount Stripe Elements; will host the MAIB
// payment context once the custom Medusa payment provider is implemented.
const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ children }) => {
  return <>{children}</>;
};

export default PaymentWrapper;
