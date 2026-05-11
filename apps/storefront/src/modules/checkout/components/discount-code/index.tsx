"use client";

import * as React from "react";
import { Tag, X } from "lucide-react";
import { HttpTypes } from "@medusajs/types";

import { applyPromotions } from "@lib/data/cart";
import { convertToLocale } from "@lib/util/money";
import { Badge } from "@/components/atoms/badge";
import { Input } from "@/components/atoms/input";
import ErrorMessage from "../error-message";
import { SubmitButton } from "../submit-button";

type Props = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[];
  };
};

export default function DiscountCode({ cart }: Props) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const { promotions = [] } = cart;

  const removePromotionCode = async (code: string) => {
    const remaining = promotions
      .filter((p) => p.code !== code && p.code !== undefined)
      .map((p) => p.code!);
    await applyPromotions(remaining);
  };

  const addPromotionCode = async (formData: FormData) => {
    setErrorMessage("");
    const code = formData.get("code");
    if (!code) return;
    const input = document.getElementById("promotion-input") as HTMLInputElement | null;
    const codes = promotions.filter((p) => p.code !== undefined).map((p) => p.code!);
    codes.push(code.toString());
    try {
      await applyPromotions(codes);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Cod invalid");
    }
    if (input) input.value = "";
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        data-testid="add-discount-button"
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-foreground transition-colors hover:text-primary"
      >
        <Tag className="size-4 text-primary" />
        Ai un cod promoțional?
      </button>

      {isOpen && (
        <form action={(fd) => addPromotionCode(fd)} className="flex flex-col gap-2">
          <div className="flex w-full gap-2">
            <Input
              id="promotion-input"
              name="code"
              type="text"
              placeholder="Introdu codul"
              data-testid="discount-input"
              className="flex-1 rounded-full"
            />
            <SubmitButton
              variant="secondary"
              data-testid="discount-apply-button"
              className="rounded-full"
            >
              Aplică
            </SubmitButton>
          </div>
          <ErrorMessage error={errorMessage} data-testid="discount-error-message" />
        </form>
      )}

      {promotions.length > 0 && (
        <ul className="flex flex-col gap-2">
          {promotions.map((p) => {
            const value =
              p.application_method?.value !== undefined &&
              p.application_method.currency_code !== undefined
                ? p.application_method.type === "percentage"
                  ? `${p.application_method.value}%`
                  : convertToLocale({
                      amount: +p.application_method.value,
                      currency_code: p.application_method.currency_code,
                    })
                : null;
            return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-xs"
                data-testid="discount-row"
              >
                <span className="flex items-center gap-2">
                  <Badge variant="success" data-testid="discount-code">
                    {p.code}
                  </Badge>
                  {value && <span className="text-success">−{value}</span>}
                </span>
                {!p.is_automatic && (
                  <button
                    type="button"
                    onClick={() => p.code && removePromotionCode(p.code)}
                    data-testid="remove-discount-button"
                    aria-label="Șterge codul promoțional"
                    className="text-success/70 transition-colors hover:text-success"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
