import { Radio as RadioGroupOption } from "@headlessui/react";
import { Text, clx } from "@lib/ui-compat";
import React, { type JSX } from "react";

import Radio from "@modules/common/components/radio";

import { isManual } from "@lib/constants";
import PaymentTest from "../payment-test";

type PaymentContainerProps = {
  paymentProviderId: string;
  selectedPaymentOptionId: string | null;
  disabled?: boolean;
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>;
  children?: React.ReactNode;
};

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "border-border bg-background hover:border-foreground/30 hover:bg-surface-subtle mb-4 flex cursor-pointer flex-col gap-y-4 rounded-2xl border px-6 py-4 transition-colors",
        {
          "border-foreground bg-surface-subtle ring-foreground/10 ring-1":
            selectedPaymentOptionId === paymentProviderId,
        }
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <Radio checked={selectedPaymentOptionId === paymentProviderId} />
          <Text className="text-foreground text-sm font-semibold tracking-tight">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="small:block hidden" />
          )}
        </div>
        <span className="bg-background text-foreground ring-border grid size-10 place-items-center rounded-md ring-1">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="text-2xs small:hidden" />
      )}
      {children}
    </RadioGroupOption>
  );
};

export default PaymentContainer;
