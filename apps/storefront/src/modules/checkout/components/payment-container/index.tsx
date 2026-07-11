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
        "mb-3 flex cursor-pointer flex-col gap-y-3 rounded-2xl border border-border bg-background px-5 py-4 transition-colors hover:border-foreground/30 hover:bg-surface-subtle",
        {
          "border-foreground bg-surface-subtle ring-1 ring-foreground/10":
            selectedPaymentOptionId === paymentProviderId,
        }
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-4">
          <Radio checked={selectedPaymentOptionId === paymentProviderId} />
          <Text className="text-sm font-semibold tracking-tight text-foreground">
            {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
          </Text>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
        <span className="grid size-10 place-items-center rounded-md bg-background text-foreground ring-1 ring-border">
          {paymentInfoMap[paymentProviderId]?.icon}
        </span>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="text-[10px] small:hidden" />
      )}
      {children}
    </RadioGroupOption>
  );
};

export default PaymentContainer;
