import { isEmpty } from "./isEmpty";

type ConvertToLocaleParams = {
  amount: number;
  currency_code: string;
  locale?: string;
};

export const convertToLocale = ({
  amount,
  currency_code,
  locale = "en-US",
}: ConvertToLocaleParams) => {
  const fractionDigits = Number.isInteger(amount) ? 0 : 2;

  return currency_code && !isEmpty(currency_code)
    ? new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency_code,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(amount)
    : amount.toString();
};
