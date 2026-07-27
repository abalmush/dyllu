import { Label } from "@lib/ui-compat";
import { cn } from "@lib/utils";
import React, { useEffect, useImperativeHandle, useState } from "react";

import Eye from "@modules/common/icons/eye";
import EyeOff from "@modules/common/icons/eye-off";

type InputProps = Omit<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
  "placeholder"
> & {
  label: string;
  placeholder?: string;
  name: string;
  topLabel?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ type, name, label, required, topLabel, className, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [inputType, setInputType] = useState(type);
    const inputId = id ?? name;

    useEffect(() => {
      if (type === "password" && showPassword) {
        setInputType("text");
      }

      if (type === "password" && !showPassword) {
        setInputType("password");
      }
    }, [type, showPassword]);

    useImperativeHandle(ref, () => inputRef.current!);

    return (
      <div className="flex w-full flex-col gap-2">
        {topLabel && (
          <span className="text-muted-foreground text-sm font-semibold tracking-wide">
            {topLabel}
          </span>
        )}
        <Label
          htmlFor={inputId}
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
        <div className="relative z-0 flex w-full">
          <input
            id={inputId}
            type={inputType}
            name={name}
            placeholder={props.placeholder}
            required={required}
            className={cn(
              "border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring mt-0 block h-12 w-full appearance-none rounded-md border px-4 text-base shadow-xs transition-[border-color,box-shadow,background-color,color] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
              type === "password" && "pr-12",
              className
            )}
            {...props}
            ref={inputRef}
          />
          {type === "password" && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ascunde parola" : "Afișează parola"}
              aria-pressed={showPassword}
              className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring absolute top-0 right-0 grid size-12 place-items-center rounded-md transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-hidden"
            >
              {showPassword ? <Eye /> : <EyeOff />}
            </button>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
