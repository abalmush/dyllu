import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";

import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select";
import { HttpTypes } from "@medusajs/types";

const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    region?: HttpTypes.StoreRegion;
  }
>(({ placeholder, region, defaultValue, ...props }, ref) => {
  const locale = useLocale();
  const t = useTranslations("Checkout");
  const innerRef = useRef<HTMLSelectElement>(null);

  useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
    ref,
    () => innerRef.current
  );

  const countryOptions = useMemo(() => {
    if (!region) {
      return [];
    }

    const regionNames = new Intl.DisplayNames([locale], { type: "region" });

    return region.countries?.flatMap((country) => {
      const value = country.iso_2;
      if (!value) {
        return [];
      }

      return [
        {
          value,
          label: regionNames.of(value.toUpperCase()) ?? country.display_name,
        },
      ];
    });
  }, [region, locale]);

  return (
    <NativeSelect
      ref={innerRef}
      placeholder={placeholder ?? t("country")}
      defaultValue={defaultValue}
      {...props}
    >
      {countryOptions?.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </NativeSelect>
  );
});

CountrySelect.displayName = "CountrySelect";

export default CountrySelect;
