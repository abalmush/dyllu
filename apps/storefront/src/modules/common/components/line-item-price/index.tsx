import { getPercentageDiff } from "@lib/util/get-percentage-diff";
import { convertToLocale } from "@lib/util/money";
import { HttpTypes } from "@medusajs/types";
import { clx } from "@lib/ui-compat";

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem;
  style?: "default" | "tight";
  currencyCode: string;
};

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  const currentPrice = item.total ?? 0;
  const originalPrice = item.original_total ?? currentPrice;
  const hasReducedPrice = currentPrice < originalPrice;

  return (
    <div className="text-ui-fg-subtle flex flex-col items-end gap-x-2 whitespace-nowrap tabular-nums">
      <div className="text-right whitespace-nowrap">
        {hasReducedPrice && (
          <>
            <p className="whitespace-nowrap">
              {style === "default" && (
                <span className="text-ui-fg-subtle">Original: </span>
              )}
              <span
                className="text-ui-fg-muted line-through"
                data-testid="product-original-price"
              >
                {convertToLocale({
                  amount: originalPrice,
                  currency_code: currencyCode,
                })}
              </span>
            </p>
            {style === "default" && (
              <span className="text-ui-fg-interactive">
                -{getPercentageDiff(originalPrice, currentPrice || 0)}%
              </span>
            )}
          </>
        )}
        <span
          className={clx("text-base-regular whitespace-nowrap", {
            "text-ui-fg-interactive": hasReducedPrice,
          })}
          data-testid="product-price"
        >
          {convertToLocale({
            amount: currentPrice,
            currency_code: currencyCode,
          })}
        </span>
      </div>
    </div>
  );
};

export default LineItemPrice;
