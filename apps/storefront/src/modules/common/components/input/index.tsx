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
          <span className="text-sm font-semibold tracking-wide text-muted-foreground">
            {topLabel}
          </span>
        )}
        <Label
          htmlFor={inputId}
          className="text-sm font-medium tracking-tight text-foreground"
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
              "mt-0 block h-12 w-full appearance-none rounded-md border border-input bg-background px-4 text-base text-foreground shadow-sm transition-[border-color,box-shadow,background-color,color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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
              className="absolute right-0 top-0 grid size-12 place-items-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
