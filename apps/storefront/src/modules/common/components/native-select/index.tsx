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
  errors?: Record<string, unknown>;
  touched?: Record<string, unknown>;
} & SelectHTMLAttributes<HTMLSelectElement>;

const NativeSelect = forwardRef<HTMLSelectElement, NativeSelectProps>(
  (
    { placeholder = "Select...", defaultValue, className, children, ...props },
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
          "relative flex h-12 items-center rounded-md border border-border bg-background shadow-sm transition-colors focus-within:border-foreground focus-within:ring-2 focus-within:ring-ring/20 focus-within:ring-offset-0",
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
          {...props}
          className="h-full w-full appearance-none border-none bg-transparent px-4 pr-12 text-sm outline-none transition-colors duration-150"
        >
          <option disabled value="">
            {placeholder}
          </option>
          {children}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
          <ChevronUpDown />
        </span>
      </div>
    );
  }
);

NativeSelect.displayName = "NativeSelect";

export default NativeSelect;
