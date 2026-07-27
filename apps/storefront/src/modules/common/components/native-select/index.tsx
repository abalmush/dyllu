import { ChevronUpDown } from "@medusajs/icons";
import { clx } from "@lib/ui-compat";
import {
  SelectHTMLAttributes,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type NativeSelectProps = {
  placeholder?: string;
} & SelectHTMLAttributes<HTMLSelectElement>;

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    {
      placeholder = "Selectează…",
      defaultValue,
      className,
      children,
      ...props
    },
    ref
  ) => {
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
      <div
        onFocus={() => innerRef.current?.focus()}
        onBlur={() => innerRef.current?.blur()}
        className={clx(
          "border-border bg-background focus-within:border-foreground focus-within:ring-ring/20 relative flex h-12 items-center rounded-md border shadow-xs transition-colors focus-within:ring-2 focus-within:ring-offset-0",
          className,
          {
            "text-muted-foreground": isPlaceholder,
            "text-foreground": !isPlaceholder,
          }
        )}
      >
        <select
          ref={innerRef}
          defaultValue={defaultValue}
          aria-label={
            props["aria-label"] ??
            (props.name === "country_code" ? "Țară" : "Selectează o opțiune")
          }
          {...props}
          className="h-full w-full appearance-none border-none bg-transparent px-4 pr-12 text-base outline-hidden transition-colors duration-150"
        >
          <option disabled value="">
            {placeholder}
          </option>
          {children}
        </select>
        <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-4 flex items-center">
          <ChevronUpDown />
        </span>
      </div>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export default NativeSelect;
