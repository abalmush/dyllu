"use client";

import { isManual } from "@lib/constants";
import { placeOrder } from "@lib/data/cart";
import { HttpTypes } from "@medusajs/types";
import { Button } from "@lib/ui-compat";
import React, { useState } from "react";
import ErrorMessage from "../error-message";

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart;
  "data-testid": string;
};

const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  "data-testid": dataTestId,
}) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1;

  const paymentSession = cart.payment_collection?.payment_sessions?.find(
    (session) => session.status === "pending" && isManual(session.provider_id)
  );

  if (isManual(paymentSession?.provider_id)) {
    return (
      <ManualTestPaymentButton notReady={notReady} data-testid={dataTestId} />
    );
  }

  return (
    <Button disabled className="clip-corner-cut-sm rounded-none">
      Metoda de plată nu este disponibilă
    </Button>
  );
};

const ManualTestPaymentButton = ({ notReady }: { notReady: boolean }) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onPaymentCompleted = async () => {
    await placeOrder()
      .catch((err) => {
        setErrorMessage(err.message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const handlePayment = () => {
    setSubmitting(true);
    onPaymentCompleted();
  };

  return (
    <>
      <Button
        disabled={notReady}
        isLoading={submitting}
        onClick={handlePayment}
        size="large"
        className="clip-corner-cut-sm w-full rounded-none"
        data-testid="submit-order-button"
      >
        Plasează comanda
      </Button>
      <ErrorMessage
        error={errorMessage}
        data-testid="manual-payment-error-message"
      />
    </>
  );
};

export default PaymentButton;
