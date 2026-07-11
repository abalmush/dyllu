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
  errors?: Record<string, unknown>;
  touched?: Record<string, unknown>;
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
          <Label className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {topLabel}
          </Label>
        )}
        <Label
          htmlFor={inputId}
          className="text-sm font-medium tracking-tight text-foreground"
        >
          {label}
          {required && <span className="text-rose-500">*</span>}
        </Label>
        <div className="relative z-0 flex w-full">
          <input
            id={inputId}
            type={inputType}
            name={name}
            placeholder={props.placeholder}
            required={required}
            className={cn(
              "mt-0 block h-12 w-full appearance-none rounded-md border border-border bg-background px-4 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:ring-offset-0",
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
              className="absolute right-0 top-3 px-4 text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground focus:text-foreground focus:outline-none"
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
