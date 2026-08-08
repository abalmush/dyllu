import { forwardRef, useId, useImperativeHandle, useMemo, useRef } from "react";

import { Label } from "@lib/ui-compat";
import NativeSelect, {
  NativeSelectProps,
} from "@modules/common/components/native-select";
import { HttpTypes } from "@medusajs/types";

const CountrySelect = forwardRef<
  HTMLSelectElement,
  NativeSelectProps & {
    label?: string;
    region?: HttpTypes.StoreRegion;
  }
>(
  (
    {
      label = "Țară",
      placeholder = "Țară",
      region,
      defaultValue,
      id,
      required,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLSelectElement>(null);
    const generatedId = useId();
    const selectId = id ?? generatedId;

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    );

    const countryOptions = useMemo(() => {
      if (!region) {
        return [];
      }

      const regionNames = new Intl.DisplayNames(["ro"], { type: "region" });

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
    }, [region]);

    return (
      <div className="flex w-full flex-col gap-2">
        <Label
          htmlFor={selectId}
          className="text-foreground text-sm font-medium tracking-tight"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="text-destructive">
              {" "}
              *
            </span>
          )}
        </Label>
        <NativeSelect
          ref={innerRef}
          id={selectId}
          placeholder={placeholder}
          defaultValue={defaultValue}
          required={required}
          aria-label={label}
          {...props}
        >
          {countryOptions?.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>
    );
  }
);

CountrySelect.displayName = "CountrySelect";

export default CountrySelect;
