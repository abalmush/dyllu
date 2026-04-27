"use client";

import React from "react";
import { HttpTypes } from "@medusajs/types";

type PaymentWrapperProps = {
  cart: HttpTypes.StoreCart;
  children: React.ReactNode;
};

const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ children }) => {
  return <>{children}</>;
};

export default PaymentWrapper;
