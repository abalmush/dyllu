"use client";

import { IconBadge, clx } from "@lib/ui-compat";
import { useTranslations } from "next-intl";
import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import ChevronDown from "@modules/common/icons/chevron-down";

type NativeSelectProps = {
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">;

const CartItemSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ placeholder, className, children, ...props }, ref) => {
    const t = useTranslations("Cart");
    const resolvedPlaceholder = placeholder ?? t("quantitySelectPlaceholder");
    const innerRef = useRef<HTMLSelectElement>(null);
    const [isPlaceholder, setIsPlaceholder] = useState(false);

    useImperativeHandle<HTMLSelectElement | null, HTMLSelectElement | null>(
      ref,
      () => innerRef.current
    );

    useEffect(() => {
      if (innerRef.current && innerRef.current.value === "") {
        setIsPlaceholder(true);
      } else {
        setIsPlaceholder(false);
      }
    }, [innerRef.current?.value]);

    return (
      <div>
        <IconBadge
          onFocus={() => innerRef.current?.focus()}
          onBlur={() => innerRef.current?.blur()}
          className={clx(
            "group txt-compact-small text-ui-fg-base relative flex items-center border",
            className,
            {
              "text-ui-fg-subtle": isPlaceholder,
            }
          )}
        >
          <select
            ref={innerRef}
            aria-label={props["aria-label"] ?? t("quantityLabel")}
            {...props}
            className="h-16 w-16 appearance-none items-center justify-center border-none bg-transparent px-4 outline-hidden transition-colors duration-150 focus:border-gray-700"
          >
            <option disabled value="">
              {resolvedPlaceholder}
            </option>
            {children}
          </select>
          <span className="pointer-events-none absolute flex w-8 justify-end group-hover:animate-pulse">
            <ChevronDown />
          </span>
        </IconBadge>
      </div>
    );
  }
);

CartItemSelect.displayName = "CartItemSelect";

export default CartItemSelect;
